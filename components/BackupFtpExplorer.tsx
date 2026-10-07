import React, { useEffect, useMemo, useState } from 'react';
import { BackupFtpFile, User } from '../types';
import { backupFtpExplorerService, formatBytes, normalizeText } from '../services/backupFtpExplorerService';

interface BackupFtpExplorerProps {
  currentUser: User;
}

type SortField = 'name' | 'fileType' | 'sizeBytes' | 'modifiedAt';
type SortDirection = 'asc' | 'desc';

const BackupFtpExplorer: React.FC<BackupFtpExplorerProps> = ({ currentUser }) => {
  const [currentPath, setCurrentPath] = useState('/LSOFT');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<BackupFtpFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [downloadingFile, setDownloadingFile] = useState<BackupFtpFile | null>(null);
  const [isProcessingDownload, setIsProcessingDownload] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError('');
    try {
      const result = await backupFtpExplorerService.exploreDirectory(path);
      setCurrentPath(result.currentPath);
      setParentPath(result.parentPath);
      setItems(result.items);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo explorar el directorio en el servidor FTP.';
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory(currentPath);
  }, []);

  const handleOpenFolder = (folderPath: string) => {
    setSearchQuery('');
    loadDirectory(folderPath);
  };

  const handleGoUp = () => {
    if (parentPath) {
      setSearchQuery('');
      loadDirectory(parentPath);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'sizeBytes' || field === 'modifiedAt' ? 'desc' : 'asc');
    }
  };

  // Filtro inteligente en vivo por términos y por tipo de archivo
  const filteredAndSortedItems = useMemo(() => {
    let list = items;

    // 1. Filtro por tipo de extensión o carpeta
    if (typeFilter !== 'ALL') {
      if (typeFilter === 'FOLDER') {
        list = list.filter((i) => i.isFolder);
      } else if (typeFilter === 'FILE') {
        list = list.filter((i) => !i.isFolder);
      } else {
        list = list.filter((i) => i.fileType.toUpperCase() === typeFilter.toUpperCase());
      }
    }

    // 2. Filtro inteligente por texto
    const normalizedQuery = normalizeText(searchQuery);
    if (normalizedQuery) {
      const terms = normalizedQuery.split(/\s+/).filter(Boolean);
      list = list.filter((item) => {
        const target = normalizeText(`${item.name} ${item.path} ${item.fileType}`);
        return terms.every((term) => target.includes(term));
      });
    }

    // 3. Ordenamiento por columna
    return [...list].sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'fileType') {
        comparison = a.fileType.localeCompare(b.fileType, undefined, { sensitivity: 'base' });
      } else if (sortField === 'sizeBytes') {
        comparison = a.sizeBytes - b.sizeBytes;
      } else if (sortField === 'modifiedAt') {
        const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0;
        const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0;
        comparison = timeA - timeB;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [items, searchQuery, typeFilter, sortField, sortDirection]);

  const folderCount = useMemo(() => filteredAndSortedItems.filter((i) => i.isFolder).length, [filteredAndSortedItems]);
  const fileCount = useMemo(() => filteredAndSortedItems.filter((i) => !i.isFolder).length, [filteredAndSortedItems]);
  const totalSizeBytes = useMemo(() => filteredAndSortedItems.reduce((sum, i) => sum + i.sizeBytes, 0), [filteredAndSortedItems]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (!item.isFolder && item.fileType) {
        set.add(item.fileType.toUpperCase());
      }
    }
    return Array.from(set).sort();
  }, [items]);

  const confirmDownload = async () => {
    if (!downloadingFile) return;
    setIsProcessingDownload(true);
    setSuccessMessage('');
    try {
      await backupFtpExplorerService.downloadFile(downloadingFile, currentUser);
      setSuccessMessage(`Descarga iniciada: ${downloadingFile.name} (${downloadingFile.sizeFormatted}).`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la descarga.');
    } finally {
      setIsProcessingDownload(false);
      setDownloadingFile(null);
    }
  };

  const breadcrumbs = useMemo(() => {
    if (currentPath === '/' || !currentPath) {
      return [{ name: 'raíz', path: '/' }];
    }
    const segments = currentPath.split('/').filter(Boolean);
    const crumbs = [{ name: 'raíz', path: '/' }];
    let accumulated = '';
    for (const seg of segments) {
      accumulated += '/' + seg;
      crumbs.push({ name: seg, path: accumulated });
    }
    return crumbs;
  }, [currentPath]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <span>Descarga FTP</span>
            <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
              Servidor FTP
            </span>
          </h2>
          <p className="text-slate-500 mt-1">
            Explorador directo de archivos y carpetas del servidor FTP
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadDirectory(currentPath)}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl flex items-center justify-between animate-fadeIn shadow-sm">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-red-100 text-red-600 rounded-xl">⚠️</span>
            <div>
              <p className="font-bold text-sm">Error en el servidor FTP</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadDirectory(currentPath)}
            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl flex items-center justify-between animate-fadeIn">
          <span className="font-semibold text-sm">✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="text-green-500 hover:text-green-700 font-bold">✕</button>
        </div>
      )}

      {/* Barra de Sitio Remoto y Búsqueda Inteligente */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Fila superior: Dirección remota + Botón subir nivel */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={handleGoUp}
            disabled={!parentPath || loading || currentPath === '/'}
            title="Subir un nivel (..)"
            className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
          </button>

          <div className="flex items-center gap-1.5 text-sm bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 flex-1 whitespace-nowrap overflow-x-auto">
            <span className="text-slate-400 font-bold text-xs">Sitio Remoto:</span>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.path}>
                  {idx > 0 && <span className="text-slate-300">/</span>}
                  <button
                    onClick={() => {
                      if (!isLast) loadDirectory(crumb.path);
                    }}
                    disabled={isLast || loading}
                    className={`font-semibold transition ${
                      isLast
                        ? 'text-blue-700 font-bold cursor-default'
                        : 'text-slate-600 hover:text-blue-600 hover:underline'
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Fila inferior: Buscador inteligente + Filtros de extensión */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
          {/* Buscador inteligente */}
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o tipo de archivo..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtros de Tipo / Extensión */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                typeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setTypeFilter('FOLDER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                typeFilter === 'FOLDER'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📁 Carpetas
            </button>
            <button
              onClick={() => setTypeFilter('FILE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                typeFilter === 'FILE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📄 Archivos
            </button>
            {availableTypes.map((ext) => (
              <button
                key={ext}
                onClick={() => setTypeFilter(typeFilter === ext ? 'ALL' : ext)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-mono font-semibold transition ${
                  typeFilter === ext
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                .{ext.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla del Explorador FTP (Estilo FileZilla con Ordenamiento por Columnas) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left border-b border-slate-200 font-semibold select-none">
              <tr>
                {/* Columna Nombre */}
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nombre</span>
                    <SortIndicator field="name" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>

                {/* Columna Tipo */}
                <th
                  onClick={() => handleSort('fileType')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tipo</span>
                    <SortIndicator field="fileType" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>

                {/* Columna Tamaño */}
                <th
                  onClick={() => handleSort('sizeBytes')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tamaño</span>
                    <SortIndicator field="sizeBytes" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>

                {/* Columna Última Modificación */}
                <th
                  onClick={() => handleSort('modifiedAt')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-slate-100/80 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Última Modificación</span>
                    <SortIndicator field="modifiedAt" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>

                {/* Columna Acción */}
                <th className="px-4 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {/* Fila para subir de nivel si no estamos en la raíz */}
              {parentPath && !searchQuery && currentPath !== '/' && (
                <tr
                  onClick={handleGoUp}
                  className="hover:bg-blue-50/60 cursor-pointer transition-colors bg-slate-50/30"
                >
                  <td colSpan={5} className="px-4 py-2.5 text-blue-700 font-bold flex items-center gap-2">
                    <span className="p-1 bg-blue-100 rounded-lg text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                      </svg>
                    </span>
                    <span>.. (Directorio Superior)</span>
                  </td>
                </tr>
              )}

              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="text-sm font-medium">Consultando servidor FTP en {currentPath}...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="font-semibold text-slate-600">No hay archivos ni carpetas en este directorio</p>
                      {searchQuery && (
                        <p className="text-xs text-slate-400">Ningún elemento coincide con "{searchQuery}"</p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedItems.map((item) => (
                  <tr
                    key={item.path}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      item.isFolder ? 'cursor-pointer' : ''
                    }`}
                    onDoubleClick={() => {
                      if (item.isFolder) handleOpenFolder(item.path);
                    }}
                  >
                    {/* Nombre e Ícono */}
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <div className="flex items-center gap-3">
                        <ItemIcon isFolder={item.isFolder} type={item.fileType} />
                        <div>
                          {item.isFolder ? (
                            <button
                              onClick={() => handleOpenFolder(item.path)}
                              className="font-bold text-slate-800 hover:text-blue-600 hover:underline text-left text-sm"
                            >
                              {item.name}
                            </button>
                          ) : (
                            <span className="font-bold text-slate-800 text-sm">{item.name}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">
                      {formatItemType(item)}
                    </td>

                    {/* Tamaño */}
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                      {item.sizeFormatted}
                    </td>

                    {/* Fecha de modificación */}
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {formatDateString(item.modifiedAt)}
                    </td>

                    {/* Botón de acción */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {item.isFolder ? (
                        <button
                          onClick={() => handleOpenFolder(item.path)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          Abrir
                        </button>
                      ) : (
                        <button
                          onClick={() => setDownloadingFile(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-sm shadow-blue-200 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Descargar
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Estado Inferior */}
        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">{folderCount}</span> carpetas
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              <span className="font-bold text-slate-700">{fileCount}</span> archivos
            </span>
            <span className="text-slate-300">•</span>
            <span className="flex items-center gap-1.5">
              Total: <span className="font-bold text-blue-700">{formatBytes(totalSizeBytes)}</span>
            </span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            {currentPath}
          </div>
        </div>
      </div>

      {/* Modal de Confirmación de Descarga */}
      {downloadingFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setDownloadingFile(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>📥 Descargar Archivo</span>
              </h3>
              <button onClick={() => setDownloadingFile(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-sm">
                <p className="text-slate-500 text-xs font-semibold">Archivo:</p>
                <p className="font-bold text-slate-800 break-all">{downloadingFile.name}</p>
                <p className="text-slate-400 text-xs font-mono">{downloadingFile.path}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                  <span className="text-slate-600">Tamaño:</span>
                  <span className="font-extrabold text-blue-700 text-sm">{downloadingFile.sizeFormatted}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDownloadingFile(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-100 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDownload}
                disabled={isProcessingDownload}
                className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessingDownload ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Descargando...
                  </>
                ) : (
                  'Confirmar Descarga'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SortIndicator: React.FC<{
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
}> = ({ field, currentField, direction }) => {
  if (currentField !== field) {
    return <span className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity text-xs">↕</span>;
  }
  return (
    <span className="text-blue-600 font-bold text-xs">
      {direction === 'asc' ? '▲' : '▼'}
    </span>
  );
};

const ItemIcon: React.FC<{ isFolder: boolean; type: string }> = ({ isFolder, type }) => {
  if (isFolder) {
    return (
      <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      </div>
    );
  }

  const t = type.toUpperCase();
  if (t === 'ZIP' || t === 'RAR' || t === '7Z') {
    return (
      <div className="p-2 bg-purple-100 text-purple-700 rounded-xl shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 01-2-2V4a2 2 0 012-2h14a2 2 0 012 2v2a2 2 0 01-2 2M5 8v10a2 2 0 002 2h14a2 2 0 002-2V8m-9 4h4" />
        </svg>
      </div>
    );
  }

  if (t === 'BAK' || t === 'SQL' || t === 'MDF') {
    return (
      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
        </svg>
      </div>
    );
  }

  if (t === 'TXT' || t === 'LOG' || t === 'CSV') {
    return (
      <div className="p-2 bg-slate-100 text-slate-700 rounded-xl shrink-0">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="p-2 bg-blue-100 text-blue-700 rounded-xl shrink-0">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    </div>
  );
};

function formatItemType(item: BackupFtpFile): string {
  if (item.isFolder) return 'Carpeta de archivos';
  const ext = item.fileType.toUpperCase();
  switch (ext) {
    case 'ZIP':
      return 'Archivo ZIP (.zip)';
    case 'RAR':
      return 'Archivo RAR (.rar)';
    case '7Z':
      return 'Archivo 7-Zip (.7z)';
    case 'BAK':
      return 'Respaldo (.bak)';
    case 'SQL':
      return 'Script SQL (.sql)';
    case 'LOG':
      return 'Archivo de registro (.log)';
    case 'TXT':
      return 'Documento de texto (.txt)';
    case 'CSV':
      return 'Archivo CSV (.csv)';
    default:
      return `Archivo .${ext.toLowerCase()}`;
  }
}

function formatDateString(iso: string): string {
  if (!iso) return '–';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('es-EC', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default BackupFtpExplorer;
