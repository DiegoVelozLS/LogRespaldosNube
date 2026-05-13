import React, { useState, useEffect } from 'react';
import { VaultCategory, VaultFieldSchema, User, UserRole, ROLE_LABELS } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import { supabase } from '../services/supabaseClient';

interface VaultConfigurationProps {
  users: User[];
}

const VaultConfiguration: React.FC<VaultConfigurationProps> = ({ users }) => {
  const [categories, setCategories] = useState<VaultCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<VaultCategory | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('key');
  const [fields, setFields] = useState<VaultFieldSchema[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    // Fetch directly from table since this is admin
    const { data, error } = await supabase
      .from('vault_categories')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (data) setCategories(data as any);
    setLoading(false);
  };

  const openForm = async (cat?: VaultCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setName(cat.name);
      setIcon(cat.icon || 'key');
      setFields(cat.fields_schema || []);
      
      // Load current policies
      const { data: policies } = await supabase
        .from('vault_access_policies')
        .select('*')
        .eq('vault_category_id', cat.id);
      
      if (policies) {
        const pols = policies as any[];
        setSelectedRoles(pols.filter(p => p.target_type === 'ROLE').map(p => p.target_role));
        setSelectedUsers(pols.filter(p => p.target_type === 'USER').map(p => p.target_user_id));
      } else {
        setSelectedRoles([]);
        setSelectedUsers([]);
      }
    } else {
      setEditingCategory(null);
      setName('');
      setIcon('key');
      setFields([]);
      setSelectedRoles([]);
      setSelectedUsers([]);
    }
    setShowForm(true);
  };

  const addField = () => {
    setFields([...fields, { name: '', label: '', required: false }]);
  };

  const updateField = (index: number, updates: Partial<VaultFieldSchema>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updates };
    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let catId = editingCategory?.id;

      if (editingCategory) {
        // Update category
        const { error } = await (supabase as any)
          .from('vault_categories')
          .update({ name, icon, fields_schema: fields })
          .eq('id', catId);
        if (error) throw error;
      } else {
        // Create category
        const { data, error } = await (supabase as any)
          .from('vault_categories' as any)
          .insert({ name, icon, fields_schema: fields })
          .select()
          .single();
        if (error) throw error;
        catId = (data as any).id;
      }

      // Update Policies: Delete old ones and insert new ones
      if (!catId) {
        throw new Error('No se pudo obtener el ID de la mini-boveda.');
      }

      const { error: deletePoliciesError } = await (supabase as any)
        .from('vault_access_policies')
        .delete()
        .eq('vault_category_id', catId);

      if (deletePoliciesError) throw deletePoliciesError;
      
      const newPolicies = [
        ...selectedRoles.map(role => ({
          vault_category_id: catId,
          target_type: 'ROLE',
          target_role: role
        })),
        ...selectedUsers.map(userId => ({
          vault_category_id: catId,
          target_type: 'USER',
          target_user_id: userId
        }))
      ];

      if (newPolicies.length > 0) {
        const { error: pError } = await (supabase as any)
          .from('vault_access_policies')
          .insert(newPolicies);
        if (pError) throw pError;
      }

      setShowForm(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      alert(`Error al guardar la configuracion: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta bóveda? Se borrarán TODAS las credenciales dentro de ella.')) return;
    
    setLoading(true);
    await supabase.from('vault_categories').delete().eq('id', id);
    loadCategories();
  };

  if (loading && categories.length === 0) {
    return <div className="p-12 text-center text-slate-400">Cargando configuración...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Mini-Bóvedas Configuradas</h3>
            <p className="text-sm text-slate-500">Gestiona las categorías y accesos del gestor de claves</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => openForm()}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-sm hover:bg-slate-800 transition"
          >
            + Nueva Bóveda
          </button>
        )}
      </div>

      {showForm ? (
        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 animate-fadeIn">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Información Básica</h4>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nombre de la Bóveda</label>
                  <input 
                    value={name} 
                    onChange={e => setName(e.target.value)}
                    placeholder="Ej. Bóveda de Servidores"
                    required
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Icono</label>
                  <select 
                    value={icon} 
                    onChange={e => setIcon(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="key">🔑 Llave</option>
                    <option value="database">🗄️ Base de Datos</option>
                    <option value="server">🖥️ Servidor</option>
                    <option value="cloud">☁️ Nube</option>
                    <option value="lock">🔒 Candado</option>
                    <option value="shield">🛡️ Escudo</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Permisos de Acceso</h4>
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 italic bg-blue-50 p-2 rounded border border-blue-100">
                    * Los Administradores tienen acceso total por defecto.
                  </p>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Por Roles</label>
                    <div className="flex flex-wrap gap-2">
                      {['TECH', 'SOPORTE'].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setSelectedRoles(prev => 
                              prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                            selectedRoles.includes(role) 
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                              : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                          }`}
                        >
                          {ROLE_LABELS[role as UserRole]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Usuarios Específicos</label>
                    <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-white space-y-1">
                      {users.filter(u => u.role !== 'ADMIN').map(u => (
                        <label key={u.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={selectedUsers.includes(u.id)}
                            onChange={() => {
                              setSelectedUsers(prev => 
                                prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id]
                              );
                            }}
                          />
                          <span className="text-xs text-slate-700">{u.name} {u.lastName}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-slate-700 uppercase text-xs tracking-wider">Esquema de Campos Personalizados</h4>
                <button 
                  type="button" 
                  onClick={addField}
                  className="text-blue-600 text-xs font-bold hover:underline"
                >
                  + Agregar Campo
                </button>
              </div>
              
              <div className="space-y-2">
                {fields.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No hay campos personalizados definidos. Solo se guardará Título, Usuario y Contraseña.</p>
                ) : (
                  fields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex-1">
                        <input 
                          placeholder="ID del campo (ej. ip_address)"
                          value={field.name}
                          onChange={e => updateField(idx, { name: e.target.value })}
                          className="w-full p-1.5 text-xs border-b border-slate-200 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          placeholder="Etiqueta visual (ej. Dirección IP)"
                          value={field.label}
                          onChange={e => updateField(idx, { label: e.target.value })}
                          className="w-full p-1.5 text-xs border-b border-slate-200 focus:border-blue-500 outline-none"
                        />
                      </div>
                      <label className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                        <input 
                          type="checkbox"
                          checked={field.required}
                          onChange={e => updateField(idx, { required: e.target.checked })}
                        />
                        Oblig.
                      </label>
                      <button 
                        type="button" 
                        onClick={() => removeField(idx)}
                        className="text-red-400 hover:text-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-6 border-t border-slate-200">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 border-2 border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition disabled:opacity-50"
              >
                {loading ? 'Guardando...' : editingCategory ? 'Actualizar Bóveda' : 'Crear Bóveda'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                  {cat.icon === 'database' && '🗄️'}
                  {cat.icon === 'server' && '🖥️'}
                  {cat.icon === 'cloud' && '☁️'}
                  {cat.icon === 'key' && '🔑'}
                  {cat.icon === 'lock' && '🔒'}
                  {cat.icon === 'shield' && '🛡️'}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => openForm(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <h4 className="font-bold text-slate-800 text-lg">{cat.name}</h4>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
                {cat.fields_schema?.length || 0} Campos Personalizados
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VaultConfiguration;
