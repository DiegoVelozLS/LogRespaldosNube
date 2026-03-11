import React, { useState } from 'react';
import { MOCK_DOCUMENTS, MOCK_DOCUMENT_CATEGORIES } from '../constants';

// Colores para cada categoría
const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string; gradient: string }> = {
  'dc1': { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600', gradient: 'from-blue-100 to-blue-50' },
  'dc2': { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600', gradient: 'from-amber-100 to-amber-50' },
  'dc3': { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600', gradient: 'from-emerald-100 to-emerald-50' },
  'dc4': { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', gradient: 'from-purple-100 to-purple-50' },
  'dc5': { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-600', gradient: 'from-rose-100 to-rose-50' },
};

const DocumentRepository: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Todos los documentos disponibles
  const allDocuments = MOCK_DOCUMENTS;

  // Documentos de la categoría seleccionada
  const categoryDocuments = selectedCategory
    ? allDocuments
        .filter(doc => doc.categoryId === selectedCategory)
        .filter(doc =>
          doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  // Categoría actual
  const currentCategory = MOCK_DOCUMENT_CATEGORIES.find(c => c.id === selectedCategory);

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
    return allDocuments.filter(doc => doc.categoryId === categoryId).length;
  };

  // ========== VISTA DE CARPETAS (sin categoría seleccionada) ==========
  if (!selectedCategory) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Repositorio de Documentos
          </h1>
          <p className="text-slate-500 mt-1">
            Selecciona una carpeta para ver los documentos
          </p>
        </div>

        {/* Grid de Carpetas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK_DOCUMENT_CATEGORIES.map((category) => {
            const docCount = getCategoryCount(category.id);
            const colors = CATEGORY_COLORS[category.id] || CATEGORY_COLORS['dc1'];
            
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`group relative bg-white rounded-2xl border-2 ${colors.border} hover:shadow-lg transition-all duration-200 overflow-hidden text-left`}
              >
                {/* Fondo decorativo */}
                <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-50 group-hover:opacity-70 transition-opacity`} />
                
                {/* Contenido */}
                <div className="relative p-6">
                  {/* Icono de carpeta grande */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`text-5xl transform group-hover:scale-110 transition-transform duration-200`}>
                      📁
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${colors.bg} ${colors.icon}`}>
                      {docCount} {docCount === 1 ? 'archivo' : 'archivos'}
                    </span>
                  </div>

                  {/* Nombre de categoría */}
                  <h3 className="text-lg font-bold text-slate-800 mb-1 group-hover:text-slate-900">
                    {category.name}
                  </h3>
                  
                  {/* Descripción */}
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {category.description}
                  </p>

                  {/* Icono de la categoría */}
                  <div className="absolute bottom-4 right-4 text-4xl opacity-20 group-hover:opacity-30 transition-opacity">
                    {category.icon}
                  </div>
                </div>

                {/* Barra inferior decorativa */}
                <div className={`h-1 ${colors.bg.replace('50', '400')} bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              </button>
            );
          })}
        </div>

        {/* Info de documentos totales */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {allDocuments.length} documentos disponibles en total
          </div>
        </div>
      </div>
    );
  }

  // ========== VISTA DE DOCUMENTOS (categoría seleccionada) ==========
  const colors = CATEGORY_COLORS[selectedCategory] || CATEGORY_COLORS['dc1'];

  return (
    <div className="space-y-6">
      {/* Breadcrumb y Header */}
      <div>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-3">
          <button
            onClick={() => {
              setSelectedCategory(null);
              setSearchTerm('');
            }}
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            Repositorio
          </button>
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-600 font-medium">{currentCategory?.name}</span>
        </div>

        {/* Título con icono */}
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border`}>
            <span className="text-3xl">{currentCategory?.icon}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {currentCategory?.name}
            </h1>
            <p className="text-slate-500">
              {currentCategory?.description}
            </p>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="relative max-w-md">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en esta carpeta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista de documentos */}
      {categoryDocuments.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
          <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-800 mb-2 mt-4">No hay documentos</h3>
          <p className="text-slate-500">
            {searchTerm 
              ? 'No se encontraron documentos con ese término de búsqueda.'
              : 'Esta carpeta no tiene documentos disponibles para tu rol.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categoryDocuments.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition overflow-hidden group"
            >
              {/* Preview area */}
              <div className={`h-28 bg-gradient-to-br ${colors.gradient} flex items-center justify-center border-b ${colors.border}`}>
                <span className="text-5xl group-hover:scale-110 transition-transform">{getFileIcon(doc.fileType)}</span>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm line-clamp-2 flex-1">
                    {doc.name}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded shrink-0 ${getFileTypeColor(doc.fileType)}`}>
                    {doc.fileType}
                  </span>
                </div>

                <p className="text-xs text-slate-500 line-clamp-2 mb-3">
                  {doc.description}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{doc.fileSize}</span>
                  <span>{formatDate(doc.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contador */}
      <div className="text-center text-sm text-slate-500">
        {categoryDocuments.length} {categoryDocuments.length === 1 ? 'documento' : 'documentos'} en esta carpeta
      </div>
    </div>
  );
};

export default DocumentRepository;
