import React, { useEffect, useMemo, useState } from 'react';
import { User, UserRole, VaultCategory, VaultCredential, VaultCredentialInput, VaultFieldSchema } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import { supabase } from '../services/supabaseClient';
import VaultPinModal from './VaultPinModal';

interface PasswordManagerProps {
  user: User;
}

const PasswordManager: React.FC<PasswordManagerProps> = ({ user }) => {
  // Roles
  const isAdmin = user.role === UserRole.ADMIN;
  const isTech = user.role === UserRole.TECH;
  const isSoporte = user.role === UserRole.SOPORTE;
  const canAccess = isAdmin || isTech || isSoporte;
  const canWrite = isAdmin || isTech || isSoporte;
  const canDelete = isAdmin;

  // States
  const [categories, setCategories] = useState<VaultCategory[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [search, setSearch] = useState('');

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VaultCredential | null>(null);
  const [formData, setFormData] = useState<VaultCredentialInput>({
    vaultCategoryId: '',
    title: '',
    username: '',
    password: '',
    metadata: {},
    notes: ''
  });

  // Actions
  const [selected, setSelected] = useState<VaultCredential | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealingPassword, setRevealingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Security
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [securityNotice, setSecurityNotice] = useState<string | null>(null);

  const lockVaultForPinReset = () => {
    localStorage.removeItem(`vault_unlocked_${user.id}`);
    setIsUnlocked(false);
    setSelected(null);
    setRevealedPassword(null);
    setCopiedPassword(false);
    setShowForm(false);
    setEditing(null);
    setSecurityNotice('Tu PIN fue reseteado por un administrador. Debes crear un nuevo PIN para continuar.');
  };

  useEffect(() => {
    const lastUnlock = localStorage.getItem(`vault_unlocked_${user.id}`);
    const today = new Date().toISOString().split('T')[0];
    if (lastUnlock === today) {
      setIsUnlocked(true);
    }
  }, [user.id]);

  useEffect(() => {
    setRevealedPassword(null);
    setCopiedPassword(false);
  }, [selected]);

  useEffect(() => {
    if (!canAccess || !isUnlocked) {
      setLoading(false);
      return;
    }
    loadCategories();
  }, [canAccess, isUnlocked]);

  useEffect(() => {
    if (activeCategoryId && isUnlocked) {
      loadCredentials(activeCategoryId);
    }
  }, [activeCategoryId, isUnlocked]);

  useEffect(() => {
    if (!isUnlocked) return;

    let disposed = false;

    const validateCurrentPinStatus = async () => {
      const stillHasPin = await supabaseDataService.checkHasPin();
      if (!disposed && !stillHasPin) {
        lockVaultForPinReset();
      }
    };

    void validateCurrentPinStatus();

    const intervalId = window.setInterval(() => {
      void validateCurrentPinStatus();
    }, 5000);

    const onFocus = () => {
      void validateCurrentPinStatus();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    const channel = supabase
      .channel(`vault-pin-watch-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`
        },
        (payload: any) => {
          if (payload?.new?.vault_pin == null || payload?.new?.vault_pin === '') {
            lockVaultForPinReset();
          }
        }
      )
      .subscribe();

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      supabase.removeChannel(channel);
    };
  }, [isUnlocked, user.id]);

  const loadCategories = async () => {
    setLoading(true);
    const cats = await supabaseDataService.getAuthorizedVaultCategories();
    setCategories(cats);
    if (cats.length > 0 && !activeCategoryId) {
      setActiveCategoryId(cats[0].id);
    }
    setLoading(false);
  };

  const loadCredentials = async (categoryId: string) => {
    setLoadingCredentials(true);
    const creds = await supabaseDataService.getVaultCredentials(categoryId);
    setCredentials(creds);
    setLoadingCredentials(false);
  };

  const activeCategory = categories.find(c => c.id === activeCategoryId);
  const fields = activeCategory?.fields_schema || [];

  const filteredCredentials = useMemo(() => {
    return credentials.filter(c => {
      const q = search.toLowerCase();
      if (c.title.toLowerCase().includes(q)) return true;
      if (c.username.toLowerCase().includes(q)) return true;
      
      // Search in metadata dynamically
      for (const key in c.metadata) {
        if (String(c.metadata[key] || '').toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [credentials, search]);

  const openNewForm = () => {
    if (!activeCategoryId) return;
    setEditing(null);
    
    // Initialize empty metadata fields based on schema
    const initialMeta: Record<string, string> = {};
    fields.forEach(f => { initialMeta[f.name] = ''; });

    setFormData({
      vaultCategoryId: activeCategoryId,
      title: '',
      username: '',
      password: '',
      metadata: initialMeta,
      notes: ''
    });
    setShowForm(true);
  };

  const openEditForm = (row: VaultCredential) => {
    setEditing(row);
    setFormData({
      vaultCategoryId: row.vaultCategoryId,
      title: row.title,
      username: row.username,
      password: '', // Emtpy so we don't accidentally save clear text unless changing
      metadata: { ...row.metadata },
      notes: row.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleMetaChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [name]: value
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canWrite) {
      alert('No tienes permisos para crear o editar credenciales.');
      return;
    }

    if (!formData.title.trim()) {
      alert('Debes ingresar un título.');
      return;
    }

    if (!editing && !formData.password) {
      alert('La contraseña es obligatoria para un nuevo registro.');
      return;
    }

    const result = await supabaseDataService.upsertVaultCredential({
      ...formData,
      id: editing?.id
    });
    
    if (!result.success) {
      alert(`No se pudo guardar la credencial.\n\nDetalle: ${result.error || 'Error desconocido.'}`);
      return;
    }

    closeForm();
    if (activeCategoryId) {
      await loadCredentials(activeCategoryId);
    }
  };

  const handleDelete = async (row: VaultCredential) => {
    if (!canDelete) {
      alert('Solo ADMIN puede eliminar credenciales.');
      return;
    }

    if (!confirm(`¿Eliminar credencial: ${row.title}?`)) return;
    const result = await supabaseDataService.deleteVaultCredential(row.id);
    if (!result.success) {
      alert(result.error || 'No se pudo eliminar la credencial.');
      return;
    }
    setSelected(null);
    if (activeCategoryId) {
      await loadCredentials(activeCategoryId);
    }
  };

  const handleRevealPassword = async (row: VaultCredential) => {
    setRevealingPassword(true);
    const plain = await supabaseDataService.revealVaultPassword(row.id);
    setRevealedPassword(plain);
    setCopiedPassword(false);
    setRevealingPassword(false);
    if (!plain) alert('No se pudo revelar la contraseña. Verifica permisos y configuración de llave.');
  };

  const handleCopyPassword = async () => {
    if (!revealedPassword) {
      alert('Primero debes revelar la contraseña.');
      return;
    }

    try {
      await navigator.clipboard.writeText(revealedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 1500);
    } catch {
      alert('No se pudo copiar la contraseña en este navegador.');
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Gestor de Claves</h2>
        <p className="text-slate-500 mt-2">No tienes permisos para acceder a este módulo.</p>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="relative min-h-[700px] w-full flex items-center justify-center bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner">
        {securityNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm font-medium">
            {securityNotice}
          </div>
        )}
        <VaultPinModal user={user} onUnlock={() => { setSecurityNotice(null); setIsUnlocked(true); }} />
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-400">Cargando bóvedas...</div>;
  }

  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-800">Gestor de Claves</h2>
        <p className="text-slate-500 mt-2">No tienes acceso a ninguna bóveda. Pide al administrador que te asigne permisos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h2 className="text-3xl font-bold text-slate-800">Gestor de Claves</h2>
          <p className="text-slate-500 text-sm mt-1">Almacenamiento seguro y modular.</p>
        </div>
      </div>

      {/* Tabs de Bóvedas */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin scrollbar-thumb-slate-300">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategoryId(cat.id)}
            className={`px-5 py-3 rounded-xl font-medium transition whitespace-nowrap flex items-center gap-2 ${
              activeCategoryId === cat.id 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="text-lg">
              {cat.icon === 'database' && '🗄️'}
              {cat.icon === 'server' && '🖥️'}
              {cat.icon === 'cloud' && '☁️'}
              {cat.icon === 'key' && '🔑'}
              {!['database', 'server', 'cloud', 'key'].includes(cat.icon) && '📁'}
            </span>
            {cat.name}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col sm:flex-row gap-4 justify-between items-center">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar título, usuario, o datos específicos..."
          className="w-full max-w-md px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none text-sm"
        />
        {canWrite && activeCategory && (
          <button
            onClick={openNewForm}
            className="flex-shrink-0 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar a {activeCategory.name}
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Título</th>
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Usuario</th>
                {/* Dynamically render headers based on schema */}
                {fields.slice(0, 3).map(f => (
                  <th key={f.name} className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{f.label}</th>
                ))}
                <th className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Actualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingCredentials ? (
                <tr>
                  <td colSpan={fields.length + 3} className="text-center py-16 text-slate-400">Cargando credenciales...</td>
                </tr>
              ) : filteredCredentials.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + 3} className="text-center py-16 text-slate-400">No hay credenciales para mostrar en esta bóveda.</td>
                </tr>
              ) : filteredCredentials.map(row => (
                <tr key={row.id} onClick={() => setSelected(row)} className="hover:bg-slate-50 transition cursor-pointer">
                  <td className="px-5 py-4 font-semibold text-slate-800">{row.title}</td>
                  <td className="px-5 py-4 text-slate-700">{row.username || '-'}</td>
                  
                  {fields.slice(0, 3).map(f => (
                    <td key={f.name} className="px-5 py-4 text-slate-600 truncate max-w-[150px]">
                      {row.metadata[f.name] || '-'}
                    </td>
                  ))}
                  
                  <td className="px-5 py-4 text-slate-500 text-xs">{new Date(row.updatedAt).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DYNAMIC FORM MODAL */}
      {showForm && activeCategory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex-shrink-0">
              <h3 className="text-lg font-bold text-slate-800">{editing ? `Editar en ${activeCategory.name}` : `Nuevo en ${activeCategory.name}`}</h3>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form id="vault-form" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Título Identificativo</label>
                    <input
                      required
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ej. Servidor Prod XYZ"
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-slate-700">Nombre de Usuario</label>
                    <input
                      required
                      value={formData.username}
                      onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Contraseña {editing ? '(solo si deseas cambiarla)' : ''}</label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                {fields.length > 0 && (
                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Campos Específicos</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {fields.map(f => (
                        <div key={f.name}>
                          <label className="text-sm font-semibold text-slate-700">
                            {f.label} {f.required && <span className="text-red-500">*</span>}
                          </label>
                          <input
                            required={f.required}
                            value={formData.metadata[f.name] || ''}
                            onChange={e => handleMetaChange(f.name, e.target.value)}
                            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-slate-100">
                  <label className="text-sm font-semibold text-slate-700">Notas Adicionales</label>
                  <textarea
                    rows={2}
                    value={formData.notes || ''}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 flex-shrink-0">
              <button type="button" onClick={closeForm} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition">Cancelar</button>
              <button type="submit" form="vault-form" className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition">Guardar Credencial</button>
            </div>
          </div>
        </div>
      )}

      {/* DETAILS VIEW MODAL */}
      {selected && activeCategory && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selected.title}</h3>
                <p className="text-xs text-slate-500 font-medium">{activeCategory.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usuario</p>
                  <p className="font-semibold text-slate-800 mt-1">{selected.username || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actualizado</p>
                  <p className="font-semibold text-slate-800 mt-1">{new Date(selected.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              {fields.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Campos Específicos</p>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {fields.map(f => (
                      <div key={f.name}>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{f.label}</p>
                        <p className="font-medium text-slate-800 mt-1">{selected.metadata[f.name] || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">Contraseña de Acceso</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex-1">
                    <input
                      readOnly
                      value={revealedPassword || '********'}
                      className="w-full px-3 py-2 pr-20 bg-white border border-amber-200 rounded-lg font-mono text-sm shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      {copiedPassword ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <button
                    onClick={() => handleRevealPassword(selected)}
                    disabled={revealingPassword}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 transition shadow-sm"
                  >
                    {revealingPassword ? '...' : 'Revelar'}
                  </button>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Notas</p>
                  <p className="text-slate-700 text-sm italic bg-slate-50 p-3 rounded-xl border border-slate-100">"{selected.notes}"</p>
                </div>
              )}

              <p className="text-xs text-slate-500 text-center pt-2">
                Último acceso: {selected.lastAccessedAt ? new Date(selected.lastAccessedAt).toLocaleString('es-ES') : 'Sin registros'}
              </p>
            </div>

            {(canWrite || canDelete) && (
              <div className="px-6 py-4 flex gap-3 border-t border-slate-100 bg-slate-50">
                {canWrite && (
                  <button
                    onClick={() => {
                      setSelected(null);
                      setRevealedPassword(null);
                      openEditForm(selected);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-sm"
                  >
                    Editar
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(selected)}
                    className="flex-1 bg-white text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-50 border border-red-200 transition shadow-sm"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordManager;
