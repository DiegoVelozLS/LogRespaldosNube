import React, { useEffect, useMemo, useState } from 'react';
import { AzCopySyncRun, LimpiezaRun, LimpiezaCandidateItem, AzCopyFileDetailResult, AzCopyFileItem } from '../types';
import { syncCleanLogService } from '../services/syncCleanLogService';

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const SyncCleanLogs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sync' | 'clean'>('sync');
  const [azRuns, setAzRuns] = useState<AzCopySyncRun[]>([]);
  const [limpiezaRuns, setLimpiezaRuns] = useState<LimpiezaRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros Sincronización
  const [syncSearch, setSyncSearch] = useState('');
  const [syncStatusFilter, setSyncStatusFilter] = useState('ALL');
  const [syncDateFrom, setSyncDateFrom] = useState('');
  const [syncDateTo, setSyncDateTo] = useState('');

  // Filtros Limpieza
  const [cleanSearch, setCleanSearch] = useState('');
  const [cleanModeFilter, setCleanModeFilter] = useState('ALL');

  // Modales
  const [selectedAzRun, setSelectedAzRun] = useState<AzCopySyncRun | null>(null);
  const [selectedLimpiezaRun, setSelectedLimpiezaRun] = useState<LimpiezaRun | null>(null);
  const [modalTab, setModalTab] = useState<'files' | 'summary' | 'details' | 'omitted' | 'raw'>('files');
  const [azFilesResult, setAzFilesResult] = useState<AzCopyFileDetailResult | null>(null);
  const [loadingAzFiles, setLoadingAzFiles] = useState(false);
  const [azFilesSearch, setAzFilesSearch] = useState('');
  const [azFilesStatusFilter, setAzFilesStatusFilter] = useState<'ALL' | 'completed' | 'failed'>('ALL');
  const [rawContent, setRawContent] = useState('');
  const [loadingRaw, setLoadingRaw] = useState(false);
  const [companySearch, setCompanySearch] = useState('');
  const [candidateItems, setCandidateItems] = useState<LimpiezaCandidateItem[]>([]);
  const [omittedFiles, setOmittedFiles] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await syncCleanLogService.listLogs();
      setAzRuns(res.azCopyRuns);
      setLimpiezaRuns(res.limpiezaRuns);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al consultar logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modal Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedAzRun(null);
        setSelectedLimpiezaRun(null);
      }
    };
    if (selectedAzRun || selectedLimpiezaRun) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedAzRun, selectedLimpiezaRun]);

  // Cargar contenido crudo al abrir modal
  const openAzRunModal = async (run: AzCopySyncRun, autoFilter = '') => {
    setSelectedAzRun(run);
    setModalTab('files');
    setAzFilesSearch(autoFilter);
    setAzFilesStatusFilter('ALL');
    setAzFilesResult(null);
    setRawContent('');
    setLoadingAzFiles(true);
    setLoadingRaw(true);

    syncCleanLogService
      .getAzCopyFileDetails(run.jobId, run.filename, run.logPath)
      .then((res) => setAzFilesResult(res))
      .catch((err) => {
        setAzFilesResult({
          success: false,
          notFound: true,
          message: err instanceof Error ? err.message : 'Error al obtener archivos respaldados.',
          files: [],
          totalCompleted: 0,
          totalFailed: 0,
        });
      })
      .finally(() => setLoadingAzFiles(false));

    syncCleanLogService
      .readLog(run.filename)
      .then((content) => setRawContent(content))
      .catch(() => setRawContent('No se pudo cargar el archivo completo.'))
      .finally(() => setLoadingRaw(false));
  };

  const filteredAzFiles = useMemo(() => {
    if (!azFilesResult?.files) return [];
    const q = azFilesSearch.trim().toLowerCase();
    return azFilesResult.files.filter((file) => {
      if (azFilesStatusFilter !== 'ALL' && file.status !== azFilesStatusFilter) return false;
      if (q) {
        const matchName = file.fileName.toLowerCase().includes(q);
        const matchComp = file.company.toLowerCase().includes(q);
        if (!matchName && !matchComp) return false;
      }
      return true;
    });
  }, [azFilesResult, azFilesSearch, azFilesStatusFilter]);

  const openLimpiezaModal = async (run: LimpiezaRun, autoFilter = '') => {
    setSelectedLimpiezaRun(run);
    setModalTab(autoFilter ? 'details' : 'summary');
    setCompanySearch(autoFilter);
    setCandidateItems([]);
    setOmittedFiles([]);
    setRawContent('');
    setLoadingRaw(true);
    try {
      const content = await syncCleanLogService.readLog(run.filename);
      setRawContent(content);
      const items = syncCleanLogService.parseLimpiezaDetails(content, run.isDryRun);
      setCandidateItems(items);
      const omitted = syncCleanLogService.parseOmittedFiles(content);
      setOmittedFiles(omitted);
    } catch {
      setRawContent('No se pudo cargar el archivo completo.');
    } finally {
      setLoadingRaw(false);
    }
  };

  const handleCopyLog = () => {
    if (!rawContent) return;
    navigator.clipboard.writeText(rawContent);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Métricas
  const latestSync = azRuns[0];
  const activeSyncJob = azRuns.find((r) => r.status === 'in_progress');
  const totalSyncBytes = azRuns.reduce((sum, r) => sum + r.bytesTransferred, 0);
  const latestLimpieza = limpiezaRuns[0];

  // Filtros AzCopy Inteligente (busca en metadatos, estado, fechas y dentro del contenido/empresas del log)
  const filteredAzRuns = useMemo(() => {
    const q = normalizeText(syncSearch);
    return azRuns.filter((r) => {
      if (syncStatusFilter !== 'ALL' && r.status !== syncStatusFilter) return false;
      if (syncDateFrom && r.startedAt < syncDateFrom) return false;
      if (syncDateTo && r.startedAt > syncDateTo) return false;
      if (q) {
        const matchesFile = normalizeText(r.filename).includes(q);
        const matchesJob = normalizeText(r.jobId).includes(q);
        const matchesDate = normalizeText(r.startedAt).includes(q) || normalizeText(formatDateTime(r.startedAt)).includes(q);
        const statusText = r.status === 'completed' ? 'exitoso completado' : r.status === 'in_progress' ? 'en progreso activo' : 'fallido error con errores';
        const matchesStatus = normalizeText(statusText).includes(q);
        const matchesCompanies = r.companies?.some((c) => normalizeText(c).includes(q));
        if (!matchesFile && !matchesJob && !matchesDate && !matchesStatus && !matchesCompanies) return false;
      }
      return true;
    });
  }, [azRuns, syncSearch, syncStatusFilter, syncDateFrom, syncDateTo]);

  // Filtros Limpieza Inteligente (busca en fechas, modo, configuración y dentro del contenido del log: empresas/RUCs)
  const filteredLimpiezaRuns = useMemo(() => {
    const q = normalizeText(cleanSearch);
    return limpiezaRuns.filter((r) => {
      if (cleanModeFilter === 'DRY_RUN' && !r.isDryRun) return false;
      if (cleanModeFilter === 'REAL' && r.isDryRun) return false;
      if (q) {
        const matchesFile = normalizeText(r.filename).includes(q);
        const matchesDate = normalizeText(r.startedAt).includes(q) || normalizeText(formatDateTime(r.startedAt)).includes(q);
        const modeText = r.isDryRun ? 'vista previa simulacion no se borra' : 'borrado real efectivo';
        const matchesMode = normalizeText(modeText).includes(q);
        const configText = `txt ${r.config.txt} normal ${r.config.normal} general ${r.config.general}`;
        const matchesConfig = normalizeText(configText).includes(q);
        const matchingCompanies = r.candidateCompanies?.filter((c) => normalizeText(c).includes(q)) || [];
        const matchesCompany = matchingCompanies.length > 0;
        if (!matchesFile && !matchesDate && !matchesMode && !matchesConfig && !matchesCompany) return false;
      }
      return true;
    });
  }, [limpiezaRuns, cleanSearch, cleanModeFilter]);

  // Filtro de candidatos por empresa dentro del modal
  const filteredCandidates = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    if (!q) return candidateItems;
    return candidateItems.filter(
      (c) => c.company.toLowerCase().includes(q) || c.filename.toLowerCase().includes(q) || c.type.toLowerCase().includes(q)
    );
  }, [candidateItems, companySearch]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-3xl font-bold text-slate-800">Control FTPS y Azure Blob</h2>
            <span className="px-2.5 py-1 text-xs font-extrabold bg-blue-100 text-blue-800 rounded-lg">
              Sincronización & Limpieza
            </span>
          </div>
          <p className="text-slate-500 mt-1">
            Monitoreo en tiempo real de subidas hacia Azure Blob Storage y tareas programadas de retención y limpieza
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition shadow-sm flex items-center gap-2 text-sm self-start sm:self-auto disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar Logs
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Tarjetas de Métricas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Última Sincronización */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Sincronización</p>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-slate-800">
              {latestSync ? formatBytes(latestSync.bytesTransferred) : '0 GB'}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{latestSync ? latestSync.transfersCompleted.toLocaleString() : 0}</span> archivos transferidos
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {latestSync ? formatDateTime(latestSync.startedAt) : 'Sin registros'}
            </p>
          </div>
        </div>

        {/* Trabajo Activo o Estado */}
        <div className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden ${activeSyncJob ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sincronización en Vivo</p>
            <span className={`p-2 rounded-xl ${activeSyncJob ? 'bg-amber-100 text-amber-700 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </span>
          </div>
          <div className="mt-2">
            {activeSyncJob ? (
              <>
                <p className="text-2xl font-extrabold text-amber-900 flex items-center gap-2">
                  <span>{activeSyncJob.percent ? `${activeSyncJob.percent.toFixed(1)}%` : 'En progreso'}</span>
                  <span className="text-xs font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full animate-pulse">ACTIVO</span>
                </p>
                <div className="w-full bg-amber-200/60 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${activeSyncJob.percent || 50}%` }}
                  />
                </div>
                <p className="text-[11px] text-amber-800 mt-1.5">
                  {activeSyncJob.transfersCompleted.toLocaleString()} de {activeSyncJob.totalTransfers.toLocaleString()} archivos copiados
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-emerald-700 flex items-center gap-2">
                  Al Día
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </p>
                <p className="text-xs text-slate-500 mt-1">No hay transferencias activas ahora</p>
                <p className="text-[11px] text-slate-400 mt-1">AzCopy en reposo</p>
              </>
            )}
          </div>
        </div>

        {/* Última Limpieza */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Última Limpieza</p>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-purple-900">
              {latestLimpieza ? `${(latestLimpieza.totalMbToFree / 1024).toFixed(2)} GB` : '0 GB'}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${latestLimpieza?.isDryRun ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                {latestLimpieza?.isDryRun ? 'Simulación' : 'Borrado Real'}
              </span>
              <span className="text-xs text-slate-500">
                {latestLimpieza ? (latestLimpieza.isDryRun ? latestLimpieza.totalCandidates : latestLimpieza.totalDeleted).toLocaleString() : 0} archivos
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {latestLimpieza ? formatDateTime(latestLimpieza.startedAt) : 'Sin registros'}
            </p>
          </div>
        </div>

        {/* Total Histórico Azure */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Acumulado Azure</p>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
              </svg>
            </span>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-extrabold text-indigo-900">
              {formatBytes(totalSyncBytes)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              En <span className="font-bold text-slate-700">{azRuns.length}</span> sincronizaciones registradas
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Almacenamiento Azure Blob</p>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas Principales */}
      <div className="border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('sync')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2.5 ${
              activeTab === 'sync'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Sincronizaciones Azure Blob (AzCopy)
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'sync' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
              {azRuns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('clean')}
            className={`px-5 py-3 font-bold text-sm border-b-2 transition flex items-center gap-2.5 ${
              activeTab === 'clean'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Limpiezas y Eliminaciones (PowerShell)
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'clean' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'}`}>
              {limpiezaRuns.length}
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECCIÓN 1: AZCOPY SYNCS                                  */}
      {/* ========================================================= */}
      {activeTab === 'sync' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={syncSearch}
                onChange={(e) => setSyncSearch(e.target.value)}
                placeholder="Buscar por nombre de archivo o Job ID..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {syncSearch && (
                <button onClick={() => setSyncSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-2">
              <select
                value={syncStatusFilter}
                onChange={(e) => setSyncStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              >
                <option value="ALL">Todos los estados</option>
                <option value="completed">Completados</option>
                <option value="completed_with_errors">Con errores</option>
                <option value="in_progress">En progreso</option>
                <option value="failed">Fallidos</option>
              </select>

              <input
                type="date"
                value={syncDateFrom}
                onChange={(e) => setSyncDateFrom(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                title="Fecha desde"
              />

              <input
                type="date"
                value={syncDateTo}
                onChange={(e) => setSyncDateTo(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                title="Fecha hasta"
              />
            </div>
          </div>

          {/* Tabla AzCopy */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Fecha y Hora</th>
                    <th className="px-4 py-3.5 font-semibold">Estado</th>
                    <th className="px-4 py-3.5 font-semibold">Archivos Transferidos</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Volumen</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Duración</th>
                    <th className="px-4 py-3.5 font-semibold">Archivo Log</th>
                    <th className="px-4 py-3.5 font-semibold text-center w-28">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Leyendo logs de sincronización desde el servidor FTPS...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredAzRuns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        No se encontraron registros de sincronización con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredAzRuns.map((run) => {
                      const q = normalizeText(syncSearch);
                      const matchingCompanies = q && run.companies ? run.companies.filter((c) => normalizeText(c).includes(q)) : [];
                      const hasCompanyMatch = matchingCompanies.length > 0;

                      return (
                        <tr
                          key={run.id}
                          onClick={() => openAzRunModal(run, hasCompanyMatch ? syncSearch : '')}
                          className={`cursor-pointer transition-colors ${hasCompanyMatch ? 'bg-blue-50/30 hover:bg-blue-50/60' : 'hover:bg-slate-50/80'}`}
                          title="Haz clic para ver el detalle completo de este respaldo"
                        >
                          <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                            {formatDateTime(run.startedAt)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {renderAzStatusBadge(run)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">
                                {run.transfersCompleted.toLocaleString()}
                              </span>
                              <span className="text-slate-400">/</span>
                              <span className="text-slate-600">{run.totalTransfers.toLocaleString()}</span>
                              {run.transfersFailed > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-md">
                                  {run.transfersFailed} fallido{run.transfersFailed > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-blue-700 whitespace-nowrap">
                            {formatBytes(run.bytesTransferred)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-600 whitespace-nowrap">
                            {run.durationMinutes > 0 ? `${run.durationMinutes.toFixed(1)} min` : '< 1 min'}
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-mono text-xs max-w-xs">
                            <div className="truncate" title={run.filename}>{run.filename}</div>
                            {hasCompanyMatch && (
                              <div className="text-[11px] text-blue-700 font-medium mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 inline-block"></span>
                                <span>Coincidencia dentro del log: {matchingCompanies.slice(0, 2).join(', ')}{matchingCompanies.length > 2 ? '...' : ''}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAzRunModal(run, hasCompanyMatch ? syncSearch : '');
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                            >
                              Ver Detalle
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SECCIÓN 2: LIMPIEZAS POWERSHELL                           */}
      {/* ========================================================= */}
      {activeTab === 'clean' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Barra de Filtros */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={cleanSearch}
                onChange={(e) => setCleanSearch(e.target.value)}
                placeholder="Buscar por archivo de limpieza o fecha..."
                className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
              />
              {cleanSearch && (
                <button onClick={() => setCleanSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              )}
            </div>

            <select
              value={cleanModeFilter}
              onChange={(e) => setCleanModeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
            >
              <option value="ALL">Todos los modos</option>
              <option value="DRY_RUN">Simulaciones (Vista Previa)</option>
              <option value="REAL">Borrados Reales</option>
            </select>
          </div>

          {/* Tabla Limpieza */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-left border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3.5 font-semibold">Fecha y Hora</th>
                    <th className="px-4 py-3.5 font-semibold">Modo de Ejecución</th>
                    <th className="px-4 py-3.5 font-semibold">Archivos a Retirar / Borrados</th>
                    <th className="px-4 py-3.5 font-semibold text-right">Espacio a Liberar</th>
                    <th className="px-4 py-3.5 font-semibold">Regla de Retención</th>
                    <th className="px-4 py-3.5 font-semibold">Archivo Log</th>
                    <th className="px-4 py-3.5 font-semibold text-center w-36">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-2">
                          <svg className="w-6 h-6 animate-spin text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Leyendo logs de limpieza y eliminación...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLimpiezaRuns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        No se encontraron registros de limpieza con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredLimpiezaRuns.map((run) => {
                      const q = normalizeText(cleanSearch);
                      const matchingCompanies = q && run.candidateCompanies ? run.candidateCompanies.filter((c) => normalizeText(c).includes(q)) : [];
                      const hasCompanyMatch = matchingCompanies.length > 0;

                      return (
                        <tr
                          key={run.id}
                          onClick={() => openLimpiezaModal(run, hasCompanyMatch ? cleanSearch : '')}
                          className={`cursor-pointer transition-colors ${hasCompanyMatch ? 'bg-purple-50/30 hover:bg-purple-50/60' : 'hover:bg-slate-50/80'}`}
                          title="Haz clic para ver el desglose completo de esta limpieza"
                        >
                          <td className="px-4 py-3.5 font-medium text-slate-700 whitespace-nowrap">
                            {formatDateTime(run.startedAt)}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {run.isDryRun ? (
                              <span className="px-2.5 py-1 text-xs font-bold bg-slate-100 text-slate-700 rounded-lg flex items-center gap-1.5 w-fit">
                                <span className="w-2 h-2 rounded-full bg-slate-400" />
                                Vista Previa (Simulación)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1.5 w-fit">
                                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                Borrado Real Efectivo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-extrabold text-purple-800 text-base">
                                {(run.isDryRun ? run.totalCandidates : run.totalDeleted).toLocaleString()}
                              </span>
                              <span className="text-xs text-slate-500">archivos</span>
                              {run.totalErrors > 0 && (
                                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded-md ml-1">
                                  {run.totalErrors} error{run.totalErrors > 1 ? 'es' : ''}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-purple-700 whitespace-nowrap">
                            {(run.totalMbToFree / 1024).toFixed(2)} GB
                            <span className="text-[11px] font-normal text-slate-400 ml-1">({run.totalMbToFree.toLocaleString()} MB)</span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-600">
                            <span className="px-2 py-0.5 bg-slate-100 rounded font-mono">
                              TXT: {run.config.txt} | NORMAL: {run.config.normal} | GENERAL: {run.config.general}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-500 font-mono text-xs max-w-xs">
                            <div className="truncate" title={run.filename}>{run.filename}</div>
                            {hasCompanyMatch && (
                              <div className="text-[11px] text-purple-700 font-medium mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 inline-block"></span>
                                <span>Coincidencia dentro del log: {matchingCompanies.slice(0, 2).join(', ')}{matchingCompanies.length > 2 ? '...' : ''}</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openLimpiezaModal(run, hasCompanyMatch ? cleanSearch : '');
                              }}
                              className="px-3 py-1.5 text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition"
                            >
                              Ver Desglose
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DETALLE SINCRONIZACIÓN AZCOPY                       */}
      {/* ========================================================= */}
      {selectedAzRun && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-100 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold">Detalle de Sincronización Azure Blob</h3>
                  {renderAzStatusBadge(selectedAzRun)}
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Job ID: {selectedAzRun.jobId || 'N/A'} • Archivo: {selectedAzRun.filename}
                </p>
              </div>
              <button
                onClick={() => setSelectedAzRun(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex gap-4">
                <button
                  onClick={() => setModalTab('files')}
                  className={`py-3 text-sm font-bold border-b-2 transition flex items-center gap-1.5 ${
                    modalTab === 'files' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span>Archivos Respaldados en Azure</span>
                  {azFilesResult && azFilesResult.files.length > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800">
                      {azFilesResult.files.length.toLocaleString()}
                    </span>
                  ) : selectedAzRun.transfersCompleted > 0 ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">
                      {selectedAzRun.transfersCompleted.toLocaleString()}
                    </span>
                  ) : null}
                </button>
                <button
                  onClick={() => setModalTab('summary')}
                  className={`py-3 text-sm font-bold border-b-2 transition ${
                    modalTab === 'summary' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Resumen de Transferencia
                </button>
                <button
                  onClick={() => setModalTab('raw')}
                  className={`py-3 text-sm font-bold border-b-2 transition ${
                    modalTab === 'raw' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Log Completo AzCopy
                </button>
              </div>

              {modalTab === 'raw' && (
                <button
                  onClick={handleCopyLog}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition text-slate-700 flex items-center gap-1.5"
                >
                  {copySuccess ? '✓ Copiado' : 'Copiar Texto'}
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {modalTab === 'files' && (
                <div className="space-y-4">
                  {loadingAzFiles ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                      <svg className="w-8 h-8 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm">Buscando registro detallado y archivos respaldados en Azure...</span>
                    </div>
                  ) : azFilesResult?.notFound ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-900 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-700 flex-shrink-0 mt-0.5">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-base text-amber-900">Registro detallado individual no localizado en el FTP</h4>
                          <p className="text-sm text-amber-800 leading-relaxed">
                            El conteo general de este trabajo ({selectedAzRun.transfersCompleted.toLocaleString()} archivos subidos exitosamente, {selectedAzRun.transfersFailed} fallidos) proviene del resumen de AzCopy. El archivo con el listado individual ({selectedAzRun.jobId ? `${selectedAzRun.jobId}.log` : 'archivo .log interno'}) no se encuentra en el directorio <code>/LSOFT/Logs</code>.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white/80 p-4 rounded-xl border border-amber-200 text-xs space-y-2">
                        <p className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span>💡</span> Para que todas las subidas futuras muestren aquí la lista de archivos uno a uno:
                        </p>
                        <p className="text-slate-600">
                          Agrega esta línea en tu archivo <code>sync.bat</code> antes de la ejecución de <code>azcopy.exe</code>:
                        </p>
                        <pre className="bg-slate-900 text-emerald-400 p-2.5 rounded-lg font-mono text-xs overflow-x-auto select-all">
                          set AZCOPY_LOG_LOCATION=C:\FTP\LSOFT\Logs
                        </pre>
                        <p className="text-[11px] text-slate-500">
                          Esto indicará a AzCopy que guarde el registro detallado en la misma carpeta accesible por el servidor FTPS.
                        </p>
                      </div>
                    </div>
                  ) : filteredAzFiles.length === 0 ? (
                    <div className="py-12 text-center text-slate-400">
                      No se encontraron archivos que coincidan con la búsqueda.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Buscador y Filtro */}
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          </span>
                          <input
                            type="text"
                            value={azFilesSearch}
                            onChange={(e) => setAzFilesSearch(e.target.value)}
                            placeholder="Buscar por empresa, RUC o nombre de archivo respaldado..."
                            className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                          />
                          {azFilesSearch && (
                            <button onClick={() => setAzFilesSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                              ✕
                            </button>
                          )}
                        </div>

                        <select
                          value={azFilesStatusFilter}
                          onChange={(e) => setAzFilesStatusFilter(e.target.value as any)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                        >
                          <option value="ALL">Todos los estados</option>
                          <option value="completed">Transferidos con éxito</option>
                          <option value="failed">Fallidos</option>
                        </select>
                      </div>

                      {/* Tabla de Archivos */}
                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-2.5 font-semibold">Estado</th>
                              <th className="px-4 py-2.5 font-semibold">Empresa / RUC</th>
                              <th className="px-4 py-2.5 font-semibold">Archivo Respaldado</th>
                              <th className="px-4 py-2.5 font-semibold">Hora de Registro</th>
                              <th className="px-4 py-2.5 font-semibold">Detalle / Destino</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredAzFiles.map((file, idx) => (
                              <tr key={idx} className="hover:bg-blue-50/40 transition">
                                <td className="px-4 py-2 whitespace-nowrap">
                                  {file.status === 'completed' ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md flex items-center gap-1 w-fit">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                      Transferido a Azure
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 text-red-800 rounded-md flex items-center gap-1 w-fit">
                                      <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                      Fallo en subida
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 font-bold text-slate-800">{file.company}</td>
                                <td className="px-4 py-2 font-mono text-slate-700 truncate max-w-xs" title={file.fileName}>
                                  {file.fileName}
                                </td>
                                <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                                  {file.timestamp || 'N/A'}
                                </td>
                                <td className="px-4 py-2 text-slate-500 truncate max-w-xs text-[11px]" title={file.errorMessage || file.fullPath}>
                                  {file.errorMessage ? (
                                    <span className="text-red-600 font-medium">{file.errorMessage}</span>
                                  ) : (
                                    <span className="text-slate-400 font-mono">{file.fullPath || 'Azure Blob'}</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-500 px-1">
                        <span>
                          Mostrando <strong className="text-slate-700">{filteredAzFiles.length}</strong> de <strong className="text-slate-700">{azFilesResult.files.length}</strong> archivos registrados
                        </span>
                        {azFilesResult.logFile && (
                          <span className="font-mono text-[11px] text-slate-400">
                            Fuente: {azFilesResult.logFile}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {modalTab === 'summary' && (
                <div className="space-y-6">
                  {/* Tarjetas rápidas */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Inicio</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{formatDateTime(selectedAzRun.startedAt)}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Fin</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{selectedAzRun.endedAt ? formatDateTime(selectedAzRun.endedAt) : 'En progreso...'}</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Duración</p>
                      <p className="text-xs font-bold text-slate-800 mt-1">{selectedAzRun.durationMinutes.toFixed(2)} min</p>
                    </div>
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <p className="text-[11px] text-slate-500 uppercase font-semibold">Volumen Total</p>
                      <p className="text-xs font-extrabold text-blue-700 mt-1">{formatBytes(selectedAzRun.bytesTransferred)}</p>
                    </div>
                  </div>

                  {/* Detalle de Archivos */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Conteo de Archivos en Transferencia</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-slate-500 text-xs">Escaneados en Origen:</span>
                        <p className="font-bold text-slate-800">{selectedAzRun.filesScannedSource.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Escaneados en Destino:</span>
                        <p className="font-bold text-slate-800">{selectedAzRun.filesScannedDestination.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Copiados Exitosos:</span>
                        <p className="font-extrabold text-emerald-700">{selectedAzRun.transfersCompleted.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-500 text-xs">Transferencias Fallidas:</span>
                        <p className={`font-extrabold ${selectedAzRun.transfersFailed > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                          {selectedAzRun.transfersFailed}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Estado / Barra de Progreso si está activo */}
                  {selectedAzRun.status === 'in_progress' && (
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-amber-900">Avance de la sincronización</span>
                        <span className="text-sm font-extrabold text-amber-900">{selectedAzRun.percent?.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-amber-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-amber-600 h-2.5 rounded-full"
                          style={{ width: `${selectedAzRun.percent || 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-amber-800 mt-2">
                        Pendientes: {selectedAzRun.transfersPending?.toLocaleString() || 0} archivos
                      </p>
                    </div>
                  )}
                </div>
              )}

              {modalTab === 'raw' && (
                <div className="relative">
                  {loadingRaw ? (
                    <div className="py-12 text-center text-slate-400">Cargando log crudo...</div>
                  ) : (
                    <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto max-h-[60vh] select-text">
                      {rawContent || 'Log vacío'}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedAzRun(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DETALLE LIMPIEZA POWERSHELL                         */}
      {/* ========================================================= */}
      {selectedLimpiezaRun && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col border border-slate-100 overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-xl font-bold">Desglose de Limpieza de Respaldos</h3>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${selectedLimpiezaRun.isDryRun ? 'bg-slate-700 text-slate-200' : 'bg-emerald-700 text-emerald-100'}`}>
                    {selectedLimpiezaRun.isDryRun ? 'Simulación (Vista Previa)' : 'Borrado Real'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  Archivo: {selectedLimpiezaRun.filename} • Carpeta: {selectedLimpiezaRun.folder}
                </p>
              </div>
              <button
                onClick={() => setSelectedLimpiezaRun(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex gap-4">
                <button
                  onClick={() => setModalTab('summary')}
                  className={`py-3 text-sm font-bold border-b-2 transition ${
                    modalTab === 'summary' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  Resumen por Tipo
                </button>
                <button
                  onClick={() => setModalTab('details')}
                  className={`py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                    modalTab === 'details' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  Archivos {selectedLimpiezaRun.isDryRun ? 'Candidatos' : 'Eliminados'}
                  <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                    {candidateItems.length}
                  </span>
                </button>
                <button
                  onClick={() => setModalTab('omitted')}
                  className={`py-3 text-sm font-bold border-b-2 transition flex items-center gap-2 ${
                    modalTab === 'omitted' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  Omitidos / Fuera de Formato
                  <span className="px-2 py-0.5 rounded-full text-xs bg-slate-200 text-slate-700">
                    {omittedFiles.length || selectedLimpiezaRun.omittedCount}
                  </span>
                </button>
                <button
                  onClick={() => setModalTab('raw')}
                  className={`py-3 text-sm font-bold border-b-2 transition ${
                    modalTab === 'raw' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
                  }`}
                >
                  Log Crudo
                </button>
              </div>

              {modalTab === 'raw' && (
                <button
                  onClick={handleCopyLog}
                  className="px-3 py-1 text-xs font-semibold bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition text-slate-700 flex items-center gap-1.5"
                >
                  {copySuccess ? '✓ Copiado' : 'Copiar Texto'}
                </button>
              )}
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* PESTAÑA RESUMEN POR TIPO */}
              {modalTab === 'summary' && (
                <div className="space-y-6">
                  {/* Tarjetas de tipos: TXT, NORMAL, GENERAL, FORMATOS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {selectedLimpiezaRun.typesSummary.map((ts) => (
                      <div key={ts.type} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold px-2 py-0.5 bg-slate-200 text-slate-800 rounded-md">
                            [{ts.type}]
                          </span>
                          <span className="text-xs font-bold text-purple-700">
                            {ts.mbToFree >= 1024 ? `${(ts.mbToFree / 1024).toFixed(2)} GB` : `${ts.mbToFree.toFixed(2)} MB`}
                          </span>
                        </div>
                        <div className="mt-3 space-y-1 text-xs">
                          <div className="flex justify-between text-slate-500">
                            <span>Válidos:</span>
                            <span className="font-semibold text-slate-800">{ts.valid.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Empresas (Grupos):</span>
                            <span className="font-semibold text-slate-800">{ts.groups.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Conservados:</span>
                            <span className="font-semibold text-emerald-700">{ts.kept.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>A retirar / Borrados:</span>
                            <span className="font-bold text-purple-700">
                              {(selectedLimpiezaRun.isDryRun ? ts.candidates : ts.deleted).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Resumen Global */}
                  <div className="bg-purple-50 p-4 rounded-2xl border border-purple-200 text-xs text-purple-900 flex flex-wrap gap-4 justify-between items-center">
                    <div>
                      <p className="font-extrabold text-sm">Resumen de la política de retención</p>
                      <p className="text-purple-700 mt-0.5">
                        Conserva por empresa: {selectedLimpiezaRun.config.txt} TXT de contraseña y {selectedLimpiezaRun.config.normal} ZIPs normales más recientes.
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-extrabold text-base text-purple-900">
                        Total a liberar: {(selectedLimpiezaRun.totalMbToFree / 1024).toFixed(2)} GB
                      </p>
                      <p className="text-purple-700 text-[11px]">
                        ({selectedLimpiezaRun.totalCandidates.toLocaleString()} archivos evaluados para retiro)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PESTAÑA DETALLES (ARCHIVOS CANDIDATOS / ELIMINADOS CON FILTRO POR EMPRESA) */}
              {modalTab === 'details' && (
                <div className="space-y-4">
                  {/* Buscador de empresa */}
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      placeholder="Filtrar por código de empresa o RUC (ej. A006_0992167785001)..."
                      className="w-full pl-10 pr-9 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition"
                    />
                    {companySearch && (
                      <button onClick={() => setCompanySearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Tabla de candidatos */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[50vh] overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-500 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">Empresa / RUC</th>
                          <th className="px-4 py-2.5 font-semibold">Tipo</th>
                          <th className="px-4 py-2.5 font-semibold">Nombre de Archivo</th>
                          <th className="px-4 py-2.5 font-semibold">Fecha del Archivo</th>
                          <th className="px-4 py-2.5 font-semibold">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loadingRaw ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                              Cargando archivos candidatos...
                            </td>
                          </tr>
                        ) : filteredCandidates.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                              No hay archivos que coincidan con la búsqueda.
                            </td>
                          </tr>
                        ) : (
                          filteredCandidates.map((item, idx) => (
                            <tr key={idx} className="hover:bg-purple-50/40 transition">
                              <td className="px-4 py-2 font-bold text-slate-800">{item.company}</td>
                              <td className="px-4 py-2">
                                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-slate-100 text-slate-700 rounded">
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-700 truncate max-w-xs" title={item.filename}>
                                {item.filename}
                              </td>
                              <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{item.fileDate}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${item.status === 'candidato' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                  {item.status === 'candidato' ? 'A borrar' : 'Eliminado'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* PESTAÑA OMITIDOS / FUERA DE FORMATO */}
              {modalTab === 'omitted' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    Archivos que no cumplen con el formato de fecha estándar y fueron protegidos para evitar borrados accidentales:
                  </p>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 max-h-[50vh] overflow-y-auto font-mono text-xs text-slate-700 space-y-1">
                    {omittedFiles.length > 0 ? (
                      omittedFiles.map((f, i) => (
                        <div key={i} className="py-0.5 border-b border-slate-100 last:border-none">
                          {f}
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-400">No se listaron muestras en el log.</p>
                    )}
                  </div>
                </div>
              )}

              {/* PESTAÑA LOG CRUDO */}
              {modalTab === 'raw' && (
                <div>
                  {loadingRaw ? (
                    <div className="py-12 text-center text-slate-400">Cargando log crudo...</div>
                  ) : (
                    <pre className="p-4 bg-slate-900 text-purple-300 font-mono text-xs rounded-xl overflow-x-auto max-h-[60vh] select-text">
                      {rawContent || 'Log vacío'}
                    </pre>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLimpiezaRun(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition"
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

function renderAzStatusBadge(run: AzCopySyncRun) {
  if (run.status === 'in_progress') {
    return (
      <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-900 rounded-lg flex items-center gap-1.5 animate-pulse w-fit">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        En progreso ({run.percent ? `${run.percent.toFixed(1)}%` : 'Activo'})
      </span>
    );
  }
  if (run.status === 'completed_with_errors') {
    return (
      <span className="px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 rounded-lg flex items-center gap-1.5 w-fit">
        <span className="w-2 h-2 rounded-full bg-amber-500" />
        Completado con errores
      </span>
    );
  }
  if (run.status === 'failed') {
    return (
      <span className="px-2.5 py-1 text-xs font-bold bg-red-100 text-red-800 rounded-lg flex items-center gap-1.5 w-fit">
        <span className="w-2 h-2 rounded-full bg-red-600" />
        Fallido
      </span>
    );
  }
  return (
    <span className="px-2.5 py-1 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-lg flex items-center gap-1.5 w-fit">
      <span className="w-2 h-2 rounded-full bg-emerald-600" />
      Completado
    </span>
  );
}

function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatDateTime(isoOrRaw: string): string {
  try {
    const d = new Date(isoOrRaw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    }
  } catch {
    // ignore
  }
  return isoOrRaw;
}

export default SyncCleanLogs;
