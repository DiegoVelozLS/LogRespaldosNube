import React, { useState, useEffect } from 'react';
import { UserRole, ClientEntry, Server } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';

interface ClientFormData {
    clientName: string;
    clientRuc: string;
    ownerCompany: string;
    ownerRuc: string;
    dbName: string;
    server: string;
    group: string;
    subscriptionActive: boolean;
}

// const MOCK_DATA: ClientEntry[] = [ ... ];

// SERVERS are now dynamic from DB
const SUBSCRIPTIONS = ['Todas', 'Activa', 'Inactiva'];

const INITIAL_FORM_DATA: ClientFormData = {
    clientName: '',
    clientRuc: '',
    ownerCompany: '',
    ownerRuc: '',
    dbName: '',
    server: '', // Selection required
    group: '',
    subscriptionActive: true,
};

interface ClientDirectoryProps {
    role: UserRole;
}

const ClientDirectory: React.FC<ClientDirectoryProps> = ({ role }) => {
    // Pending: lo que el usuario configura
    const [pendingSearch, setPendingSearch] = useState('');
    const [pendingServer, setPendingServer] = useState('Todos');
    const [pendingGroup, setPendingGroup] = useState('Todos');
    const [pendingSub, setPendingSub] = useState('Todas');
    // Applied: lo que realmente filtra la tabla
    const [search, setSearch] = useState('');
    const [filterServer, setFilterServer] = useState('Todos');
    const [filterGroup, setFilterGroup] = useState('Todos');
    const [filterSub, setFilterSub] = useState('Todas');
    const [showForm, setShowForm] = useState(false);
    const [selectedRow, setSelectedRow] = useState<ClientEntry | null>(null);
    const [editingEntry, setEditingEntry] = useState<ClientEntry | null>(null);
    const [formData, setFormData] = useState<ClientFormData>(INITIAL_FORM_DATA);
    const [clients, setClients] = useState<ClientEntry[]>([]);
    const [serverOptions, setServerOptions] = useState<Server[]>([]);
    const [loading, setLoading] = useState(true);

    const isAdmin = role === UserRole.ADMIN;

    useEffect(() => {
        loadClients();
    }, []);

    const loadClients = async () => {
        setLoading(true);
        const [clientsData, serversData] = await Promise.all([
            supabaseDataService.getClients(),
            supabaseDataService.getServers()
        ]);
        setClients(clientsData);
        setServerOptions(serversData);
        setLoading(false);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        let success = false;
        if (editingEntry) {
            success = await supabaseDataService.updateClient(editingEntry.id, formData);
        } else {
            const result = await supabaseDataService.saveClient(formData);
            success = !!result;
        }

        if (success) {
            closeForm();
            loadClients();
        } else {
            alert('Error al guardar el registro');
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('¿Estás seguro de eliminar este registro?')) {
            const success = await supabaseDataService.deleteClient(id);
            if (success) {
                setSelectedRow(null);
                loadClients();
            } else {
                alert('Error al eliminar el registro');
            }
        }
    };

    const handleSearch = () => {
        setSearch(pendingSearch);
        setFilterServer(pendingServer);
        setFilterGroup(pendingGroup);
        setFilterSub(pendingSub);
    };

    const handleClear = () => {
        setPendingSearch(''); setPendingServer('Todos'); setPendingGroup('Todos'); setPendingSub('Todas');
        setSearch(''); setFilterServer('Todos'); setFilterGroup('Todos'); setFilterSub('Todas');
    };

    const openNewForm = () => {
        setEditingEntry(null);
        setFormData(INITIAL_FORM_DATA);
        setShowForm(true);
    };

    const openEditForm = (entry: ClientEntry) => {
        setEditingEntry(entry);
        setFormData({
            clientName: entry.clientName,
            clientRuc: entry.clientRuc,
            ownerCompany: entry.ownerCompany,
            ownerRuc: entry.ownerRuc,
            dbName: entry.dbName,
            server: entry.server,
            group: entry.group,
            subscriptionActive: entry.subscriptionActive,
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingEntry(null);
        setFormData(INITIAL_FORM_DATA);
    };

    const hasActiveFilters = !!(search || filterServer !== 'Todos' || filterGroup !== 'Todos' || filterSub !== 'Todas');

    const dynamicGroups = ['Todos', ...Array.from(new Set(clients.map(e => e.group))).sort()];

    const filtered = clients.filter(e => {
        const matchSearch =
            e.clientName.toLowerCase().includes(search.toLowerCase()) ||
            e.clientRuc.includes(search) ||
            e.ownerCompany.toLowerCase().includes(search.toLowerCase()) ||
            e.dbName.toLowerCase().includes(search.toLowerCase());
        const matchServer = filterServer === 'Todos' || e.server === filterServer;
        const matchGroup = filterGroup === 'Todos' || e.group === filterGroup;
        const matchSub =
            filterSub === 'Todas' ||
            (filterSub === 'Activa' && e.subscriptionActive) ||
            (filterSub === 'Inactiva' && !e.subscriptionActive);
        return matchSearch && matchServer && matchGroup && matchSub;
    });

    const activeCount = clients.filter(e => e.subscriptionActive).length;
    const inactiveCount = clients.filter(e => !e.subscriptionActive).length;

    return (
        <div className="space-y-6 animate-fadeIn">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Directorio de Clientes</h2>
                    <p className="text-slate-500 text-sm mt-1">Gestión de bases de datos y suscripciones</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={openNewForm}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm transition"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nueva Base de Datos
                    </button>
                )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Bases', value: clients.length, color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
                    { label: 'Activas', value: activeCount, color: 'bg-green-50 text-green-700', border: 'border-green-100' },
                    { label: 'Inactivas', value: inactiveCount, color: 'bg-red-50 text-red-600', border: 'border-red-100' },
                    { label: 'Servidores', value: serverOptions.length, color: 'bg-slate-50 text-slate-700', border: 'border-slate-200' },
                ].map(s => (
                    <div key={s.label} className={`rounded-2xl border p-4 ${s.border}`}>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-3xl font-extrabold mt-1 ${s.color.split(' ')[1]}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Buscar por cliente, RUC, base..."
                            value={pendingSearch}
                            onChange={e => setPendingSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                        />
                    </div>

                    {/* Servidor */}
                    <select
                        value={pendingServer}
                        onChange={e => setPendingServer(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700"
                    >
                        <option value="Todos">Todos los servidores</option>
                        {serverOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>

                    {/* Grupo */}
                    <div>
                        <select
                            value={pendingGroup || 'Todos'}
                            onChange={e => setPendingGroup(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700"
                        >
                            {dynamicGroups.map(g => (
                                <option key={g} value={g}>
                                    {g === 'Todos' ? 'Todos los grupos' : `Grupo ${g}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Suscripción */}
                    <div>
                        <select
                            value={pendingSub}
                            onChange={e => setPendingSub(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-slate-700"
                        >
                            {SUBSCRIPTIONS.map(s => (
                                <option key={s} value={s}>
                                    {s === 'Todas' ? 'Todas las suscripciones' : `Suscripción ${s}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Buscar / Limpiar */}
                <div className="flex items-center gap-3 mt-4">
                    <button
                        onClick={handleSearch}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl font-bold text-sm transition shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Buscar
                    </button>
                    {hasActiveFilters && (
                        <button
                            onClick={handleClear}
                            className="flex items-center gap-2 text-slate-500 hover:text-red-600 px-4 py-2 rounded-xl font-semibold text-sm transition border border-slate-200 hover:border-red-200 bg-white"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Limpiar
                        </button>
                    )}
                    <p className="ml-auto text-xs text-slate-400">
                        Mostrando <span className="font-bold text-slate-600">{filtered.length}</span> de {clients.length} registros
                    </p>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Cliente', 'RUC Cliente', 'Empresa Dueña', 'RUC Dueña', 'Base de Datos', 'Servidor', 'Grupo', 'Suscripción'].map(h => (
                                    <th key={h} className="px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center py-16 text-slate-400 italic">
                                        No se encontraron registros con los filtros aplicados.
                                    </td>
                                </tr>
                            ) : filtered.map(entry => (
                                <tr
                                    key={entry.id}
                                    onClick={() => setSelectedRow(entry)}
                                    className="hover:bg-blue-50/40 transition cursor-pointer"
                                >
                                    <td className="px-5 py-4">
                                        <p className="font-semibold text-slate-800">{entry.clientName}</p>
                                    </td>
                                    <td className="px-5 py-4 text-slate-500 font-mono text-xs">{entry.clientRuc}</td>
                                    <td className="px-5 py-4 text-slate-700">{entry.ownerCompany}</td>
                                    <td className="px-5 py-4 text-slate-500 font-mono text-xs">{entry.ownerRuc}</td>
                                    <td className="px-5 py-4">
                                        <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{entry.dbName}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded-lg">{entry.server}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-1 rounded-lg">{entry.group}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        {entry.subscriptionActive ? (
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-green-700">
                                                <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"></span>
                                                Activa
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                                                <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                                                Inactiva
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detail panel (click on row) */}
            {selectedRow && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedRow(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className={`px-6 py-4 flex items-center justify-between ${selectedRow.subscriptionActive ? 'bg-green-50 border-b border-green-100' : 'bg-red-50 border-b border-red-100'}`}>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{selectedRow.clientName}</h3>
                                <p className="text-xs text-slate-500 font-mono">{selectedRow.dbName}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedRow.subscriptionActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {selectedRow.subscriptionActive ? '✅ Activa' : '❌ Inactiva'}
                                </span>
                                <button onClick={() => setSelectedRow(null)} className="text-slate-400 hover:text-slate-700 transition">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-2 gap-4">
                            {[
                                { label: 'RUC Cliente', value: selectedRow.clientRuc },
                                { label: 'Empresa Dueña', value: selectedRow.ownerCompany },
                                { label: 'RUC Dueña', value: selectedRow.ownerRuc },
                                { label: 'Base de Datos', value: selectedRow.dbName },
                                { label: 'Servidor', value: selectedRow.server },
                                { label: 'Grupo', value: selectedRow.group },
                            ].map(field => (
                                <div key={field.label}>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{field.label}</p>
                                    <p className="text-sm font-semibold text-slate-800 mt-0.5 font-mono">{field.value}</p>
                                </div>
                            ))}
                        </div>
                        {isAdmin && (
                            <div className="px-6 pb-6 flex flex-col gap-3">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            if (!selectedRow) return;
                                            const rowToEdit = selectedRow;
                                            setSelectedRow(null);
                                            openEditForm(rowToEdit);
                                        }}
                                        className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition text-sm flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Editar Registro
                                    </button>
                                    <button
                                        onClick={() => handleDelete(selectedRow.id)}
                                        className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl font-bold hover:bg-red-100 transition text-sm border border-red-200 flex items-center justify-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Eliminar Registro
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedRow(null)}
                                    className="w-full bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold hover:bg-slate-200 transition text-sm"
                                >
                                    Cerrar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New/Edit DB Form Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeForm}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{editingEntry ? 'Editar Base de Datos' : 'Nueva Base de Datos'}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{editingEntry ? 'Actualiza los datos del registro seleccionado' : 'Ingresa los datos del cliente y la base'}</p>
                            </div>
                            <button onClick={closeForm} className="text-slate-400 hover:text-slate-700 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre del Cliente</label>
                                    <input value={formData.clientName} onChange={e => setFormData(prev => ({ ...prev, clientName: e.target.value }))} placeholder="Ej: Comercial Torres" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">RUC del Cliente</label>
                                    <input value={formData.clientRuc} onChange={e => setFormData(prev => ({ ...prev, clientRuc: e.target.value }))} placeholder="Ej: 1792345678001" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Empresa Dueña</label>
                                    <input value={formData.ownerCompany} onChange={e => setFormData(prev => ({ ...prev, ownerCompany: e.target.value }))} placeholder="Ej: Torres & Asociados S.A." className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">RUC Empresa Dueña</label>
                                    <input value={formData.ownerRuc} onChange={e => setFormData(prev => ({ ...prev, ownerRuc: e.target.value }))} placeholder="Ej: 1792345678001" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Nombre de la Base de Datos</label>
                                    <input value={formData.dbName} onChange={e => setFormData(prev => ({ ...prev, dbName: e.target.value }))} placeholder="Ej: db_cliente_prod" className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-mono outline-none" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Servidor</label>
                                    <select
                                        value={formData.server}
                                        onChange={e => setFormData(prev => ({ ...prev, server: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                                        required
                                    >
                                        <option value="" disabled>Seleccionar servidor...</option>
                                        {serverOptions.map(s => (
                                            <option key={s.id} value={s.name}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Grupo</label>
                                    <input
                                        value={formData.group}
                                        onChange={e => setFormData(prev => ({ ...prev, group: e.target.value }))}
                                        placeholder="Ej: 0001"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">Suscripción</label>
                                    <select value={formData.subscriptionActive ? 'true' : 'false'} onChange={e => setFormData(prev => ({ ...prev, subscriptionActive: e.target.value === 'true' }))} className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-700">
                                        <option value="true">✅ Activa</option>
                                        <option value="false">❌ Inactiva</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 pb-6 flex gap-3">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition text-sm"
                            >
                                {editingEntry ? 'Actualizar Base de Datos' : 'Guardar Base de Datos'}
                            </button>
                            <button onClick={closeForm} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition text-sm">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientDirectory;
