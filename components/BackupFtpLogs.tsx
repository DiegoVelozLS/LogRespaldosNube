import React, { useEffect, useMemo, useRef, useState } from 'react';
import { backupFtpLogService, BackupDatabaseResult, BackupRun, BackupStage } from '../services/backupFtpLogService';

const BackupFtpLogs: React.FC = () => {
  const [runs, setRuns] = useState<BackupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [serverFilter, setServerFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<BackupRun | null>(null);
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

  const servers = useMemo(
    () => Array.from(new Set(runs.map((run) => run.server))).sort((a, b) => a.localeCompare(b, 'es')),
    [runs]
  );

  const filtered = useMemo(() => runs.filter((run) => {
    if (serverFilter && run.server !== serverFilter) return false;
    if (statusFilter && run.status !== statusFilter) return false;
    if (dateFrom && run.date < dateFrom) return false;
    if (dateTo && run.date > dateTo) return false;
    return true;
  }), [runs, serverFilter, statusFilter, dateFrom, dateTo]);

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

  const openRun = (run: BackupRun) => {
    setSelected(run);
    setRawLog('');
    setShowLog(false);
  };

  const loadRawLog = async () => {
    if (!selected) return;
    setShowLog(true);
    if (rawLog) return;
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
        <button onClick={load} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-700 transition">
          Actualizar
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl">{error}</div>
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

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
        <select value={serverFilter} onChange={(e) => setServerFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
          <option value="">Todos los servidores</option>
          {servers.map((server) => <option key={server} value={server}>{server}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
          <option value="">Todos los estados</option>
          <option value="success">Exitoso</option>
          <option value="error">Con errores</option>
        </select>
      </div>

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
                <th className="px-4 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Cargando logs del FTP...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">No hay ejecuciones para este filtro.</td></tr>
              ) : filtered.map((run) => (
                <tr key={run.filename} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{formatDate(run.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{run.server}</td>
                  <td className="px-4 py-3">{run.startedAt || '—'}</td>
                  <td className="px-4 py-3">{formatDuration(run.durationSeconds)}</td>
                  <td className="px-4 py-3">{run.successCount}/{run.databaseCount}</td>
                  <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openRun(run)} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700">Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">{selected.server}</h3>
              <p className="text-slate-500">{formatDate(selected.date)} · inicio {selected.startedAt || '—'} · {formatDuration(selected.durationSeconds)} · {selected.databaseCount} bases</p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={selected.status} />
              <button onClick={() => setSelected(null)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600">Cerrar</button>
            </div>
          </div>

          <DatabaseDetailTable databases={selected.databases} />

          <div className="flex gap-2">
            <button onClick={loadRawLog} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700">Ver log</button>
            <button onClick={downloadLog} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-700">Descargar .log</button>
          </div>
          {showLog && (
            <pre className="max-h-96 overflow-auto bg-slate-900 text-slate-100 text-xs rounded-xl p-4 whitespace-pre-wrap">
              {logLoading ? 'Cargando log...' : rawLog}
            </pre>
          )}
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

const DatabaseDetailTable: React.FC<{ databases: BackupDatabaseResult[] }> = ({ databases }) => {
  const [order, setOrder] = useState<DetailColumn[]>(loadColumnOrder);
  const [widths, setWidths] = useState<Record<DetailColumn, number>>(loadColumnWidths);
  const dragId = useRef<DetailColumn | null>(null);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

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
    <div className="space-y-2">
      <p className="text-xs text-slate-400">Arrastra el título para cambiar el orden. Arrastra el borde derecho para cambiar el ancho.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead className="text-slate-500 text-left">
            <tr>
              {order.map((id) => {
                const column = DETAIL_COLUMNS.find((item) => item.id === id)!;
                return (
                  <th key={id} style={{ width: `${(widths[id] / tableWidth) * 100}%` }} className="py-2 pr-2 font-semibold">
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
                        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-blue-200"
                        title="Arrastra para cambiar el ancho"
                      />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {databases.map((db) => {
              const identity = splitCompanyAndDatabase(db);
              return (
                <tr key={`${identity.company}|${identity.database}`}>
                  {order.map((id) => (
                    <td key={id} className="py-2 pr-2 truncate">
                      {id === 'company' && <span className="font-medium text-slate-800">{identity.company || '—'}</span>}
                      {id === 'database' && <span className="font-medium text-slate-800">{identity.database}</span>}
                      {id === 'backup' && <StageBadge stage={db.backup} />}
                      {id === 'zip' && <StageBadge stage={db.zip} />}
                      {id === 'ftp' && <StageBadge stage={db.ftp} />}
                    </td>
                  ))}
                </tr>
              );
            })}
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

export default BackupFtpLogs;
