import React, { useEffect, useMemo, useState } from 'react';
import { BackupDownloadAuditRecord, AuditSummaryStats, User } from '../types';
import { backupDownloadAuditService } from '../services/backupDownloadAuditService';

interface BackupDownloadAuditProps {
  currentUser: User;
  onNavigateToExplorer?: () => void;
}

const AZURE_FREE_TIER_GB = 100;

const BackupDownloadAudit: React.FC<BackupDownloadAuditProps> = ({ currentUser, onNavigateToExplorer }) => {
  const [logs, setLogs] = useState<BackupDownloadAuditRecord[]>([]);
  const [stats, setStats] = useState<AuditSummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [serverFilter, setServerFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadAuditData = async () => {
    setLoading(true);
    setError('');
    try {
      const [auditLogs, summaryStats] = await Promise.all([
        backupDownloadAuditService.getAuditLogs(),
        backupDownloadAuditService.getSummaryStats(),
      ]);
      setLogs(auditLogs);
      setStats(summaryStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los registros de auditoría.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, []);

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, string>();
    for (const l of logs) {
      if (l.userEmail) map.set(l.userEmail, l.userName);
    }
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [logs]);

  const uniqueServers = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l.serverName) set.add(l.serverName);
    return Array.from(set).sort();
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return logs.filter((l) => {
      if (userFilter && l.userEmail !== userFilter && l.userId !== userFilter) return false;
      if (serverFilter && l.serverName !== serverFilter) return false;
      if (dateFrom && l.downloadedAt < dateFrom) return false;
      if (dateTo && l.downloadedAt > dateTo) return false;

      if (q) {
        const fileMatch = l.filename.toLowerCase().includes(q);
        const userMatch = l.userName.toLowerCase().includes(q) || l.userEmail.toLowerCase().includes(q);
        const serverMatch = l.serverName ? l.serverName.toLowerCase().includes(q) : false;
        if (!fileMatch && !userMatch && !serverMatch) return false;
      }
      return true;
    });
  }, [logs, searchTerm, userFilter, serverFilter, dateFrom, dateTo]);

  const monthGb = stats ? stats.monthDownloadBytes / (1024 * 1024 * 1024) : 0;
  const todayGb = stats ? stats.todayDownloadBytes / (1024 * 1024 * 1024) : 0;
  const isOverFreeTier = monthGb > AZURE_FREE_TIER_GB;

  const exportToCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Fecha_Hora', 'Usuario', 'Email', 'Rol', 'Archivo', 'Servidor', 'Bytes', 'GB', 'Estado'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.downloadedAt,
      `"${l.userName}"`,
      l.userEmail,
      l.userRole,
      `"${l.filename}"`,
      l.serverName || '',
      l.filesizeBytes,
      (l.filesizeBytes / (1024 * 1024 * 1024)).toFixed(4),
      l.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Auditoria_Descargas_FTP_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-3xl font-bold text-slate-800">Panel de Auditoría de Descargas</h2>
            <span className="px-2.5 py-1 text-xs font-extrabold bg-amber-100 text-amber-800 rounded-lg">
              Azure Egress Control
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Contabilización en tiempo real de GBs descargados y monitoreo del límite de 100 GB gratuitos de Azure
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onNavigateToExplorer && (
            <button
              onClick={onNavigateToExplorer}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Ir al Explorador /LSOFT
            </button>
          )}
          <button
            onClick={loadAuditData}
            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition shadow-sm flex items-center gap-2 text-sm"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Tarjetas de Métricas de Consumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Consumo Hoy */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Descargado Hoy</p>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">
            {todayGb >= 1 ? `${todayGb.toFixed(2)} GB` : `${(stats ? stats.todayDownloadBytes / (1024 * 1024) : 0).toFixed(1)} MB`}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {stats ? stats.todayCount : 0} descargas realizadas hoy
          </p>
        </div>

        {/* Consumo del Mes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Descargado este Mes</p>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">
            {monthGb.toFixed(2)} GB
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {stats ? stats.monthCount : 0} descargas en el mes en curso
          </p>
        </div>

        {/* Límite 100 GB Azure */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Límite Gratis Azure</p>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl font-bold text-xs">
              100 GB
            </span>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">
            {stats ? stats.monthUsedGbPercentage.toFixed(1) : '0.0'}%
          </p>
          {/* Barra de progreso */}
          <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverFreeTier
                  ? 'bg-red-500'
                  : stats && stats.monthUsedGbPercentage > 75
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, stats ? stats.monthUsedGbPercentage : 0)}%` }}
            />
          </div>
        </div>

        {/* Estimación Costo Azure */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Costo Salida Azure</p>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <p className={`text-2xl font-extrabold mt-2 ${isOverFreeTier ? 'text-red-600' : 'text-emerald-700'}`}>
            ${stats ? stats.azureEstimatedCostUsd.toFixed(2) : '0.00'} USD
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {isOverFreeTier ? 'Costo por excedente > 100 GB' : '✓ 100% dentro del paquete gratuito'}
          </p>
        </div>
      </div>

      {/* Top Usuario & Servidor */}
      {stats && (stats.topUser || stats.topServer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.topUser && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {stats.topUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-900 uppercase tracking-wider">Mayor Consumidor del Mes</p>
                  <p className="font-bold text-slate-800 text-sm">{stats.topUser.name}</p>
                  <p className="text-xs text-slate-500">{stats.topUser.email}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-blue-700">
                  {formatBytes(stats.topUser.bytes)}
                </p>
              </div>
            </div>
          )}

          {stats.topServer && (
            <div className="bg-gradient-to-r from-slate-50 to-gray-100 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  🖥️
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Servidor con Más Descargas</p>
                  <p className="font-bold text-slate-800 text-sm">{stats.topServer.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-slate-800">
                  {formatBytes(stats.topServer.bytes)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tendencia Diaria de Consumo del Mes */}
      {stats && stats.dailyTrend.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <span>📊 Tendencia de Consumo Diario (Mes Actual)</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Días con actividad</span>
          </div>

          <div className="flex items-end gap-2 h-32 pt-4 border-b border-slate-100 overflow-x-auto pb-2">
            {stats.dailyTrend.map((item) => {
              const maxBytes = Math.max(...stats.dailyTrend.map((d) => d.bytes), 1);
              const heightPct = Math.max(12, (item.bytes / maxBytes) * 100);
              return (
                <div key={item.date} className="flex-1 min-w-[36px] flex flex-col items-center gap-1 group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-10">
                    {formatBytes(item.bytes)} ({item.count} descargas)
                  </div>
                  <div
                    className="w-full bg-blue-600 hover:bg-blue-700 rounded-t-lg transition-all"
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[10px] text-slate-400 font-mono rotate-45 origin-left mt-1">
                    {item.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filtros de Auditoría */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por usuario, correo o nombre de archivo..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap gap-2">
          <select
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          >
            <option value="">Todos los usuarios</option>
            {uniqueUsers.map((u) => <option key={u.email} value={u.email}>{u.name} ({u.email})</option>)}
          </select>

          <select
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
          >
            <option value="">Todos los servidores</option>
            {uniqueServers.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            title="Fecha desde"
          />

          <button
            onClick={exportToCSV}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
          >
            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Tabla de Auditoría */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3.5 font-semibold">Fecha y Hora</th>
                <th className="px-4 py-3.5 font-semibold">Usuario</th>
                <th className="px-4 py-3.5 font-semibold">Archivo Descargado</th>
                <th className="px-4 py-3.5 font-semibold">Servidor</th>
                <th className="px-4 py-3.5 font-semibold text-right">Tamaño</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Cargando historial de auditoría de descargas...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    No se registraron descargas con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-600 whitespace-nowrap">
                      {formatDateTime(log.downloadedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {log.userName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <p className="font-bold text-slate-800 text-xs truncate">{log.userName}</p>
                          <p className="text-[11px] text-slate-400 truncate">{log.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800 max-w-xs truncate" title={log.filename}>
                      {log.filename}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg">
                        {log.serverName || 'FTP-General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-extrabold text-blue-700 whitespace-nowrap">
                      {formatBytes(log.filesizeBytes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default BackupDownloadAudit;
