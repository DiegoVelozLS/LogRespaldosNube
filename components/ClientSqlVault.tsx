import React, { useEffect, useMemo, useState } from 'react';
import { ClientSqlCredential, ClientSqlCredentialInput, User, UserRole } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import VaultPinModal from './VaultPinModal';

interface ClientSqlVaultProps {
  user: User;
}

const INITIAL_FORM: ClientSqlCredentialInput = {
  companyName: '',
  sqlUsername: '',
  sqlPassword: '',
  databaseName: '',
  ownerCompany: '',
  notes: '',
};

const ClientSqlVault: React.FC<ClientSqlVaultProps> = ({ user }) => {
  const isAdmin = user.role === UserRole.ADMIN;
  const isTech = user.role === UserRole.TECH;
  const isSoporte = user.role === UserRole.SOPORTE;

  const canAccess = isAdmin || isTech || isSoporte;
  const canWrite = isAdmin || isTech || isSoporte;
  const canDelete = isAdmin;

  const [credentials, setCredentials] = useState<ClientSqlCredential[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ClientSqlCredential | null>(null);
  const [formData, setFormData] = useState<ClientSqlCredentialInput>(INITIAL_FORM);

  const [selected, setSelected] = useState<ClientSqlCredential | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealingPassword, setRevealingPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Nuevo estado para el bloqueo por PIN
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    // Verificar si ya se desbloqueó hoy
    const lastUnlock = localStorage.getItem(`vault_unlocked_${user.id}`);
    const today = new Date().toISOString().split('T')[0];
    
    if (lastUnlock === today) {
      setIsUnlocked(true);
    }
  }, [user.id]);

  // Reset password state when selecting a different record or closing
  useEffect(() => {
    setRevealedPassword(null);
    setCopiedPassword(false);
  }, [selected]);

  useEffect(() => {
    if (!canAccess || !isUnlocked) {
      setLoading(false);
      return;
    }
    loadData();
  }, [canAccess, isUnlocked]);

  const loadData = async () => {
    setLoading(true);
    const credentialsData = await supabaseDataService.getClientSqlCredentials();
    setCredentials(credentialsData);
    setLoading(false);
  };

  const filteredCredentials = useMemo(() => {
    return credentials.filter(c => {
      const matchSearch =
        c.companyName.toLowerCase().includes(search.toLowerCase()) ||
        c.dbName.toLowerCase().includes(search.toLowerCase()) ||
        c.sqlUsername.toLowerCase().includes(search.toLowerCase()) ||
        (c.ownerCompany || '').toLowerCase().includes(search.toLowerCase());
      return matchSearch;
    });
  }, [credentials, search]);

  const openNewForm = () => {
    setEditing(null);
    setFormData(INITIAL_FORM);
    setShowForm(true);
  };

  const openEditForm = (row: ClientSqlCredential) => {
    setEditing(row);
    setFormData({
      companyName: row.companyName,
      sqlUsername: row.sqlUsername,
      sqlPassword: '',
      databaseName: row.dbName,
      ownerCompany: row.ownerCompany || '',
      notes: row.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
    setFormData(INITIAL_FORM);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canWrite) {
      alert('No tienes permisos para crear o editar credenciales.');
      return;
    }

    if (!formData.companyName.trim()) {
      alert('Debes ingresar el nombre de la empresa.');
      return;
    }

    if (!editing && !formData.sqlPassword) {
      alert('La contrasena SQL es obligatoria para un nuevo registro.');
      return;
    }

    const result = await supabaseDataService.upsertClientSqlCredential({
      ...formData,
      id: editing?.id
    });
    if (!result.success) {
      alert(`No se pudo guardar la credencial SQL.\n\nDetalle: ${result.error || 'Sin detalle adicional.'}`);
      return;
    }

    closeForm();
    await loadData();
  };

  const handleDelete = async (row: ClientSqlCredential) => {
    if (!canDelete) {
      alert('Solo ADMIN puede eliminar credenciales.');
      return;
    }

    if (!confirm(`Eliminar credencial SQL de ${row.companyName}?`)) return;
      const result = await supabaseDataService.deleteClientSqlCredential(row.id);
      if (!result.success) {
        alert(result.error || 'No se pudo eliminar la credencial.');
      return;
    }
    setSelected(null);
    await loadData();
  };

  const handleRevealPassword = async (row: ClientSqlCredential) => {
    setRevealingPassword(true);
    const plain = await supabaseDataService.revealClientSqlPassword(row.id);
    setRevealedPassword(plain);
    setCopiedPassword(false);
    setRevealingPassword(false);
    if (!plain) alert('No se pudo revelar la contrasena. Verifica permisos y configuracion de llave.');
  };

  const handleCopyPassword = async () => {
    if (!revealedPassword) {
      alert('Primero debes revelar la contrasena.');
      return;
    }

    try {
      await navigator.clipboard.writeText(revealedPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 1500);
    } catch {
      alert('No se pudo copiar la contrasena en este navegador.');
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800">Boveda SQL de Clientes</h2>
        <p className="text-slate-500 mt-2">No tienes permisos para acceder a este modulo.</p>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="relative min-h-[700px] w-full flex items-center justify-center bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner">
        <VaultPinModal user={user} onUnlock={() => setIsUnlocked(true)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Boveda SQL de Clientes</h2>
          <p className="text-slate-500 text-sm mt-1">Credenciales SQL por cliente con acceso auditado.</p>
        </div>
        {canWrite && (
          <button
            onClick={openNewForm}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Credencial SQL
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="grid grid-cols-1 gap-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar empresa, servidor, usuario SQL, empresa dueña..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 outline-none text-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Empresa', 'Empresa Dueña', 'Servidor', 'Usuario SQL', 'Actualizado'].map(h => (
                  <th key={h} className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">Cargando credenciales...</td>
                </tr>
              ) : filteredCredentials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">No hay credenciales para mostrar.</td>
                </tr>
              ) : filteredCredentials.map(row => (
                <tr key={row.id} onClick={() => setSelected(row)} className="hover:bg-slate-50 transition cursor-pointer">
                  <td className="px-5 py-4 font-semibold text-slate-800">{row.companyName}</td>
                  <td className="px-5 py-4 text-slate-600">{row.ownerCompany || '-'}</td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-600">{row.dbName}</td>
                  <td className="px-5 py-4 text-slate-700">{row.sqlUsername}</td>
                  <td className="px-5 py-4 text-slate-500 text-xs">{new Date(row.updatedAt).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeForm}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">{editing ? 'Editar Credencial SQL' : 'Nueva Credencial SQL'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Empresa</label>
                  <input
                    required
                    value={formData.companyName}
                    onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Escribe el nombre de la empresa"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Empresa Dueña</label>
                  <input
                    value={formData.ownerCompany || ''}
                    onChange={e => setFormData(prev => ({ ...prev, ownerCompany: e.target.value }))}
                    placeholder="Empresa dueña del sistema"
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Usuario SQL</label>
                  <input
                    required
                    value={formData.sqlUsername}
                    onChange={e => setFormData(prev => ({ ...prev, sqlUsername: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Contrasena SQL {editing ? '(solo si deseas cambiarla)' : ''}</label>
                  <input
                    type="password"
                    value={formData.sqlPassword || ''}
                    onChange={e => setFormData(prev => ({ ...prev, sqlPassword: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700">Servidor</label>
                  <input
                    required
                    value={formData.databaseName}
                    onChange={e => setFormData(prev => ({ ...prev, databaseName: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700">Notas</label>
                  <textarea
                    rows={1}
                    value={formData.notes || ''}
                    onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={closeForm} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{selected.companyName}</h3>
                <p className="text-xs text-slate-500 font-mono">{selected.dbName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Usuario SQL</p>
                  <p className="font-semibold text-slate-800">{selected.sqlUsername}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Servidor</p>
                  <p className="font-semibold text-slate-800">{selected.dbName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Empresa Dueña</p>
                  <p className="font-semibold text-slate-800">{selected.ownerCompany || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Actualizado</p>
                  <p className="font-semibold text-slate-800">{new Date(selected.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-800">Contrasena SQL</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="relative flex-1">
                    <input
                      readOnly
                      value={revealedPassword || '********'}
                      className="w-full px-3 py-2 pr-20 bg-white border border-amber-200 rounded-lg font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-bold rounded bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      {copiedPassword ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                  <button
                    onClick={() => handleRevealPassword(selected)}
                    disabled={revealingPassword}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                  >
                    {revealingPassword ? 'Revelando...' : 'Revelar'}
                  </button>
                </div>
              </div>

              {selected.notes && (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Notas</p>
                  <p className="text-slate-700 text-sm italic">"{selected.notes}"</p>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Ultimo acceso: {selected.lastAccessedAt ? new Date(selected.lastAccessedAt).toLocaleString('es-ES') : 'Sin registros'}
              </p>
            </div>

            {(canWrite || canDelete) && (
              <div className="px-6 pb-6 flex gap-3">
                {canWrite && (
                  <button
                    onClick={() => {
                      setSelected(null);
                      setRevealedPassword(null);
                      openEditForm(selected);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700"
                  >
                    Editar
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => handleDelete(selected)}
                    className="flex-1 bg-red-50 text-red-700 py-2.5 rounded-xl font-bold hover:bg-red-100 border border-red-200"
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

export default ClientSqlVault;
