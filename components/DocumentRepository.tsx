import React, { useState } from 'react';
import { User, Document, DocumentCategory } from '../types';
import { MOCK_DOCUMENTS, MOCK_DOCUMENT_CATEGORIES } from '../constants';

interface DocumentRepositoryProps {
  user: User;
}

const DocumentRepository: React.FC<DocumentRepositoryProps> = ({ user }) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtrar documentos por rol del usuario
  const visibleDocuments = MOCK_DOCUMENTS.filter(
    doc => doc.visibleRoles.includes(user.role)
  );

  // Filtrar por categoría y búsqueda
  const filteredDocuments = visibleDocuments
    .filter(doc => !selectedCategory || doc.categoryId === selectedCategory)
    .filter(doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getFileIcon = (fileType: string) => {
    switch (fileType.toUpperCase()) {
      case 'PDF': return '📕';
      case 'DOC':
      case 'DOCX': return '📘';
      case 'XLS':
      case 'XLSX': return '📗';
      case 'PPT':
      case 'PPTX': return '📙';
      case 'IMG':
      case 'JPG':
      case 'PNG': return '🖼️';
      case 'ZIP':
      case 'RAR': return '📦';
      default: return '📄';
    }
  };

  const getFileTypeColor = (fileType: string) => {
    switch (fileType.toUpperCase()) {
      case 'PDF': return 'bg-red-100 text-red-700';
      case 'DOC':
      case 'DOCX': return 'bg-blue-100 text-blue-700';
      case 'XLS':
      case 'XLSX': return 'bg-green-100 text-green-700';
      case 'PPT':
      case 'PPTX': return 'bg-orange-100 text-orange-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Contar documentos por categoría
  const getCategoryCount = (categoryId: string) => {
    return visibleDocuments.filter(doc => doc.categoryId === categoryId).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Repositorio de Documentos
          </h1>
          <p className="text-slate-500 mt-1">
            Documentos corporativos, políticas y formatos
          </p>
        </div>
        {user.role === 'ADMIN' && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Subir Documento
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar de categorías */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden sticky top-24">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Categorías</h3>
            </div>
            <div className="p-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                  selectedCategory === null
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  <span className="font-medium">Todos</span>
                </div>
                <span className="text-sm bg-slate-100 px-2 py-0.5 rounded-full">
                  {visibleDocuments.length}
                </span>
              </button>

              {MOCK_DOCUMENT_CATEGORIES.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition ${
                    selectedCategory === category.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span className="font-medium text-sm">{category.name}</span>
                  </div>
                  <span className="text-sm bg-slate-100 px-2 py-0.5 rounded-full">
                    {getCategoryCount(category.id)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="lg:col-span-3 space-y-4">
          {/* Barra de herramientas */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Búsqueda */}
            <div className="flex-1 relative w-full sm:w-auto">
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Modo de vista */}
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Vista de cuadrícula"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Vista de lista"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Resultados */}
          {filteredDocuments.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
              <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No hay documentos</h3>
              <p className="text-slate-500">
                No se encontraron documentos con los filtros seleccionados.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition overflow-hidden group"
                >
                  {/* Preview area */}
                  <div className="h-32 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border-b border-slate-200 group-hover:from-blue-50 group-hover:to-blue-100 transition">
                    <span className="text-5xl">{getFileIcon(doc.fileType)}</span>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 flex-1">
                        {doc.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${getFileTypeColor(doc.fileType)}`}>
                        {doc.fileType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                      {doc.description}
                    </p>

                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span>{doc.fileSize}</span>
                      <span>{formatDate(doc.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar
                      </button>
                      <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Ver detalles">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Vista de lista */
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700">Nombre</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden sm:table-cell">Categoría</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden md:table-cell">Tamaño</th>
                    <th className="text-left px-4 py-3 text-sm font-semibold text-slate-700 hidden lg:table-cell">Fecha</th>
                    <th className="text-right px-4 py-3 text-sm font-semibold text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc, index) => (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50 transition ${
                        index !== filteredDocuments.length - 1 ? 'border-b border-slate-100' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getFileIcon(doc.fileType)}</span>
                          <div>
                            <p className="font-medium text-slate-800 text-sm">{doc.name}</p>
                            <p className="text-xs text-slate-500 line-clamp-1">{doc.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-sm text-slate-600">{doc.category}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${getFileTypeColor(doc.fileType)}`}>
                          {doc.fileType}
                        </span>
                        <span className="text-sm text-slate-500 ml-2">{doc.fileSize}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-slate-500">{formatDate(doc.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Descargar">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                          </button>
                          {user.role === 'ADMIN' && (
                            <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Info de documentos */}
          <div className="text-center text-sm text-slate-500">
            Mostrando {filteredDocuments.length} de {visibleDocuments.length} documentos
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentRepository;
