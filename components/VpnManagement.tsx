import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import {
  vpnService,
  VpnCompany,
  VpnPeer,
  VpnServer,
  VpnTunnel,
  GeneratedPeerResult,
  buildConfigFileName,
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

const BuildingIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

  // Servidores independientes y, dentro de cada uno, sus túneles
  const [servers, setServers] = useState<VpnServer[]>([]);
  const [activeServerId, setActiveServerId] = useState<string>('');
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<VpnServer | null>(null);
  const [showTunnelDetails, setShowTunnelDetails] = useState(false);
  const [tunnels, setTunnels] = useState<VpnTunnel[]>([]);
  const [activeTunnelId, setActiveTunnelId] = useState<string>('');
  const [isTunnelModalOpen, setIsTunnelModalOpen] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<VpnTunnel | null>(null);

  const isAdmin = user?.role === UserRole.ADMIN;
  // Administradores y técnicos pueden eliminar empresas y equipos
  const canDelete = isAdmin || user?.role === UserRole.TECH;
  // Los parámetros del servidor (endpoint, clave pública, prefijo) son solo del administrador
  const canManageTunnels = isAdmin;

  const activeServer = servers.find(s => s.id === activeServerId) || servers[0] || null;
  // Si los túneles todavía no traen servidor (migración sin aplicar), se muestran todos juntos.
  const serverTunnels = tunnels.some(t => t.serverId)
    ? tunnels.filter(t => t.serverId === activeServer?.id)
    : tunnels;

  // Túnel de la pestaña activa y túnel al que pertenece la empresa abierta
  const activeTunnel = serverTunnels.find(t => t.id === activeTunnelId) || serverTunnels[0] || null;
  const selectedTunnel = selectedCompany
    ? tunnels.find(t => t.id === selectedCompany.tunnelId) || activeTunnel
    : activeTunnel;
  const isRadminTunnel = selectedTunnel?.kind === 'radmin';

  // Cargar túneles y empresas al montar el componente
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [serverList, tunnelList, companyList] = await Promise.all([
        vpnService.getServers(),
        vpnService.getTunnels(),
        vpnService.getCompanies(),
      ]);
      setServers(serverList);
      setTunnels(tunnelList);
      setActiveServerId(prev => {
        if (prev && serverList.some(s => s.id === prev)) return prev;
        return serverList[0]?.id || '';
      });
      setActiveTunnelId(prev => {
        if (prev && tunnelList.some(t => t.id === prev)) return prev;
        return tunnelList[0]?.id || '';
      });
      setCompanies(companyList);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cargar la información de VPN');
    } finally {
      setLoading(false);
    }
  };

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

    if (!activeTunnel) {
      alert('No hay un túnel seleccionado.');
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      await vpnService.createCompany({
        tunnel: activeTunnel,
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

    if (!selectedTunnel) {
      alert('No se pudo determinar el túnel de esta empresa.');
      return;
    }

    const formData = new FormData(e.currentTarget);
    const deviceName = formData.get('deviceName') as string;
    const userName = formData.get('userName') as string;
    const manualPcStr = formData.get('manualPcNumber') as string;
    const manualPcNumber = manualPcStr ? parseInt(manualPcStr, 10) : undefined;
    const notes = formData.get('notes') as string;

    try {
      setActionLoading(true);
      setErrorMsg(null);
      const result = await vpnService.createPeer({
        tunnel: selectedTunnel,
        companyId: selectedCompany.id,
        companyNumber: selectedCompany.companyNumber,
        deviceName,
        userName,
        manualPcNumber: manualPcNumber && manualPcNumber > 0 ? manualPcNumber : undefined,
        notes: notes || undefined,
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
    if (!selectedTunnel) return;
    const fileName = buildConfigFileName(selectedTunnel, companyNumber, pcNumber);

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

  const handleSaveTunnel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const kind = formData.get('kind') as 'wireguard' | 'radmin';
    const portStr = formData.get('listenPort') as string;

    const payload = {
      name: formData.get('name') as string,
      kind,
      endpointHost: (formData.get('endpointHost') as string) || '',
      listenPort: portStr ? parseInt(portStr, 10) : null,
      serverPublicKey: (formData.get('serverPublicKey') as string) || '',
      dns: (formData.get('dns') as string) || '1.1.1.1',
      clientAllowedIps: (formData.get('clientAllowedIps') as string) || '',
      addressPrefix: (formData.get('addressPrefix') as string) || '',
      addressCidr: parseInt((formData.get('addressCidr') as string) || '16', 10),
      persistentKeepalive: parseInt((formData.get('persistentKeepalive') as string) || '25', 10),
      filePrefix: (formData.get('filePrefix') as string) || 'Lsoft-VPN',
      status: formData.get('status') as 'Activo' | 'Inactivo' | 'Mantenimiento',
    };

    try {
      setActionLoading(true);
      if (editingTunnel && editingTunnel.id) {
        await vpnService.updateTunnel(editingTunnel.id, payload);
      } else {
        const created = await vpnService.createTunnel({
          ...payload,
          serverId: activeServer?.id || '',
        });
        setActiveTunnelId(created.id);
      }
      setIsTunnelModalOpen(false);
      setEditingTunnel(null);
      await loadAll();
    } catch (err: any) {
      alert(`Error al guardar el túnel: ${err.message || 'Error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveServer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const host = (formData.get('host') as string) || '';
    try {
      setActionLoading(true);
      if (editingServer?.id) {
        await vpnService.updateServer(editingServer.id, { name, host });
      } else {
        const created = await vpnService.createServer({
          name,
          host,
          sortOrder: servers.reduce((max, s) => Math.max(max, s.sortOrder), 0) + 1,
        });
        setActiveServerId(created.id);
        setActiveTunnelId('');
      }
      setIsServerModalOpen(false);
      setEditingServer(null);
      setShowTunnelDetails(false);
      await loadAll();
    } catch (err: any) {
      alert(`Error al guardar el servidor: ${err.message || 'Error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteServer = async (server: VpnServer) => {
    const tunnelsInServer = tunnels.filter(t => t.serverId === server.id).length;
    if (tunnelsInServer > 0) {
      alert(`No puedes eliminar "${server.name}" porque tiene ${tunnelsInServer} túnel(es). Elimínalos primero.`);
      return;
    }
    if (!window.confirm(`¿Eliminar el servidor "${server.name}"?`)) return;

    try {
      setActionLoading(true);
      await vpnService.deleteServer(server.id);
      setActiveServerId('');
      setActiveTunnelId('');
      setShowTunnelDetails(false);
      await loadAll();
    } catch (err: any) {
      alert(`Error al eliminar el servidor: ${err.message || 'Error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectServer = (serverId: string) => {
    const nextTunnels = tunnels.some(t => t.serverId)
      ? tunnels.filter(t => t.serverId === serverId)
      : tunnels;
    setActiveServerId(serverId);
    setActiveTunnelId(nextTunnels[0]?.id || '');
    setSearchTerm('');
    setShowTunnelDetails(false);
  };

  const handleDeleteTunnel = async (tunnel: VpnTunnel) => {
    const companiesInTunnel = companies.filter(c => c.tunnelId === tunnel.id).length;
    if (companiesInTunnel > 0) {
      alert(`No puedes eliminar "${tunnel.name}" porque tiene ${companiesInTunnel} empresa(s) asignada(s). Muévelas o elimínalas primero.`);
      return;
    }
    if (!window.confirm(`¿Eliminar el túnel "${tunnel.name}"?`)) return;

    try {
      setActionLoading(true);
      await vpnService.deleteTunnel(tunnel.id);
      setIsTunnelModalOpen(false);
      setEditingTunnel(null);
      await loadAll();
    } catch (err: any) {
      alert(`Error al eliminar el túnel: ${err.message || 'Error inesperado'}`);
    } finally {
      setActionLoading(false);
    }
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
    // Empresas del túnel activo (subpágina)
    const tunnelCompanies = companies.filter(c =>
      activeTunnel ? c.tunnelId === activeTunnel.id : true
    );

    const filteredCompanies = tunnelCompanies.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vpnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.vpnRange.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Siguiente número de empresa sugerido dentro del túnel activo
    const nextSuggestedNumber = tunnelCompanies.length > 0
      ? Math.max(...tunnelCompanies.map(c => c.companyNumber)) + 1
      : 1;

    const serverTunnelIds = new Set(serverTunnels.map(t => t.id));
    const serverCompanies = companies.filter(c => serverTunnelIds.has(c.tunnelId));

    // Subtotales del túnel activo y del servidor seleccionado
    const tunnelPcs = tunnelCompanies.reduce((acc, c) => acc + c.pcCount, 0);
    const tunnelActive = tunnelCompanies.filter(c => c.status === 'Activo').length;
    const serverPcs = serverCompanies.reduce((acc, c) => acc + c.pcCount, 0);
    const filteredPcs = filteredCompanies.reduce((acc, c) => acc + c.pcCount, 0);

    const isRadminActive = activeTunnel?.kind === 'radmin';

    // Conteos por túnel para las pestañas
    const countsByTunnel = (tunnelId: string) => {
      const list = companies.filter(c => c.tunnelId === tunnelId);
      return {
        companies: list.length,
        pcs: list.reduce((acc, c) => acc + c.pcCount, 0),
      };
    };

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Gestión VPN</h2>
            <p className="text-slate-500 mt-1">
              {isRadminActive ? (
                <>Acceso remoto vía <strong className="text-slate-700">Radmin</strong> (ficha informativa, sin túnel WireGuard)</>
              ) : (
                <>Direccionamiento: <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs text-slate-700">{activeTunnel?.addressPrefix || '10.0'}.[Empresa].[PC]</code></>
              )}
            </p>
          </div>
          {canManageTunnels && (
            <button
              onClick={() => { setEditingServer(null); setIsServerModalOpen(true); }}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm"
            >
              <PlusIcon />
              Nuevo servidor
            </button>
          )}
        </div>

        {/* Servidores: cada uno vive aparte, con sus propios túneles */}
        <div className="flex flex-col sm:flex-row gap-3">
          {servers.map(server => {
            const ownTunnels = tunnels.some(t => t.serverId)
              ? tunnels.filter(t => t.serverId === server.id)
              : tunnels;
            const ownIds = new Set(ownTunnels.map(t => t.id));
            const ownCompanies = companies.filter(c => ownIds.has(c.tunnelId));
            const ownPcs = ownCompanies.reduce((acc, c) => acc + c.pcCount, 0);
            const isActive = activeServer?.id === server.id;
            return (
              <div
                key={server.id || server.name}
                className={`flex-1 flex items-center gap-2 px-5 py-4 rounded-2xl border transition ${
                  isActive
                    ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <button
                  onClick={() => handleSelectServer(server.id)}
                  className="flex-1 text-left min-w-0"
                >
                  <span className="flex items-center gap-2 font-bold">
                    <ServerIcon />
                    {server.name}
                  </span>
                  <span className={`block text-xs mt-1 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                    {server.host || 'Sin IP registrada'} • {ownTunnels.length} túnel(es) • {ownCompanies.length} empresa(s) • {ownPcs} PC(s)
                  </span>
                </button>
                {isActive && canManageTunnels && server.id && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingServer(server); setIsServerModalOpen(true); }}
                      className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      title="Editar servidor"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDeleteServer(server)}
                      disabled={actionLoading}
                      className="p-2 rounded-lg text-slate-300 hover:text-red-300 hover:bg-slate-700 transition"
                      title="Eliminar servidor"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Subpáginas: una pestaña por túnel del servidor activo */}
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-thin scrollbar-thumb-slate-300">
          {serverTunnels.map(t => {
            const counts = countsByTunnel(t.id);
            const isActive = activeTunnel?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => { setActiveTunnelId(t.id); setSearchTerm(''); setShowTunnelDetails(false); }}
                className={`px-5 py-3 rounded-xl font-medium transition whitespace-nowrap flex items-center gap-3 border ${
                  isActive
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="text-lg">{t.kind === 'radmin' ? '🖥️' : '🔐'}</span>
                <span className="text-left">
                  <span className="block font-bold text-sm">{t.name}</span>
                  <span className={`block text-[11px] ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    {counts.companies} empresa(s) • {counts.pcs} PC(s)
                    {canManageTunnels && t.kind !== 'radmin' && t.listenPort ? ` • :${t.listenPort}` : ''}
                  </span>
                </span>
              </button>
            );
          })}

          {canManageTunnels && (
            <button
              onClick={() => { setEditingTunnel(null); setIsTunnelModalOpen(true); }}
              className="px-4 py-3 rounded-xl font-bold text-sm transition whitespace-nowrap flex items-center gap-2 bg-white text-slate-500 border border-dashed border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              title="Agregar un nuevo túnel"
            >
              <PlusIcon />
              Nuevo Túnel
            </button>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold hover:underline">Cerrar</button>
          </div>
        )}

        {activeTunnel && canManageTunnels && (
          <div>
            <button
              onClick={() => setShowTunnelDetails(open => !open)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              {showTunnelDetails ? 'Ocultar datos del túnel' : 'Ver datos del túnel'}
            </button>
            {showTunnelDetails && (
              <div className="mt-2 bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <div>
                    <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Túnel</p>
                    <p className="font-bold text-sm text-slate-800">{activeTunnel.name}</p>
                  </div>
                  {activeTunnel.kind === 'radmin' ? (
                    <div>
                      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Tipo</p>
                      <p className="text-sm text-slate-700">Radmin (sin configuración WireGuard)</p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Endpoint</p>
                        <p className="font-mono text-sm text-slate-700">{activeTunnel.endpointHost}:{activeTunnel.listenPort}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Prefijo IP</p>
                        <p className="font-mono text-sm text-blue-700 font-bold">{activeTunnel.addressPrefix}.X.Y</p>
                      </div>
                      <div className="max-w-xs">
                        <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">Clave pública</p>
                        <p className="font-mono text-xs text-slate-500 truncate" title={activeTunnel.serverPublicKey}>
                          {activeTunnel.serverPublicKey}
                        </p>
                      </div>
                    </>
                  )}
                </div>
                {activeTunnel.id && (
                  <button
                    onClick={() => { setEditingTunnel(activeTunnel); setIsTunnelModalOpen(true); }}
                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg font-bold border border-blue-200 transition flex items-center gap-1.5 self-start"
                  >
                    <EditIcon />
                    Editar Túnel
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Totales del túnel activo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <span className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <BuildingIcon />
            </span>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Empresas en este túnel</p>
              <p className="text-2xl font-bold text-slate-800 leading-tight">{tunnelCompanies.length}</p>
              <p className="text-[11px] text-slate-400">{serverCompanies.length} en este servidor</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <span className="p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <UsersIcon />
            </span>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Total Usuarios (Nº PCs)</p>
              <p className="text-2xl font-bold text-slate-800 leading-tight">{tunnelPcs}</p>
              <p className="text-[11px] text-slate-400">{serverPcs} en este servidor</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <span className="p-3 bg-green-50 text-green-600 rounded-xl border border-green-100">
              <CheckCircleIcon />
            </span>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Empresas Activas</p>
              <p className="text-2xl font-bold text-slate-800 leading-tight">{tunnelActive}</p>
              <p className="text-[11px] text-slate-400">en este túnel</p>
            </div>
          </div>
        </div>

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
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
                Mostrando <strong className="text-slate-700">{filteredCompanies.length}</strong> empresa(s) • <strong className="text-slate-700">{filteredPcs}</strong> PC(s)
              </div>
              <button
                onClick={() => setIsNewCompanyModalOpen(true)}
                disabled={!activeTunnel}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                <PlusIcon />
                Nueva Empresa
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Grupo Empresa</th>
                  <th className="px-6 py-4">Identificador (X)</th>
                  <th className="px-6 py-4">{isRadminActive ? 'Acceso' : 'Rango Subred'}</th>
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
                      {!activeTunnel
                        ? `${activeServer?.name || 'Este servidor'} todavía no tiene túneles. Créalos con Nuevo Túnel; las empresas de aquí no se mezclan con el otro servidor.`
                        : tunnelCompanies.length === 0
                        ? `Todavía no hay empresas en ${activeTunnel.name}.`
                        : 'No se encontraron resultados.'}
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    En <strong className="text-blue-600">{activeTunnel?.name}</strong>
                    {!isRadminActive && activeTunnel && (
                      <> • Rango <code className="text-blue-600 font-mono">{activeTunnel.addressPrefix}.X.0/24</code></>
                    )}
                  </p>
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

        {isServerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingServer ? 'Editar servidor' : 'Nuevo servidor'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">El nombre y la IP solo identifican este servidor. Los túneles se crean aparte.</p>
                </div>
                <button
                  onClick={() => { setIsServerModalOpen(false); setEditingServer(null); }}
                  className="text-slate-400 hover:text-slate-600 transition"
                  disabled={actionLoading}
                >
                  <CloseIcon />
                </button>
              </div>
              <form key={editingServer?.id || 'new-server'} onSubmit={handleSaveServer} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre *</label>
                  <input
                    name="name"
                    type="text"
                    required
                    defaultValue={editingServer?.name || ''}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">IP pública</label>
                  <input
                    name="host"
                    type="text"
                    defaultValue={editingServer?.host || ''}
                    placeholder="Ej. 20.242.117.143"
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsServerModalOpen(false); setEditingServer(null); }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition text-sm"
                  >
                    {actionLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Crear / Editar Túnel */}
        {isTunnelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center p-6 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingTunnel ? 'Editar Túnel' : 'Nuevo Túnel'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Quedará en <strong className="text-slate-700">{activeServer?.name || 'este servidor'}</strong>. Estos datos se usan para generar las configuraciones.
                  </p>
                </div>
                <button
                  onClick={() => { setIsTunnelModalOpen(false); setEditingTunnel(null); }}
                  className="text-slate-400 hover:text-slate-600 transition"
                  disabled={actionLoading}
                >
                  <CloseIcon />
                </button>
              </div>

              <form onSubmit={handleSaveTunnel} className="p-6 space-y-4 overflow-y-auto">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Túnel *</label>
                    <input
                      name="name"
                      type="text"
                      required
                      defaultValue={editingTunnel?.name || ''}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Ej. Túnel Principal"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Tipo</label>
                    <select
                      name="kind"
                      defaultValue={editingTunnel?.kind || 'wireguard'}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                    >
                      <option value="wireguard">WireGuard</option>
                      <option value="radmin">Radmin (solo ficha)</option>
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Endpoint (IP o dominio)</label>
                    <input
                      name="endpointHost"
                      type="text"
                      defaultValue={editingTunnel?.endpointHost || ''}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                      placeholder="20.242.117.143"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Puerto</label>
                    <input
                      name="listenPort"
                      type="number"
                      defaultValue={editingTunnel?.listenPort ?? ''}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                      placeholder="51820"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Clave Pública del Servidor</label>
                  <input
                    name="serverPublicKey"
                    type="text"
                    defaultValue={editingTunnel?.serverPublicKey || ''}
                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono"
                    placeholder="Clave pública en base64"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">AllowedIPs del cliente</label>
                    <input
                      name="clientAllowedIps"
                      type="text"
                      defaultValue={editingTunnel?.clientAllowedIps || ''}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                      placeholder="10.0.0.1/32"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">DNS</label>
                    <input
                      name="dns"
                      type="text"
                      defaultValue={editingTunnel?.dns || '1.1.1.1'}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Prefijo de IP</label>
                    <input
                      name="addressPrefix"
                      type="text"
                      defaultValue={editingTunnel?.addressPrefix || ''}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                      placeholder="10.0"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Genera <span className="font-mono">prefijo.[Empresa].[PC]</span></p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Máscara (CIDR)</label>
                    <input
                      name="addressCidr"
                      type="number"
                      min="8"
                      max="32"
                      defaultValue={editingTunnel?.addressCidr ?? 16}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Keepalive</label>
                    <input
                      name="persistentKeepalive"
                      type="number"
                      min="0"
                      defaultValue={editingTunnel?.persistentKeepalive ?? 25}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Prefijo de archivo .conf</label>
                    <input
                      name="filePrefix"
                      type="text"
                      defaultValue={editingTunnel?.filePrefix || 'Lsoft-VPN'}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">Las descargas se llamarán <span className="font-mono">prefijo-01.conf</span></p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Estado</label>
                    <select
                      name="status"
                      defaultValue={editingTunnel?.status || 'Activo'}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  {editingTunnel && isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleDeleteTunnel(editingTunnel)}
                      disabled={actionLoading}
                      className="px-4 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition text-sm"
                    >
                      Eliminar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setIsTunnelModalOpen(false); setEditingTunnel(null); }}
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm"
                  >
                    {actionLoading ? 'Guardando...' : 'Guardar Túnel'}
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
                <strong className="text-slate-700">{activeServer?.name}</strong> • <strong className="text-slate-700">{selectedTunnel?.name}</strong> • Empresa X: <strong className="text-blue-600 font-mono">{selectedCompany.companyNumber}</strong>
                {!isRadminTunnel && <> • Rango: <strong className="font-mono text-slate-700">{selectedCompany.vpnRange}</strong></>}
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

            {canDelete && (
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
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">{isRadminTunnel ? 'Acceso' : 'Rango VPN'}</p>
              <p className="font-mono text-sm text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">{selectedCompany.vpnRange}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">{isRadminTunnel ? 'Tipo' : 'Esquema IP'}</p>
              <p className="font-mono text-sm text-blue-700 font-bold">
                {isRadminTunnel ? 'Radmin' : `${selectedTunnel?.addressPrefix}.${selectedCompany.companyNumber}.[PC]`}
              </p>
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
                    {isRadminTunnel ? 'Equipo Registrado' : 'Túnel Creado Exitosamente'}: {newPeerResult.peer.deviceName} ({newPeerResult.peer.userName})
                  </h3>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
                  {!isRadminTunnel && (
                    <>
                      <span className="text-slate-700">IP Asignada:</span>
                      <span className="font-mono font-bold text-blue-800 bg-white px-2.5 py-0.5 rounded-md border border-blue-200 shadow-xs text-base">
                        {newPeerResult.peer.ip}
                      </span>
                    </>
                  )}
                  <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-200">
                    {isRadminTunnel
                      ? '✓ Ficha guardada. Puedes consultarla haciendo clic sobre el equipo en la tabla.'
                      : '✓ La configuración quedó guardada. Puedes volver a consultarla o descargar el .conf en cualquier momento haciendo clic sobre el equipo en la tabla.'}
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

            <div className={`grid md:grid-cols-2 gap-6 mt-4 ${isRadminTunnel ? 'hidden' : ''}`}>
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
                  const dlName = selectedTunnel
                    ? buildConfigFileName(selectedTunnel, selectedCompany.companyNumber, newPeerResult.peer.pcNumber)
                    : 'cliente.conf';

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
                      {isRadminTunnel ? 'Ficha del Equipo' : 'Configuración WireGuard'}: {selectedPeerForConfig.deviceName}
                    </h3>
                    {renderStatusBadge(selectedPeerForConfig.status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Usuario: <strong className="text-slate-700">{selectedPeerForConfig.userName}</strong> • 
                    {!isRadminTunnel && (
                      <> IP Asignada: <strong className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{selectedPeerForConfig.ip}</strong> • </>
                    )}
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
                {isRadminTunnel && (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Equipo</p>
                      <p className="font-bold text-slate-800">{selectedPeerForConfig.deviceName}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Usuario</p>
                      <p className="font-medium text-slate-700">{selectedPeerForConfig.userName}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Nº de Equipo</p>
                      <p className="font-mono font-bold text-slate-700">{selectedPeerForConfig.pcNumber}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Registrado</p>
                      <p className="font-medium text-slate-700">{selectedPeerForConfig.createdAt}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 sm:col-span-2">
                      <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-1">Notas</p>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {selectedPeerForConfig.notes || <span className="text-slate-400 italic">Sin notas</span>}
                      </p>
                    </div>
                  </div>
                )}

                {!isRadminTunnel && (() => {
                  if (!selectedTunnel) return null;

                  const clientCfg = vpnService.getPeerClientConfig(
                    selectedTunnel,
                    selectedPeerForConfig,
                    selectedCompany.companyNumber
                  );
                  const serverCfg = vpnService.getPeerServerConfig(
                    selectedTunnel,
                    selectedPeerForConfig,
                    selectedCompany.companyNumber
                  );
                  const hasPrivateKey = Boolean(
                    selectedPeerForConfig.privateKey && selectedPeerForConfig.privateKey.trim().length > 0
                  );
                  const dlName = buildConfigFileName(
                    selectedTunnel,
                    selectedCompany.companyNumber,
                    selectedPeerForConfig.pcNumber
                  );

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
              <h3 className="text-lg font-bold text-slate-800">
                {isRadminTunnel ? 'Equipos Registrados' : 'Equipos Registrados (Peers)'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRadminTunnel
                  ? 'Haz clic sobre cualquier equipo para ver su ficha.'
                  : 'Haz clic sobre cualquier equipo para ver o descargar su configuración completa.'}
              </p>
            </div>
            <button
              onClick={() => setIsNewPeerModalOpen(true)}
              className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm text-sm"
            >
              <PlusIcon />
              {isRadminTunnel ? 'Registrar Equipo' : 'Crear Nuevo Peer'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">
                    {isRadminTunnel ? 'Nº Equipo' : `IP (${selectedTunnel?.addressPrefix || '10.0'}.X.Y)`}
                  </th>
                  <th className="px-6 py-4">Equipo</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">{isRadminTunnel ? 'Notas' : 'Clave Pública (WireGuard)'}</th>
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
                    title={isRadminTunnel ? 'Haz clic para ver la ficha' : 'Haz clic para ver o descargar la configuración'}
                  >
                    <td className="px-6 py-4 font-mono font-bold text-blue-600">
                      <span className="bg-blue-50 border border-blue-100 rounded px-2 py-0.5 text-xs group-hover:border-blue-300 transition">
                        {isRadminTunnel ? `PC ${peer.pcNumber}` : peer.ip}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800 group-hover:text-blue-600 transition">{peer.deviceName}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{peer.userName}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {isRadminTunnel ? (
                        <span className="font-sans truncate max-w-[200px] inline-block" title={peer.notes}>
                          {peer.notes || <span className="text-slate-400 italic">Sin notas</span>}
                        </span>
                      ) : (
                        <span className="truncate max-w-[160px] inline-block bg-slate-50 border border-slate-200 rounded px-2 py-0.5" title={peer.publicKey}>
                          {peer.publicKey}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{peer.createdAt}</td>
                    <td className="px-6 py-4">{renderStatusBadge(peer.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedPeerForConfig(peer)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title={isRadminTunnel ? 'Ver ficha del equipo' : 'Ver y descargar configuración'}
                        >
                          <ServerIcon />
                        </button>
                        {canDelete && (
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
                      {isRadminTunnel
                        ? 'No hay equipos registrados. Haz clic en "Registrar Equipo" para agregar el primero.'
                        : 'No hay equipos registrados en esta VPN. Haz clic en "Crear Nuevo Peer" para generar el primero.'}
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
                {isRadminTunnel ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                    <p className="font-bold">🖥️ Acceso vía Radmin</p>
                    <p>Este túnel no genera claves ni direcciones WireGuard. Solo se guarda la ficha del equipo.</p>
                  </div>
                ) : (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
                    <p className="font-bold">✨ Generación Automática:</p>
                    <p>• La <strong>clave privada y pública</strong> WireGuard se generarán de forma segura.</p>
                    <p>• La IP asignada seguirá el esquema <strong>{selectedTunnel?.addressPrefix}.{selectedCompany.companyNumber}.Y</strong>.</p>
                  </div>
                )}

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
                    {isRadminTunnel ? 'Número de Equipo' : 'Número de PC (Y)'}
                  </label>
                  <input
                    name="manualPcNumber"
                    type="number"
                    min="1"
                    placeholder={
                      isRadminTunnel
                        ? `Sugerido automático: ${nextSuggestedPc}`
                        : `Sugerido automático: ${nextSuggestedPc} (${selectedTunnel?.addressPrefix}.${selectedCompany.companyNumber}.${nextSuggestedPc})`
                    }
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Déjalo vacío para auto-asignar {nextSuggestedPc}. O ingresa un número si este dispositivo ya tiene una IP fija en producción.
                  </p>
                </div>

                {isRadminTunnel && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Notas (Opcional)</label>
                    <textarea
                      name="notes"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Ej. ID de Radmin, contacto, horario de soporte"
                    />
                  </div>
                )}

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
                    {actionLoading
                      ? 'Guardando...'
                      : isRadminTunnel ? 'Registrar Equipo' : 'Generar Túnel y Accesos'}
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
