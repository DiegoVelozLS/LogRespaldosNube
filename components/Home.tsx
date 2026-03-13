import React, { useState, useEffect } from 'react';
import { User, Announcement, AnnouncementCategory, AnnouncementPriority, Employee } from '../types';
import { announcementService } from '../services/announcementService';
import { supabaseDataService } from '../services/supabaseDataService';
import { googleDriveService } from '../services/googleDriveService';

interface HomeProps {
  user: User;
  onNavigate: (tab: string) => void;
}

// Iconos SVG profesionales
const MegaphoneIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
  </svg>
);

const FolderIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ServerIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const DocumentIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const CakeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2h12z" />
  </svg>
);

const MailIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const Home: React.FC<HomeProps> = ({ user, onNavigate }) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [docCount, setDocCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [announcementsData, employeesData, totalDocs] = await Promise.all([
        announcementService.getAnnouncements(),
        supabaseDataService.getEmployees(),
        googleDriveService.getTotalDocumentCount()
      ]);
      setAnnouncements(announcementsData);
      setEmployees(employeesData);
      setDocCount(totalDocs);
      setLoading(false);
    };

    fetchData();
  }, []);

  const visibleAnnouncements = announcements.filter(
    a => a.visibleRoles.includes(user.role) && (!a.deadline || new Date(a.deadline) >= new Date())
  ).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

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

  const getPriorityIndicator = (priority: AnnouncementPriority) => {
    switch (priority) {
      case AnnouncementPriority.URGENT: return <span className="w-2 h-2 rounded-full bg-red-500" />;
      case AnnouncementPriority.HIGH: return <span className="w-2 h-2 rounded-full bg-orange-500" />;
      case AnnouncementPriority.NORMAL: return <span className="w-2 h-2 rounded-full bg-green-500" />;
      default: return <span className="w-2 h-2 rounded-full bg-slate-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Hace unos minutos';
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const totalEmployees = employees.length;
  const totalDocuments = docCount;
  const pinnedAnnouncements = visibleAnnouncements.filter(a => a.isPinned).length;

  return (
    <div className="space-y-6">
      {/* Header de bienvenida */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-2">
          Bienvenido, {user.name}
        </h1>
        <p className="text-blue-100">
          Intranet Corporativa de Listosoft - {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Widgets de acceso rápido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('announcements')}
          className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <MegaphoneIcon />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{visibleAnnouncements.length}</p>
              <p className="text-sm text-slate-500">Anuncios</p>
            </div>
          </div>
          {pinnedAnnouncements > 0 && (
            <p className="mt-3 text-xs text-blue-600 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {pinnedAnnouncements} importante{pinnedAnnouncements > 1 ? 's' : ''}
            </p>
          )}
        </button>

        <button
          onClick={() => onNavigate('documents')}
          className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-green-300 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <FolderIcon />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalDocuments}</p>
              <p className="text-sm text-slate-500">Documentos</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-green-600 font-medium">
            Repositorio corporativo
          </p>
        </button>

        <button
          onClick={() => onNavigate('employees')}
          className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-purple-300 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <UsersIcon />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalEmployees}</p>
              <p className="text-sm text-slate-500">Colaboradores</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-purple-600 font-medium">
            Directorio de empleados
          </p>
        </button>

        <button
          onClick={() => onNavigate('backups')}
          className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:border-amber-300 transition text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <ServerIcon />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">Sistema</p>
              <p className="text-sm text-slate-500">Respaldos</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-amber-600 font-medium">
            Control de backups
          </p>
        </button>
      </div>

      {/* Sección de anuncios */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anuncios principales */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <MegaphoneIcon /> Últimos Anuncios
            </h2>
            <button
              onClick={() => onNavigate('announcements')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-slate-500 mt-2 text-sm">Cargando anuncios...</p>
              </div>
            ) : visibleAnnouncements.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-slate-200">
                <p className="text-slate-500 text-sm">No hay anuncios disponibles.</p>
              </div>
            ) : (
              visibleAnnouncements.slice(0, 4).map((announcement) => (
                <div
                  key={announcement.id}
                  className={`bg-white rounded-xl p-5 shadow-sm border-l-4 ${announcement.isPinned ? 'border-l-blue-500 bg-blue-50/30' : 'border-l-slate-300'
                    } hover:shadow-md transition`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {announcement.isPinned && (
                          <span className="text-blue-500" title="Anuncio fijado">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getCategoryColor(announcement.category)}`}>
                          {getCategoryLabel(announcement.category)}
                        </span>
                        {getPriorityIndicator(announcement.priority)}
                      </div>
                      <h3 className="font-semibold text-slate-800 mb-2">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {announcement.content}
                      </p>
                      {announcement.deadline && (
                        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 text-xs font-medium shadow-sm">
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Vigente hasta el {new Date(announcement.deadline).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                        <span>Por {announcement.createdByName}</span>
                        <span>•</span>
                        <span>{formatDate(announcement.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Accesos rápidos */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <BoltIcon /> Accesos Rápidos
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => onNavigate('profile')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-left"
              >
                <span className="text-slate-500"><UserIcon /></span>
                <span className="text-sm text-slate-700">Mi Perfil</span>
              </button>
              <a
                href="https://control-asistencias-prod.web.app/employee/permissions"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-left"
              >
                <span className="text-slate-500"><DocumentIcon /></span>
                <span className="text-sm text-slate-700">Solicitar Permiso</span>
              </a>
              <a
                href="https://calendar.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-left"
              >
                <span className="text-slate-500"><CalendarIcon /></span>
                <span className="text-sm text-slate-700">Calendario</span>
              </a>
              <button
                onClick={() => onNavigate('employees')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 transition text-left"
              >
                <span className="text-slate-500"><PhoneIcon /></span>
                <span className="text-sm text-slate-700">Contactos</span>
              </button>
            </div>
          </div>

          {/* Cumpleaños del mes */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CakeIcon /> Cumpleaños del Mes
            </h3>
            <div className="space-y-3">
              {employees
                .filter(e => {
                  if (!e.birthday) return false;
                  const [year, month, day] = e.birthday.split('-').map(Number);
                  const now = new Date();
                  return month === now.getMonth() + 1;
                })
                .slice(0, 3)
                .map(employee => (
                  <div key={employee.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {employee.name} {employee.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(() => {
                          if (!employee.birthday) return '-';
                          const [year, month, day] = employee.birthday.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
                        })()}
                      </p>
                    </div>
                  </div>
                ))}
              {employees.filter(e => {
                if (!e.birthday) return false;
                const [year, month, day] = e.birthday.split('-').map(Number);
                return month === new Date().getMonth() + 1;
              }).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-2">
                    No hay cumpleaños este mes
                  </p>
                )}
            </div>
          </div>

          {/* Info de la empresa */}
          <div className="bg-slate-800 rounded-xl p-5 text-white">
            <div className="flex items-center gap-3 mb-4">
              <img src="/assets/Logo-Listosoft.png" alt="Listosoft" className="h-8 w-auto" />
            </div>
            <p className="text-sm text-slate-300 mb-3">
              Soluciones tecnológicas para tu negocio
            </p>
            <div className="text-xs text-slate-400 space-y-2">
              <p className="flex items-center gap-2">
                <MailIcon /> info@listosoft.com
              </p>
              <p className="flex items-center gap-2">
                <PhoneIcon /> (02) 123-4567
              </p>
              <p className="flex items-center gap-2">
                <GlobeIcon /> www.listosoft.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
