import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
  vpnService,
  VpnCompany,
  VpnPeer,
  GeneratedPeerResult,
  buildServerPeerConfig,
} from '../services/vpnService';

interface VpnManagementProps {
  user?: User | null;
}

// --- Icons ---
const SearchIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const ServerIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const VpnManagement: React.FC<VpnManagementProps> = ({ user }) => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [companies, setCompanies] = useState<VpnCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<VpnCompany | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isNewPeerModalOpen, setIsNewPeerModalOpen] = useState(false);
  const [selectedPeerForConfig, setSelectedPeerForConfig] = useState<VpnPeer | null>(null);

  // New Peer Creation State
  const [newPeerResult, setNewPeerResult] = useState<GeneratedPeerResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isAdminOrTech = user?.role === UserRole.ADMIN || user?.role === UserRole.TECH;

  // Cargar empresas al montar el componente
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await vpnService.getCompanies();
      setCompanies(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar las empresas de VPN');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (companyId: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await vpnService.getCompanyWithPeers(companyId);
      if (res) {
        setSelectedCompany(res.company);
        setView('detail');
        setNewPeerResult(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al obtener los detalles de la empresa');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedCompany(null);
    setNewPeerResult(null);
    loadCompanies();
  };

  const handleCreateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const groupName = formData.get('groupName') as string;
    const status = formData.get('status') as 'Activo' | 'Inactivo';
    const manualNumStr = formData.get('manualNumber') as string;
    const manualCompanyNumber = manualNumStr ? parseInt(manualNumStr, 10) : undefined;

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await vpnService.createCompany({
        name,
        groupName,
        status,
        manualCompanyNumber: manualCompanyNumber && manualCompanyNumber > 0 ? manualCompanyNumber : undefined,
      });

      setIsNewCompanyModalOpen(false);
      await loadCompanies();
    } catch (err: any) {
      alert(`Error al crear empresa: ${err.message || 'Ocurrió un error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateCompany = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCompany) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const groupName = formData.get('groupName') as string;
    const status = formData.get('status') as 'Activo' | 'Inactivo' | 'Mantenimiento';

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await vpnService.updateCompany({
        id: selectedCompany.id,
        name,
        groupName,
        status,
      });

      setIsEditCompanyModalOpen(false);

      // Refrescar el detalle para mantener los peers y el conteo actualizados
      const refreshed = await vpnService.getCompanyWithPeers(selectedCompany.id);
      if (refreshed) {
        setSelectedCompany(refreshed.company);
      }
    } catch (err: any) {
      alert(`Error al actualizar empresa: ${err.message || 'Ocurrió un error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreatePeer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCompany) return;

    const formData = new FormData(e.currentTarget);
    const deviceName = formData.get('deviceName') as string;
    const userName = formData.get('userName') as string;
    const manualPcStr = formData.get('manualPcNumber') as string;
    const manualPcNumber = manualPcStr ? parseInt(manualPcStr, 10) : undefined;

    try {
      setActionLoading(true);
      setErrorMsg(null);
      const result = await vpnService.createPeer({
        companyId: selectedCompany.id,
        companyNumber: selectedCompany.companyNumber,
        deviceName,
        userName,
        manualPcNumber: manualPcNumber && manualPcNumber > 0 ? manualPcNumber : undefined,
      });

      setNewPeerResult(result);
      setIsNewPeerModalOpen(false);

      // Refrescar los peers de la empresa seleccionada
      const refreshed = await vpnService.getCompanyWithPeers(selectedCompany.id);
      if (refreshed) {
        setSelectedCompany(refreshed.company);
      }
    } catch (err: any) {
      alert(`Error al crear equipo VPN: ${err.message || 'Ocurrió un error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePeer = async (peer: VpnPeer) => {
    if (!window.confirm(`¿Estás seguro de eliminar el equipo "${peer.deviceName}" (${peer.ip})?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await vpnService.deletePeer(peer.id);
      if (selectedCompany) {
        const refreshed = await vpnService.getCompanyWithPeers(selectedCompany.id);
        if (refreshed) {
          setSelectedCompany(refreshed.company);
        }
      }
    } catch (err: any) {
      alert(`Error al eliminar equipo: ${err.message || 'Error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return;
    if (!window.confirm(`¿Estás seguro de eliminar la empresa "${selectedCompany.name}" y TODOS sus equipos registrados?`)) {
      return;
    }

    try {
      setActionLoading(true);
      await vpnService.deleteCompany(selectedCompany.id);
      handleBackToList();
    } catch (err: any) {
      alert(`Error al eliminar empresa: ${err.message || 'Error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  const downloadClientConfigFile = (
    configText: string,
    companyNumber: number,
    pcNumber?: number
  ) => {
    const compStr = String(companyNumber).padStart(2, '0');
    // Nomenclatura requerida: Lsoft-VPN-[01, 02, 03... 05...]
    // Si la empresa tiene más de un equipo (pcNumber > 1), se añade sufijo para no sobreescribir
    const fileName = pcNumber && pcNumber > 1
      ? `Lsoft-VPN-${compStr}-${String(pcNumber).padStart(2, '0')}.conf`
      : `Lsoft-VPN-${compStr}.conf`;

    const blob = new Blob([configText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- Renderers ---
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Activo':
        return <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">Activo</span>;
      case 'Inactivo':
        return <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">Inactivo</span>;
      case 'Mantenimiento':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">Mantenimiento</span>;
      default:
        return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">{status}</span>;
    }
  };

  // VISTA LISTA DE EMPRESAS
  if (view === 'list') {
    const filteredCompanies = companies.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vpnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vpnRange.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calcular el siguiente número de empresa sugerido
    const nextSuggestedNumber = companies.length > 0 
      ? Math.max(...companies.map(c => c.companyNumber)) + 1 
      : 1;

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Gestión VPN WireGuard</h2>
            <p className="text-slate-500 mt-1">Direccionamiento por túneles: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs text-slate-700">10.0.[Empresa].[PC]</code></p>
          </div>
          <button
            onClick={() => setIsNewCompanyModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm"
          >
            <PlusIcon />
            Nueva Empresa
          </button>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold hover:underline">Cerrar</button>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar por empresa, grupo, VPN o rango..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-sm"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Total Empresas: <strong className="text-slate-700">{companies.length}</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Grupo Empresa</th>
                  <th className="px-6 py-4">Nº VPN (X)</th>
                  <th className="px-6 py-4">Rango Subred</th>
                  <th className="px-6 py-4 text-center">Nº PCs</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                      <p>Cargando empresas de VPN...</p>
                    </td>
                  </tr>
                )}
                {!loading && filteredCompanies.map(company => (
                  <tr
                    key={company.id}
                    onClick={() => handleViewDetails(company.id)}
                    className="hover:bg-blue-50/50 transition duration-150 cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition">
                      {company.name}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {company.groupName || <span className="text-slate-400 italic">Sin grupo</span>}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-600">
                      <span className="font-mono bg-blue-50 border border-blue-100 px-2 py-1 rounded text-xs font-bold">
                        {company.vpnNumber} (X={company.companyNumber})
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      <span className="bg-slate-100 rounded px-2 py-1 inline-block">
                        {company.vpnRange}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-xs">
                        {company.pcCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">{renderStatusBadge(company.status)}</td>
                  </tr>
                ))}
                {!loading && filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      No se encontraron resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Nueva Empresa */}
        {isNewCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Registrar Nueva Empresa</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Asignará el rango de IP <code className="text-blue-600 font-mono">10.0.X.0/24</code></p>
                </div>
                <button
                  onClick={() => setIsNewCompanyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                  disabled={actionLoading}
                >
                  <CloseIcon />
                </button>
              </div>
              <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de Empresa *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ej. Corporación ABC"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Grupo Empresa (Opcional)</label>
                  <input
                    name="groupName"
                    type="text"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ej. Grupo Comercial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Número de Empresa (X)
                  </label>
                  <input
                    name="manualNumber"
                    type="number"
                    min="1"
                    placeholder={`Sugerido automático: ${nextSuggestedNumber}`}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Déjalo vacío para auto-asignar el siguiente consecutivo ({nextSuggestedNumber}). O ingresa un número si la empresa ya tiene una IP fija en producción.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Estado Inicial</label>
                  <select
                    name="status"
                    defaultValue="Activo"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewCompanyModalOpen(false)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                  >
                    {actionLoading ? 'Guardando...' : 'Guardar Empresa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // VISTA DETALLE DE EMPRESA
  if (view === 'detail' && selectedCompany) {
    const peers = selectedCompany.peers || [];
    const nextSuggestedPc = peers.length > 0
      ? Math.max(...peers.map(p => p.pcNumber)) + 1
      : 1;

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBackToList}
              className="p-2.5 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-sm"
              title="Volver a lista de empresas"
            >
              <BackIcon />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold text-slate-800">{selectedCompany.name}</h2>
                {renderStatusBadge(selectedCompany.status)}
              </div>
              <p className="text-slate-500 text-sm mt-0.5">
                Número de Empresa X: <strong className="text-blue-600 font-mono">{selectedCompany.companyNumber}</strong> • Rango: <strong className="font-mono text-slate-700">{selectedCompany.vpnRange}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditCompanyModalOpen(true)}
              disabled={actionLoading}
              className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg font-bold border border-blue-200 transition flex items-center gap-1.5"
            >
              <EditIcon />
              Editar Empresa
            </button>

            {isAdminOrTech && (
              <button
                onClick={handleDeleteCompany}
                disabled={actionLoading}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg font-bold border border-red-200 transition flex items-center gap-1.5"
              >
                <TrashIcon />
                Eliminar Empresa
              </button>
            )}
          </div>
        </div>

        {/* Resumen Cabecera */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Grupo</p>
              <p className="font-medium text-slate-800">{selectedCompany.groupName || 'Sin Grupo'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Identificador</p>
              <p className="font-bold text-blue-600 font-mono">{selectedCompany.vpnNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Rango VPN</p>
              <p className="font-mono text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">{selectedCompany.vpnRange}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Esquema IP</p>
              <p className="font-mono text-sm text-blue-700 font-bold">10.0.{selectedCompany.companyNumber}.[PC]</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Total Equipos</p>
              <p className="font-bold text-slate-800 text-lg">{peers.length}</p>
            </div>
          </div>
        </div>

        {/* Banner de resultado: Claves y Configuración recién generadas */}
        {newPeerResult && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 p-6 rounded-2xl shadow-md relative overflow-hidden animate-fadeIn">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-blue-600 text-white rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <h3 className="text-lg font-bold text-blue-900">
                    Túnel Creado Exitosamente: {newPeerResult.peer.deviceName} ({newPeerResult.peer.userName})
                  </h3>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  <span className="text-slate-700">IP Asignada:</span>
                  <span className="font-mono font-bold text-blue-800 bg-white px-2.5 py-0.5 rounded-md border border-blue-200 shadow-xs text-base">
                    {newPeerResult.peer.ip}
                  </span>
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                    ✓ La configuración quedó guardada. Puedes volver a consultarla o descargar el .conf en cualquier momento haciendo clic sobre el equipo en la tabla.
                  </span>
                </div>
              </div>
              <button
                onClick={() => setNewPeerResult(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                title="Cerrar panel"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-4">
              {/* Bloque Servidor (Copiar y Pegar en wg0.conf) */}
              <div className="space-y-2 bg-white/70 p-4 rounded-xl border border-blue-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-700 font-bold block">
                      1. Configuración Servidor WireGuard
                    </span>
                    <span className="text-[11px] text-slate-500">Copia y pega este bloque en el servidor</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(newPeerResult.serverConfig, 'server_new')}
                    className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 bg-blue-100/80 hover:bg-blue-200/80 px-2.5 py-1.5 rounded-lg border border-blue-300 transition shadow-xs"
                  >
                    <CopyIcon /> {copiedKey === 'server_new' ? '¡Copiado!' : 'Copiar Servidor'}
                  </button>
                </div>
                <div className="bg-slate-900 rounded-xl p-3.5 overflow-x-auto shadow-inner">
                  <pre className="text-xs text-green-400 font-mono leading-relaxed">
                    <code>{newPeerResult.serverConfig}</code>
                  </pre>
                </div>
              </div>

              {/* Bloque Cliente (.conf para PC/Laptop/Móvil) */}
              <div className="space-y-2 bg-white/70 p-4 rounded-xl border border-blue-200">
                {(() => {
                  const compPad = String(selectedCompany.companyNumber).padStart(2, '0');
                  const dlName = (newPeerResult.peer.pcNumber > 1)
                    ? `Lsoft-VPN-${compPad}-${String(newPeerResult.peer.pcNumber).padStart(2, '0')}.conf`
                    : `Lsoft-VPN-${compPad}.conf`;

                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs uppercase tracking-wider text-slate-700 font-bold block">
                            2. Configuración Cliente WireGuard
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">Archivo: <strong>{dlName}</strong></span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => copyToClipboard(newPeerResult.clientConfig, 'client_new')}
                            className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-300 transition shadow-xs"
                            title="Copiar texto de configuración"
                          >
                            <CopyIcon /> {copiedKey === 'client_new' ? '¡Copiado!' : 'Copiar'}
                          </button>
                          <button
                            onClick={() => downloadClientConfigFile(newPeerResult.clientConfig, selectedCompany.companyNumber, newPeerResult.peer.pcNumber)}
                            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition shadow-xs"
                            title={`Descargar archivo ${dlName}`}
                          >
                            <DownloadIcon /> Descargar {dlName}
                          </button>
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded-xl p-3.5 overflow-x-auto shadow-inner">
                        <pre className="text-xs text-blue-300 font-mono leading-relaxed">
                          <code>{newPeerResult.clientConfig}</code>
                        </pre>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Modal Detalle y Configuración de un Peer (Cliente + Servidor) */}
        {selectedPeerForConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-slate-200 bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-slate-800">
                      Configuración WireGuard: {selectedPeerForConfig.deviceName}
                    </h3>
                    {renderStatusBadge(selectedPeerForConfig.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Usuario: <strong className="text-slate-700">{selectedPeerForConfig.userName}</strong> • 
                    IP Asignada: <strong className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{selectedPeerForConfig.ip}</strong> • 
                    Empresa: <strong className="text-slate-700">{selectedCompany.name}</strong> (X={selectedCompany.companyNumber})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedPeerForConfig(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                >
                  <CloseIcon />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                {(() => {
                  const clientCfg = vpnService.getPeerClientConfig(
                    selectedPeerForConfig,
                    selectedCompany.companyNumber
                  );
                  const serverCfg = vpnService.getPeerServerConfig(
                    selectedPeerForConfig,
                    selectedCompany.companyNumber
                  );
                  const hasPrivateKey = Boolean(
                    selectedPeerForConfig.privateKey && selectedPeerForConfig.privateKey.trim().length > 0
                  );
                  const compPad = String(selectedCompany.companyNumber).padStart(2, '0');
                  const dlName = (selectedPeerForConfig.pcNumber > 1)
                    ? `Lsoft-VPN-${compPad}-${String(selectedPeerForConfig.pcNumber).padStart(2, '0')}.conf`
                    : `Lsoft-VPN-${compPad}.conf`;

                  return (
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* 1. Configuración Cliente */}
                      <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs uppercase tracking-wider text-slate-700 font-bold block">
                              1. Configuración Cliente (.conf)
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">Archivo: <strong>{dlName}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => copyToClipboard(clientCfg, 'modal_client')}
                              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 bg-white hover:bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-300 transition shadow-xs"
                              title="Copiar texto de configuración cliente"
                            >
                              <CopyIcon /> {copiedKey === 'modal_client' ? '¡Copiado!' : 'Copiar'}
                            </button>
                            <button
                              onClick={() => downloadClientConfigFile(clientCfg, selectedCompany.companyNumber, selectedPeerForConfig.pcNumber)}
                              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition shadow-xs"
                              title={`Descargar archivo ${dlName}`}
                            >
                              <DownloadIcon /> Descargar {dlName}
                            </button>
                          </div>
                        </div>

                        {!hasPrivateKey && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800 leading-tight">
                            ⚠️ Este equipo fue registrado antes de habilitar el almacenamiento de clave privada. En la línea <code>PrivateKey</code> debes colocar la clave privada correspondiente al dispositivo.
                          </div>
                        )}

                        <div className="bg-slate-900 rounded-xl p-3.5 overflow-x-auto shadow-inner">
                          <pre className="text-xs text-blue-300 font-mono leading-relaxed">
                            <code>{clientCfg}</code>
                          </pre>
                        </div>
                      </div>

                      {/* 2. Configuración Servidor */}
                      <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs uppercase tracking-wider text-slate-700 font-bold block">
                              2. Configuración Servidor (wg0.conf)
                            </span>
                            <span className="text-[11px] text-slate-500">Copia y pega este bloque en el servidor</span>
                          </div>
                          <button
                            onClick={() => copyToClipboard(serverCfg, 'modal_server')}
                            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 bg-blue-100/80 hover:bg-blue-200/80 px-2.5 py-1.5 rounded-lg border border-blue-300 transition shadow-xs"
                          >
                            <CopyIcon /> {copiedKey === 'modal_server' ? '¡Copiado!' : 'Copiar Servidor'}
                          </button>
                        </div>
                        <div className="bg-slate-900 rounded-xl p-3.5 overflow-x-auto shadow-inner">
                          <pre className="text-xs text-green-400 font-mono leading-relaxed">
                            <code>{serverCfg}</code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setSelectedPeerForConfig(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-sm transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabla de Peers (Equipos) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Equipos Registrados (Peers)</h3>
              <p className="text-xs text-slate-500">Haz clic sobre cualquier equipo para ver o descargar su configuración completa.</p>
            </div>
            <button
              onClick={() => setIsNewPeerModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm text-sm"
            >
              <PlusIcon />
              Crear Nuevo Peer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">IP (10.0.X.Y)</th>
                  <th className="px-6 py-4">Equipo</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Clave Pública (WireGuard)</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {peers.map(peer => (
                  <tr
                    key={peer.id}
                    onClick={() => setSelectedPeerForConfig(peer)}
                    className="hover:bg-blue-50/50 transition duration-150 cursor-pointer group"
                    title="Haz clic para ver o descargar la configuración"
                  >
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                      <span className="bg-blue-50 border border-blue-100 rounded px-2 py-0.5 text-xs group-hover:border-blue-300 transition">
                        {peer.ip}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition">{peer.deviceName}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{peer.userName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      <span className="truncate max-w-[160px] inline-block bg-slate-50 border border-slate-200 rounded px-2 py-0.5" title={peer.publicKey}>
                        {peer.publicKey}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{peer.createdAt}</td>
                    <td className="px-6 py-4">{renderStatusBadge(peer.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedPeerForConfig(peer)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Ver y descargar configuración"
                        >
                          <ServerIcon />
                        </button>
                        {isAdminOrTech && (
                          <button
                            onClick={() => handleDeletePeer(peer)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Eliminar este equipo"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {peers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 font-medium">
                      No hay equipos registrados en esta VPN. Haz clic en "Crear Nuevo Peer" para generar el primero.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Nuevo Peer */}
        {isNewPeerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Equipo</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Empresa: <strong className="text-blue-600">{selectedCompany.name}</strong> (X={selectedCompany.companyNumber})
                  </p>
                </div>
                <button
                  onClick={() => setIsNewPeerModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                  disabled={actionLoading}
                >
                  <CloseIcon />
                </button>
              </div>

              <form onSubmit={handleCreatePeer} className="p-6 space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
                  <p className="font-bold">✨ Generación Automática:</p>
                  <p>• La <strong>clave privada y pública</strong> WireGuard se generarán de forma segura.</p>
                  <p>• La IP asignada seguirá el esquema <strong>10.0.{selectedCompany.companyNumber}.Y</strong>.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Equipo *</label>
                  <input
                    name="deviceName"
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ej. LAPTOP-JUAN, SRV-CONTABLE"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Usuario Asignado *</label>
                  <input
                    name="userName"
                    type="text"
                    required
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ej. jperez, administracion"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">
                    Número de PC (Y)
                  </label>
                  <input
                    name="manualPcNumber"
                    type="number"
                    min="1"
                    placeholder={`Sugerido automático: ${nextSuggestedPc} (10.0.${selectedCompany.companyNumber}.${nextSuggestedPc})`}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Déjalo vacío para auto-asignar {nextSuggestedPc}. O ingresa un número si este dispositivo ya tiene una IP fija en producción.
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsNewPeerModalOpen(false)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                  >
                    {actionLoading ? 'Generando Túnel...' : 'Generar Túnel y Accesos'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Editar Empresa */}
        {isEditCompanyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Editar Empresa</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <strong className="text-blue-600 font-mono">{selectedCompany.vpnNumber}</strong> • Rango <span className="font-mono">{selectedCompany.vpnRange}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsEditCompanyModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition"
                  disabled={actionLoading}
                >
                  <CloseIcon />
                </button>
              </div>
              <form onSubmit={handleUpdateCompany} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de Empresa *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={selectedCompany.name}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Grupo Empresa (Opcional)</label>
                  <input
                    name="groupName"
                    type="text"
                    defaultValue={selectedCompany.groupName}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Ej. Grupo Comercial"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    name="status"
                    defaultValue={selectedCompany.status}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  El <strong>Número de Empresa (X = {selectedCompany.companyNumber})</strong> no se puede modificar, porque cambiaría el rango <span className="font-mono">{selectedCompany.vpnRange}</span> y las IPs ya instaladas en los {peers.length} equipo(s) de esta empresa.
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditCompanyModalOpen(false)}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                  >
                    {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default VpnManagement;
