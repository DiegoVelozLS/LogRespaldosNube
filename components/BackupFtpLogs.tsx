import React, { useEffect, useMemo, useRef, useState } from 'react';
import { backupFtpLogService, BackupDatabaseResult, BackupRun, BackupStage } from '../services/backupFtpLogService';

const BackupFtpLogs: React.FC = () => {
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [serverFilter, setServerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<BackupRun | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [rawLog, setRawLog] = useState('');
  const [logLoading, setLogLoading] = useState(false);
  const [showLog, setShowLog] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRuns(await backupFtpLogService.listRuns());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron leer los logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelected(null);
      }
    };
    if (selected) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selected]);

  const servers = useMemo(
    () => Array.from(new Set(runs.map((run) => run.server))).sort((a, b) => a.localeCompare(b, 'es')),
    [runs]
  );

  const normalizedQuery = useMemo(() => normalizeText(searchTerm), [searchTerm]);

  const getMatchingDatabases = (run: BackupRun): BackupDatabaseResult[] => {
    if (!normalizedQuery) return [];
    return run.databases.filter((db) => {
      const nName = normalizeText(db.name);
      const nCompany = db.company ? normalizeText(db.company) : '';
      const identity = splitCompanyAndDatabase(db);
      const nIdComp = normalizeText(identity.company || '');
      const nIdName = normalizeText(identity.database || '');
      return nName.includes(normalizedQuery) || nCompany.includes(normalizedQuery) || nIdComp.includes(normalizedQuery) || nIdName.includes(normalizedQuery);
    });
  };

  const filtered = useMemo(() => {
    return runs.filter((run) => {
      if (serverFilter && run.server !== serverFilter) return false;
      if (statusFilter && run.status !== statusFilter) return false;
      if (dateFrom && run.date < dateFrom) return false;
      if (dateTo && run.date > dateTo) return false;

      if (normalizedQuery) {
        const serverMatch = normalizeText(run.server).includes(normalizedQuery);
        const fileMatch = normalizeText(run.filename).includes(normalizedQuery);
        const dateFormatted = normalizeText(formatDate(run.date));
        const dateMatch = run.date.includes(normalizedQuery) || dateFormatted.includes(normalizedQuery);
        const statusMatch = (run.status === 'success' ? 'exitoso' : 'error con errores').includes(normalizedQuery);
        const matchingDbs = run.databases.some((db) => {
          const nName = normalizeText(db.name);
          const nCompany = db.company ? normalizeText(db.company) : '';
          const identity = splitCompanyAndDatabase(db);
          const nIdComp = normalizeText(identity.company || '');
          const nIdName = normalizeText(identity.database || '');
          return nName.includes(normalizedQuery) || nCompany.includes(normalizedQuery) || nIdComp.includes(normalizedQuery) || nIdName.includes(normalizedQuery);
        });

        if (!serverMatch && !fileMatch && !dateMatch && !statusMatch && !matchingDbs) {
          return false;
        }
      }

      return true;
    });
  }, [runs, serverFilter, statusFilter, dateFrom, dateTo, normalizedQuery]);

  const latestByServer = useMemo(() => {
    const map = new Map<string, BackupRun>();
    for (const run of runs) {
      const current = map.get(run.server);
      if (!current || run.date > current.date || (run.date === current.date && run.startedAt > current.startedAt)) {
        map.set(run.server, run);
      }
    }
    return servers.map((server) => map.get(server)).filter((run): run is BackupRun => !!run);
  }, [runs, servers]);

  const visibleServers = new Set(filtered.map((run) => run.server)).size;
  const successCount = filtered.filter((run) => run.status === 'success').length;
  const errorCount = filtered.filter((run) => run.status === 'error').length;

  const totalMatchingDatabasesCount = useMemo(() => {
    if (!normalizedQuery) return 0;
    return filtered.reduce((acc, run) => acc + getMatchingDatabases(run).length, 0);
  }, [filtered, normalizedQuery]);

  const hasActiveFilters = Boolean(searchTerm || serverFilter || statusFilter || dateFrom || dateTo);

  const resetFilters = () => {
    setSearchTerm('');
    setServerFilter('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const openRun = (run: BackupRun, autoFilter = '') => {
    setSelected(run);
    setModalSearchTerm(autoFilter);
    setRawLog('');
    setShowLog(false);
  };

  const loadRawLog = async () => {
    if (!selected) return;
    const nextShow = !showLog;
    setShowLog(nextShow);
    if (!nextShow || rawLog) return;
    setLogLoading(true);
    try {
      const data = await backupFtpLogService.readLog(selected.filename);
      setRawLog(data.content);
    } catch (err) {
      setRawLog(err instanceof Error ? err.message : 'No se pudo leer el log.');
    } finally {
      setLogLoading(false);
    }
  };

  const downloadLog = async () => {
    if (!selected) return;
    let content = rawLog;
    if (!content) {
      setLogLoading(true);
      try {
        content = (await backupFtpLogService.readLog(selected.filename)).content;
        setRawLog(content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo descargar el log.');
        setLogLoading(false);
        return;
      }
      setLogLoading(false);
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = selected.filename;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Logs de respaldos</h2>
          <p className="text-slate-500">Estado de los respaldos automáticos que llegan al FTP</p>
        </div>
        <button
          onClick={load}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition shadow-sm"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label="Servidores" value={visibleServers} tone="slate" />
        <SummaryCard label="Respaldos exitosos" value={successCount} tone="green" />
        <SummaryCard label="Respaldos con errores" value={errorCount} tone="red" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {latestByServer.map((run) => (
          <button
            key={run.server}
            onClick={() => setServerFilter(serverFilter === run.server ? '' : run.server)}
            className={`text-left bg-white p-5 rounded-2xl border shadow-sm transition ${serverFilter === run.server ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold text-slate-800">{run.server}</p>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-sm text-slate-500 mt-2">Último respaldo: {formatDate(run.date)} {run.startedAt}</p>
            <p className="text-sm text-slate-500">{run.successCount}/{run.databaseCount} bases completas</p>
          </button>
        ))}
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="space-y-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
          {/* Input de búsqueda */}
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
              placeholder="Buscar por empresa, base de datos, servidor, fecha..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                title="Borrar búsqueda"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Filtros desplegables y fechas */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <select
              value={serverFilter}
              onChange={(e) => setServerFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition flex-1 sm:flex-none"
            >
              <option value="">Todos los servidores</option>
              {servers.map((server) => <option key={server} value={server}>{server}</option>)}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              title="Fecha desde"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              title="Fecha hasta"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition flex-1 sm:flex-none"
            >
              <option value="">Todos los estados</option>
              <option value="success">Exitoso</option>
              <option value="error">Con errores</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition whitespace-nowrap"
                title="Restablecer todos los filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Banner Informativo de Coincidencias de Búsqueda */}
        {searchTerm.trim() && !loading && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-600 text-white rounded-xl flex-shrink-0 mt-0.5 shadow-sm shadow-blue-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Resultados para: <span className="text-blue-700 font-extrabold">"{searchTerm}"</span>
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  {filtered.length === 0 ? (
                    'No se encontraron coincidencias en servidores ni bases de datos.'
                  ) : (
                    <>
                      Encontrado en <strong className="text-slate-800">{new Set(filtered.map((r) => r.server)).size} servidor(es)</strong> ({Array.from(new Set(filtered.map((r) => r.server))).join(', ')})
                      {totalMatchingDatabasesCount > 0 && (
                        <span> con <strong className="text-blue-700">{totalMatchingDatabasesCount} base(s) de datos coincidentes</strong></span>
                      )}.
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSearchTerm('')}
              className="self-end md:self-center px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100/80 rounded-xl transition"
            >
              Borrar búsqueda
            </button>
          </div>
        )}
      </div>

      {/* Tabla de registros */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Servidor</th>
                <th className="px-4 py-3 font-semibold">Inicio</th>
                <th className="px-4 py-3 font-semibold">Duración</th>
                <th className="px-4 py-3 font-semibold">Bases</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Cargando logs del FTP...</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <svg className="w-10 h-10 mx-auto text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="font-medium text-slate-600">No se encontraron respaldos</p>
                      <p className="text-xs text-slate-400">Prueba ajustando los términos de búsqueda o los filtros aplicados.</p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="mt-2 inline-block px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 rounded-lg"
                        >
                          Limpiar filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : filtered.map((run) => {
                const matchingDbs = getMatchingDatabases(run);
                const hasDbMatches = matchingDbs.length > 0;

                return (
                  <React.Fragment key={run.filename}>
                    <tr className={`hover:bg-slate-50/80 transition-colors ${hasDbMatches ? 'bg-blue-50/20' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{formatDate(run.date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                          </svg>
                          <span>{run.server}</span>
                        </div>
                        {hasDbMatches && (
                          <div className="text-[11px] text-blue-700 font-medium mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                            <span>{matchingDbs.length} coincidencia(s) encontrada(s) en este servidor</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{run.startedAt || '—'}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDuration(run.durationSeconds)}</td>
                      <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{run.successCount}/{run.databaseCount}</td>
                      <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={run.status} /></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => openRun(run, hasDbMatches ? searchTerm : '')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Ver detalle
                        </button>
                      </td>
                    </tr>

                    {/* Fila expandida con el detalle visual directo de las bases coincidentes */}
                    {hasDbMatches && (
                      <tr className="bg-blue-50/40 border-b border-blue-100/60">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="bg-white rounded-xl p-3 border border-blue-200/70 shadow-xs space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                Bases de datos en el servidor <span className="text-blue-700 font-extrabold">{run.server}</span> ({formatDate(run.date)}):
                              </span>
                              <span className="text-[11px] text-slate-400">Clic en una tarjeta para ver detalle completo</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {matchingDbs.slice(0, 6).map((db, idx) => {
                                const id = splitCompanyAndDatabase(db);
                                const isAllOk = db.backup === 'ok' && db.zip === 'ok' && db.ftp === 'ok';
                                return (
                                  <div
                                    key={idx}
                                    onClick={() => openRun(run, id.company || id.database)}
                                    className="cursor-pointer bg-slate-50/80 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-400 rounded-xl p-2.5 transition flex flex-col justify-between text-xs group"
                                  >
                                    <div>
                                      {id.company && (
                                        <div className="text-[11px] font-bold text-blue-900 truncate flex items-center gap-1">
                                          <span>🏢</span>
                                          <span>{id.company}</span>
                                        </div>
                                      )}
                                      <div className="font-semibold text-slate-800 text-xs truncate mt-0.5 flex items-center gap-1">
                                        <span>💾</span>
                                        <span>{id.database}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-1 mt-2.5 pt-2 border-t border-slate-200/70 text-[11px]">
                                      <span className={`font-bold flex items-center gap-1 ${isAllOk ? 'text-green-700' : 'text-red-600'}`}>
                                        {isAllOk ? (
                                          <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            OK
                                          </>
                                        ) : (
                                          <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                            Error
                                          </>
                                        )}
                                      </span>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                        <span>Bkp: <StageBadge stage={db.backup} /></span>
                                        <span>Zip: <StageBadge stage={db.zip} /></span>
                                        <span>FTP: <StageBadge stage={db.ftp} /></span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {matchingDbs.length > 6 && (
                              <div className="text-right pt-1">
                                <button
                                  onClick={() => openRun(run, searchTerm)}
                                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  + Ver las {matchingDbs.length - 6} base(s) más en el modal de detalle →
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Detalle de Respaldo */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-150"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <div className="truncate">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl font-bold text-slate-800 truncate">{selected.server}</h3>
                    <StatusBadge status={selected.status} />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    {formatDate(selected.date)} · Inicio: {selected.startedAt || '—'} · Duración: {formatDuration(selected.durationSeconds)} · {selected.successCount}/{selected.databaseCount} bases exitosas
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition flex-shrink-0"
                title="Cerrar (Esc)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Barra de acciones de log */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    onClick={loadRawLog}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                      showLog
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {showLog ? 'Ocultar log' : 'Ver log en texto'}
                  </button>
                  <button
                    onClick={downloadLog}
                    className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar .log
                  </button>
                </div>
                <div className="text-xs text-slate-500 font-mono truncate max-w-full">
                  Archivo: <span className="font-semibold text-slate-700">{selected.filename}</span>
                </div>
              </div>

              {/* Visor de log */}
              {showLog && (
                <div className="rounded-xl overflow-hidden border border-slate-800 shadow-inner">
                  <div className="bg-slate-950 px-4 py-2 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span>
                      <span className="ml-2">Registro FTP / Terminal</span>
                    </span>
                    {logLoading && <span className="text-blue-400 animate-pulse">Cargando...</span>}
                  </div>
                  <pre className="max-h-80 overflow-auto bg-slate-900 text-slate-100 text-xs p-4 font-mono whitespace-pre-wrap leading-relaxed">
                    {logLoading ? 'Cargando archivo de log...' : rawLog || 'No se encontró contenido para este archivo.'}
                  </pre>
                </div>
              )}

              {/* Tabla de Bases de Datos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">
                    Detalle de Bases de Datos ({selected.databases.length})
                  </h4>
                </div>
                <DatabaseDetailTable databases={selected.databases} initialSearch={modalSearchTerm} />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-700 transition shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type DetailColumn = 'company' | 'database' | 'backup' | 'zip' | 'ftp';

const DETAIL_COLUMNS: { id: DetailColumn; label: string; defaultWidth: number }[] = [
  { id: 'company', label: 'Empresa', defaultWidth: 220 },
  { id: 'database', label: 'Base', defaultWidth: 180 },
  { id: 'backup', label: 'Backup', defaultWidth: 110 },
  { id: 'zip', label: 'ZIP', defaultWidth: 90 },
  { id: 'ftp', label: 'FTP', defaultWidth: 90 },
];

const COLUMN_ORDER_KEY = 'backup-log-detail-order';
const COLUMN_WIDTH_KEY = 'backup-log-detail-widths';

const DatabaseDetailTable: React.FC<{ databases: BackupDatabaseResult[]; initialSearch?: string }> = ({ databases, initialSearch = '' }) => {
  const [order, setOrder] = useState<DetailColumn[]>(loadColumnOrder);
  const [widths, setWidths] = useState<Record<DetailColumn, number>>(loadColumnWidths);
  const [dbSearch, setDbSearch] = useState(initialSearch);
  const dragId = useRef<DetailColumn | null>(null);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  useEffect(() => {
    setDbSearch(initialSearch);
  }, [initialSearch]);

  const filteredDatabases = useMemo(() => {
    const q = normalizeText(dbSearch);
    if (!q) return databases;
    return databases.filter((db) => {
      const nameMatch = normalizeText(db.name).includes(q);
      const companyMatch = db.company ? normalizeText(db.company).includes(q) : false;
      const identity = splitCompanyAndDatabase(db);
      const idCompMatch = normalizeText(identity.company || '').includes(q);
      const idNameMatch = normalizeText(identity.database || '').includes(q);
      return nameMatch || companyMatch || idCompMatch || idNameMatch;
    });
  }, [databases, dbSearch]);

  const moveColumn = (target: DetailColumn) => {
    const from = dragId.current;
    if (!from || from === target) return;
    setOrder((current) => {
      const next = current.filter((id) => id !== from);
      next.splice(next.indexOf(target), 0, from);
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next));
      return next;
    });
  };

  const startResize = (id: DetailColumn, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startWidth = widthsRef.current[id];
    const previousCursor = document.body.style.cursor;
    const previousSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(72, startWidth + moveEvent.clientX - startX);
      setWidths((current) => {
        const next = { ...current, [id]: nextWidth };
        widthsRef.current = next;
        return next;
      });
    };
    const onUp = () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousSelect;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      localStorage.setItem(COLUMN_WIDTH_KEY, JSON.stringify(widthsRef.current));
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const tableWidth = order.reduce((sum, id) => sum + widths[id], 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-xs text-slate-400">
          Arrastra el título para cambiar el orden. Arrastra el borde derecho para cambiar el ancho.
        </p>
        {databases.length > 3 && (
          <div className="relative min-w-[220px]">
            <input
              type="text"
              value={dbSearch}
              onChange={(e) => setDbSearch(e.target.value)}
              placeholder="Filtrar base de datos / empresa..."
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {dbSearch && (
              <button
                onClick={() => setDbSearch('')}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto border border-slate-100 rounded-xl">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-50 text-slate-500 text-left">
            <tr>
              {order.map((id) => {
                const column = DETAIL_COLUMNS.find((item) => item.id === id)!;
                return (
                  <th key={id} style={{ width: `${(widths[id] / tableWidth) * 100}%` }} className="py-2.5 px-3 font-semibold text-xs uppercase tracking-wider text-slate-600">
                    <div className="relative flex items-center">
                      <span
                        draggable
                        onDragStart={() => { dragId.current = id; }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => moveColumn(id)}
                        className="cursor-grab truncate pr-2"
                        title="Arrastra para reordenar"
                      >
                        {column.label}
                      </span>
                      <span
                        onMouseDown={(event) => startResize(id, event)}
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-300"
                        title="Arrastra para cambiar el ancho"
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredDatabases.length === 0 ? (
              <tr>
                <td colSpan={order.length} className="py-8 text-center text-xs text-slate-400">
                  No se encontraron bases de datos con el filtro aplicado.
                </td>
              </tr>
            ) : (
              filteredDatabases.map((db) => {
                const identity = splitCompanyAndDatabase(db);
                return (
                  <tr key={`${identity.company}|${identity.database}`} className="hover:bg-slate-50/70 transition-colors">
                    {order.map((id) => (
                      <td key={id} className="py-2.5 px-3 truncate">
                        {id === 'company' && <span className="font-medium text-slate-800">{identity.company || '—'}</span>}
                        {id === 'database' && <span className="font-medium text-slate-800">{identity.database}</span>}
                        {id === 'backup' && <StageBadge stage={db.backup} />}
                        {id === 'zip' && <StageBadge stage={db.zip} />}
                        {id === 'ftp' && <StageBadge stage={db.ftp} />}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

function loadColumnOrder(): DetailColumn[] {
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMN_ORDER_KEY) || '[]') as DetailColumn[];
    const known = DETAIL_COLUMNS.map((column) => column.id);
    if (saved.length === known.length && known.every((id) => saved.includes(id))) return saved;
  } catch {
    // Se usa el orden inicial.
  }
  return DETAIL_COLUMNS.map((column) => column.id);
}

function loadColumnWidths(): Record<DetailColumn, number> {
  const defaults = Object.fromEntries(DETAIL_COLUMNS.map((column) => [column.id, column.defaultWidth])) as Record<DetailColumn, number>;
  try {
    const saved = JSON.parse(localStorage.getItem(COLUMN_WIDTH_KEY) || '{}') as Partial<Record<DetailColumn, number>>;
    for (const column of DETAIL_COLUMNS) {
      if (typeof saved[column.id] === 'number' && saved[column.id]! >= 72) defaults[column.id] = saved[column.id]!;
    }
  } catch {
    // Se usan los anchos iniciales.
  }
  return defaults;
}

function splitCompanyAndDatabase(db: BackupDatabaseResult) {
  if (db.company) return { company: db.company, database: db.name };
  const parts = db.name.split(/\s*\|\s*/);
  if (parts.length < 2) return { company: '', database: db.name };
  return { company: parts[0].trim(), database: parts.slice(1).join(' | ').trim() };
}

const SummaryCard: React.FC<{ label: string; value: number; tone: 'slate' | 'green' | 'red' }> = ({ label, value, tone }) => {
  const tones = {
    slate: 'text-slate-800',
    green: 'text-green-700',
    red: 'text-red-700',
  };
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  );
};

const StatusBadge: React.FC<{ status: BackupRun['status'] }> = ({ status }) => (
  status === 'success'
    ? <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Exitoso</span>
    : <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">Con errores</span>
);

const StageBadge: React.FC<{ stage: BackupStage }> = ({ stage }) => {
  if (stage === 'ok') return <span className="text-green-700 font-bold">OK</span>;
  if (stage === 'error') return <span className="text-red-700 font-bold">Error</span>;
  return <span className="text-slate-400">Pendiente</span>;
};

function formatDate(iso: string) {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatDuration(seconds: number) {
  if (!seconds) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} s`;
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default BackupFtpLogs;
