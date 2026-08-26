import React, { useState } from 'react';

// --- Interfaces & Mock Data ---

export interface Peer {
  id: string;
  companyId: string;
  ip: string;
  deviceName: string;
  user: string;
  publicKey: string;
  status: 'Activo' | 'Inactivo';
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  group: string;
  vpnNumber: string;
  vpnRange: string;
  pcCount: number;
  status: 'Activo' | 'Inactivo' | 'Mantenimiento';
  peers: Peer[];
}

const MOCK_DATA: Company[] = [
  {
    id: '1',
    name: 'Tech Solutions SA',
    group: 'Grupo TS',
    vpnNumber: 'VPN-100',
    vpnRange: '10.0.5.0/24',
    pcCount: 2,
    status: 'Activo',
    peers: [
      {
        id: 'p1',
        companyId: '1',
        ip: '10.0.5.2',
        deviceName: 'DESKTOP-TS-01',
        user: 'jrodriguez',
        publicKey: 'pub_key_xyz123',
        status: 'Activo',
        createdAt: '2026-08-01',
      },
      {
        id: 'p2',
        companyId: '1',
        ip: '10.0.5.3',
        deviceName: 'LAPTOP-TS-02',
        user: 'msmith',
        publicKey: 'pub_key_abc987',
        status: 'Inactivo',
        createdAt: '2026-08-02',
      }
    ],
  },
  {
    id: '2',
    name: 'Logistics Pro',
    group: 'Logistics Inc',
    vpnNumber: 'VPN-101',
    vpnRange: '10.0.6.0/24',
    pcCount: 0,
    status: 'Activo',
    peers: [],
  },
];

// --- Icons ---
const SearchIcon = () => (
  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);
const EyeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

// --- Component ---

const VpnManagement: React.FC = () => {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [companies, setCompanies] = useState<Company[]>(MOCK_DATA);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [isNewPeerModalOpen, setIsNewPeerModalOpen] = useState(false);
  
  // New Peer Creation State
  const [newPeerConfig, setNewPeerConfig] = useState<{ ip: string, clientConfig: string, serverConfig: string } | null>(null);

  const selectedCompany = companies.find(c => c.id === selectedCompanyId);

  // --- Handlers ---
  
  const handleViewDetails = (id: string) => {
    setSelectedCompanyId(id);
    setView('detail');
    setNewPeerConfig(null);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedCompanyId(null);
  };

  const handleCreateCompany = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newCompany: Company = {
      id: Math.random().toString(36).substr(2, 9),
      name: formData.get('name') as string,
      group: formData.get('group') as string,
      vpnNumber: `VPN-${Math.floor(Math.random() * 900) + 100}`,
      vpnRange: `10.0.${Math.floor(Math.random() * 255)}.0/24`,
      pcCount: 0,
      status: formData.get('status') as Company['status'],
      peers: [],
    };

    setCompanies([...companies, newCompany]);
    setIsNewCompanyModalOpen(false);
  };

  const handleCreatePeer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCompany) return;
    
    const formData = new FormData(e.currentTarget);
    const baseRange = selectedCompany.vpnRange.replace('.0/24', '');
    const nextIpEnd = selectedCompany.peers.length + 2; // naive allocation
    const assignedIp = `${baseRange}.${nextIpEnd}`;
    
    const deviceName = formData.get('deviceName') as string;
    const user = formData.get('user') as string;
    const publicKey = formData.get('publicKey') as string;

    const newPeer: Peer = {
      id: Math.random().toString(36).substr(2, 9),
      companyId: selectedCompany.id,
      ip: assignedIp,
      deviceName,
      user,
      publicKey,
      status: 'Activo',
      createdAt: new Date().toISOString().split('T')[0],
    };

    // Update company state
    const updatedCompany = {
      ...selectedCompany,
      pcCount: selectedCompany.pcCount + 1,
      peers: [...selectedCompany.peers, newPeer]
    };

    setCompanies(companies.map(c => c.id === updatedCompany.id ? updatedCompany : c));
    
    // Generate config strings
    const clientConfig = `[Interface]
PrivateKey = (Generada en el cliente)
Address = ${assignedIp}/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = (Server Public Key)
Endpoint = vpn.midominio.com:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25`;

    const serverConfig = `[Peer]
# ${deviceName} - ${user}
PublicKey = ${publicKey}
AllowedIPs = ${assignedIp}/32`;

    setNewPeerConfig({ ip: assignedIp, clientConfig, serverConfig });
    setIsNewPeerModalOpen(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // --- Renderers ---

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Activo':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">Activo</span>;
      case 'Inactivo':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold border border-red-200">Inactivo</span>;
      case 'Mantenimiento':
        return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold border border-amber-200">Mantenimiento</span>;
      default:
        return <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold border border-slate-200">{status}</span>;
    }
  };

  if (view === 'list') {
    const filteredCompanies = companies.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.group.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-800">Gestión VPN WireGuard</h2>
            <p className="text-slate-500 mt-1">Administración de clientes y accesos remotos seguros.</p>
          </div>
          <button 
            onClick={() => setIsNewCompanyModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-sm"
          >
            <PlusIcon />
            Nueva Empresa
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon />
              </div>
              <input
                type="text"
                placeholder="Buscar por empresa o grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">Grupo Empresa</th>
                  <th className="px-6 py-4">Número VPN</th>
                  <th className="px-6 py-4">Rango VPN</th>
                  <th className="px-6 py-4 text-center">Nº PCs</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredCompanies.map(company => (
                  <tr key={company.id} className="hover:bg-slate-50 transition duration-150">
                    <td className="px-6 py-4 font-bold text-slate-800">{company.name}</td>
                    <td className="px-6 py-4 text-slate-600">{company.group}</td>
                    <td className="px-6 py-4 font-medium text-blue-600">{company.vpnNumber}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 bg-slate-100 rounded px-2 py-1 inline-block mt-3">{company.vpnRange}</td>
                    <td className="px-6 py-4 text-center font-medium text-slate-700">{company.pcCount}</td>
                    <td className="px-6 py-4">{renderStatusBadge(company.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleViewDetails(company.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition group"
                        title="Ver detalles"
                      >
                        <EyeIcon />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCompanies.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-slate-500 font-medium">
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
                <h2 className="text-xl font-bold text-slate-800">Registrar Nueva Empresa</h2>
                <button onClick={() => setIsNewCompanyModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <CloseIcon />
                </button>
              </div>
              <form onSubmit={handleCreateCompany} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre de Empresa</label>
                  <input name="name" type="text" required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Listosoft Cia. Ltda." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Grupo Empresa</label>
                  <input name="group" type="text" required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. Corporación X" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Estado Inicial</label>
                  <select name="status" className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsNewCompanyModalOpen(false)} className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition">Guardar Empresa</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'detail' && selectedCompany) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleBackToList}
            className="p-2 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 rounded-xl transition shadow-sm"
          >
            <BackIcon />
          </button>
          <div>
            <h2 className="text-3xl font-bold text-slate-800">{selectedCompany.name}</h2>
            <p className="text-slate-500 mt-1">Detalles de la red VPN</p>
          </div>
        </div>

        {/* Company Detail Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Grupo</p>
              <p className="font-medium text-slate-800">{selectedCompany.group}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Identificador</p>
              <p className="font-bold text-blue-600">{selectedCompany.vpnNumber}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Rango IP</p>
              <p className="font-mono text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block">{selectedCompany.vpnRange}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Total PCs</p>
              <p className="font-bold text-slate-800">{selectedCompany.pcCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1 font-bold">Estado</p>
              <div className="mt-1">{renderStatusBadge(selectedCompany.status)}</div>
            </div>
          </div>
        </div>

        {/* Action result: Code blocks */}
        {newPeerConfig && (
          <div className="bg-blue-50 border border-blue-200 p-6 rounded-2xl shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  <span className="bg-blue-100 text-blue-600 p-1 rounded-lg">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </span>
                  Peer Generado Exitosamente
                </h3>
                <p className="text-slate-600 mt-1">IP Asignada: <strong className="text-slate-900 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">{newPeerConfig.ip}</strong></p>
              </div>
              <button onClick={() => setNewPeerConfig(null)} className="text-slate-400 hover:text-slate-600 transition">
                <CloseIcon />
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Configuración Servidor</span>
                  <button onClick={() => copyToClipboard(newPeerConfig.serverConfig)} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-100 shadow-sm transition">
                    <CopyIcon /> Copiar
                  </button>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                  <pre className="text-xs text-green-400 font-mono leading-relaxed"><code>{newPeerConfig.serverConfig}</code></pre>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase tracking-wider text-slate-500 font-bold">Configuración Cliente</span>
                  <button onClick={() => copyToClipboard(newPeerConfig.clientConfig)} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-100 shadow-sm transition">
                    <CopyIcon /> Copiar
                  </button>
                </div>
                <div className="bg-slate-800 rounded-xl p-4 overflow-x-auto shadow-inner">
                  <pre className="text-xs text-blue-300 font-mono leading-relaxed"><code>{newPeerConfig.clientConfig}</code></pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Peers Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-800">Equipos (Peers)</h3>
            <button 
              onClick={() => setIsNewPeerModalOpen(true)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl font-bold transition shadow-sm"
            >
              <PlusIcon />
              Crear Peer
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">IP</th>
                  <th className="px-6 py-4">Equipo</th>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Public Key</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {selectedCompany.peers.map(peer => (
                  <tr key={peer.id} className="hover:bg-slate-50 transition duration-150">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600">{peer.ip}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">{peer.deviceName}</td>
                    <td className="px-6 py-4 text-slate-600 font-medium">{peer.user}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 truncate max-w-[150px] bg-slate-50 rounded px-2" title={peer.publicKey}>{peer.publicKey}</td>
                    <td className="px-6 py-4 text-slate-500">{peer.createdAt}</td>
                    <td className="px-6 py-4">{renderStatusBadge(peer.status)}</td>
                  </tr>
                ))}
                {selectedCompany.peers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500 font-medium">
                      No hay equipos registrados en esta VPN.
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
                <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Equipo</h2>
                <button onClick={() => setIsNewPeerModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <CloseIcon />
                </button>
              </div>
              <form onSubmit={handleCreatePeer} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Nombre del Equipo</label>
                  <input name="deviceName" type="text" required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. LAPTOP-JUAN" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Usuario Asignado</label>
                  <input name="user" type="text" required className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej. jperez" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Public Key (Cliente)</label>
                  <input name="publicKey" type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm" placeholder="Ej. p3Kb..." />
                  <p className="text-xs text-slate-500 mt-2 font-medium">Clave pública generada en la aplicación cliente de WireGuard.</p>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsNewPeerModalOpen(false)} className="flex-1 px-4 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition">Cancelar</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition">Generar Accesos</button>
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
