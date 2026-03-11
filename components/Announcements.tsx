import React, { useState, useEffect } from 'react';
import { User, Announcement, AnnouncementCategory, AnnouncementPriority, UserRole } from '../types';
import { announcementService } from '../services/announcementService';
import AnnouncementModal from './AnnouncementModal';

interface AnnouncementsProps {
  user: User;
}

const Announcements: React.FC<AnnouncementsProps> = ({ user }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | undefined>(undefined);

  // Solo ADMIN puede crear/editar/eliminar anuncios
  const isAdmin = user.role === UserRole.ADMIN;
  const canCreate = isAdmin;
  const canEdit = isAdmin;
  const canDelete = isAdmin;

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setLoading(true);
    const data = await announcementService.getAnnouncements();
    setAnnouncements(data);
    setLoading(false);
  };

  // Filtrar anuncios según el rol del usuario
  const visibleAnnouncements = announcements.filter(
    a => a.visibleRoles.includes(user.role)
  );

  // Filtrar por categoría y búsqueda
  const filteredAnnouncements = visibleAnnouncements
    .filter(a => selectedCategory === 'ALL' || a.category === selectedCategory)
    .filter(a =>
      a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleSaveAnnouncement = async (annData: Partial<Announcement>) => {
    if (editingAnnouncement) {
      const success = await announcementService.updateAnnouncement(editingAnnouncement.id, annData);
      if (success) {
        setIsModalOpen(false);
        setEditingAnnouncement(undefined);
        fetchAnnouncements();
      } else {
        alert('Error al actualizar el anuncio');
      }
    } else {
      const newAnn = await announcementService.createAnnouncement(annData as Omit<Announcement, 'id' | 'createdAt'>);
      if (newAnn) {
        setIsModalOpen(false);
        fetchAnnouncements();
      } else {
        alert('Error al crear el anuncio');
      }
    }
  };

  const handleEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este anuncio?')) {
      const success = await announcementService.deleteAnnouncement(id);
      if (success) {
        fetchAnnouncements();
      } else {
        alert('Error al eliminar el anuncio');
      }
    }
  };

  const getCategoryColor = (category: AnnouncementCategory) => {
    switch (category) {
      case AnnouncementCategory.URGENT: return 'bg-red-100 text-red-700 border-red-300';
      case AnnouncementCategory.TECH: return 'bg-blue-100 text-blue-700 border-blue-300';
      case AnnouncementCategory.RRHH: return 'bg-purple-100 text-purple-700 border-purple-300';
      case AnnouncementCategory.ADMIN: return 'bg-amber-100 text-amber-700 border-amber-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getCategoryLabel = (category: AnnouncementCategory) => {
    switch (category) {
      case AnnouncementCategory.URGENT: return 'Urgente';
      case AnnouncementCategory.TECH: return 'Técnico';
      case AnnouncementCategory.RRHH: return 'RRHH';
      case AnnouncementCategory.ADMIN: return 'Administrativo';
      default: return 'General';
    }
  };

  const getPriorityBadge = (priority: AnnouncementPriority) => {
    switch (priority) {
      case AnnouncementPriority.URGENT:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-500 text-white">Urgente</span>;
      case AnnouncementPriority.HIGH:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-orange-500 text-white">Alta</span>;
      case AnnouncementPriority.NORMAL:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-500 text-white">Normal</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-400 text-white">Baja</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categories = [
    { value: 'ALL', label: 'Todos' },
    { value: AnnouncementCategory.GENERAL, label: 'General' },
    { value: AnnouncementCategory.TECH, label: 'Técnico' },
    { value: AnnouncementCategory.RRHH, label: 'RRHH' },
    { value: AnnouncementCategory.ADMIN, label: 'Administrativo' },
    { value: AnnouncementCategory.URGENT, label: 'Urgente' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Anuncios
          </h1>
          <p className="text-slate-500 mt-1">
            Comunicados y noticias importantes de la empresa
          </p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setEditingAnnouncement(undefined);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Anuncio
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1 relative">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar anuncios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por categoría */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value as AnnouncementCategory | 'ALL')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-1 ${selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de anuncios */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
            <svg className="w-16 h-16 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">No hay anuncios</h3>
            <p className="text-slate-500">
              No se encontraron anuncios con los filtros seleccionados.
            </p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition ${announcement.isPinned ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'
                }`}
            >
              {/* Header del anuncio */}
              <div className={`px-6 py-3 border-b ${announcement.priority === AnnouncementPriority.URGENT
                ? 'bg-red-50 border-red-200'
                : announcement.isPinned
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-slate-50 border-slate-200'
                }`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {announcement.isPinned && (
                      <span className="text-blue-500 text-lg" title="Anuncio fijado">📌</span>
                    )}
                    <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getCategoryColor(announcement.category)}`}>
                      {getCategoryLabel(announcement.category)}
                    </span>
                    {getPriorityBadge(announcement.priority)}
                    {announcement.deadline && (
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 shadow-sm ${new Date(announcement.deadline) < new Date()
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(announcement.deadline) < new Date() ? 'Expiró el ' : 'Vigente hasta el '}
                        {new Date(announcement.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-slate-500">
                    {formatDate(announcement.createdAt)}
                  </span>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-3">
                  {announcement.title}
                </h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                  {announcement.content}
                </p>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-sm">👤</span>
                  </div>
                  <span className="text-sm text-slate-600">
                    Publicado por <span className="font-medium">{announcement.createdByName}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Compartir">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(announcement)}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                      title="Editar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAnnouncement(undefined);
        }}
        onSave={handleSaveAnnouncement}
        announcement={editingAnnouncement}
        currentUser={user}
      />
    </div>
  );
};

export default Announcements;
