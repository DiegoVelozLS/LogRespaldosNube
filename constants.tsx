
import React from 'react';
import { User, UserRole, BackupType, BackupSchedule, FrequencyType, Announcement, AnnouncementCategory, AnnouncementPriority, Document, DocumentCategory, Employee } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u0', name: 'Admin', lastName: 'Listosoft', email: 'admin@listosoft.com', password: '12345', role: UserRole.ADMIN },
  { id: 'u1', name: 'Usuario', lastName: 'Admin', email: 'admin@company.com', password: 'admin', role: UserRole.ADMIN },
  { id: 'u2', name: 'Juan', lastName: 'Técnico', email: 'john@company.com', password: 'tech', role: UserRole.TECH },
  { id: 'u3', name: 'Sara', lastName: 'Supervisor', email: 'supervisor@company.com', password: 'super', role: UserRole.SUPERVISOR },
];

// ==================== INTRANET MOCK DATA ====================

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e1', userId: 'u0', name: 'Diego', lastName: 'Rodríguez', email: 'diego@listosoft.com', department: 'Gerencia', position: 'Gerente General', phone: '0991234567', extension: '101', birthday: '1985-03-15', hireDate: '2015-01-01', photoUrl: '', role: UserRole.ADMIN },
  { id: 'e2', userId: 'u1', name: 'Carlos', lastName: 'López', email: 'carlos@listosoft.com', department: 'Desarrollo', position: 'Líder de Desarrollo', phone: '0992345678', extension: '201', birthday: '1990-07-22', hireDate: '2018-03-15', photoUrl: '', role: UserRole.SUPERVISOR },
  { id: 'e3', userId: 'u2', name: 'Juan', lastName: 'Pérez', email: 'juan@listosoft.com', department: 'Soporte Técnico', position: 'Técnico Senior', phone: '0993456789', extension: '301', birthday: '1992-11-08', hireDate: '2019-06-01', photoUrl: '', role: UserRole.TECH },
  { id: 'e4', userId: 'u3', name: 'María', lastName: 'García', email: 'maria@listosoft.com', department: 'Recursos Humanos', position: 'Jefe de RRHH', phone: '0994567890', extension: '401', birthday: '1988-05-12', hireDate: '2017-09-01', photoUrl: '', role: UserRole.RRHH },
  { id: 'e5', userId: 'u4', name: 'Ana', lastName: 'Martínez', email: 'ana@listosoft.com', department: 'Administración', position: 'Contadora', phone: '0995678901', extension: '501', birthday: '1991-02-28', hireDate: '2020-01-15', photoUrl: '', role: UserRole.EMPLOYEE },
  { id: 'e6', userId: 'u5', name: 'Pedro', lastName: 'Sánchez', email: 'pedro@listosoft.com', department: 'Desarrollo', position: 'Desarrollador Full Stack', phone: '0996789012', extension: '202', birthday: '1995-09-03', hireDate: '2021-04-01', photoUrl: '', role: UserRole.TECH },
  { id: 'e7', userId: 'u6', name: 'Laura', lastName: 'Fernández', email: 'laura@listosoft.com', department: 'Soporte Técnico', position: 'Técnico de Soporte', phone: '0997890123', extension: '302', birthday: '1993-12-18', hireDate: '2022-02-01', photoUrl: '', role: UserRole.TECH },
  { id: 'e8', userId: 'u7', name: 'Roberto', lastName: 'Díaz', email: 'roberto@listosoft.com', department: 'Desarrollo', position: 'Desarrollador Backend', phone: '0998901234', extension: '203', birthday: '1994-06-25', hireDate: '2021-08-15', photoUrl: '', role: UserRole.TECH },
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1',
    title: 'Bienvenida al nuevo sistema de Intranet',
    content: 'Nos complace presentar el nuevo sistema de intranet de Listosoft. Aquí encontrarás toda la información importante de la empresa, documentos, directorio de empleados y mucho más.',
    category: AnnouncementCategory.GENERAL,
    priority: AnnouncementPriority.HIGH,
    visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE],
    createdBy: 'u0',
    createdByName: 'Diego Rodríguez',
    createdAt: '2026-03-01T09:00:00',
    isPinned: true
  },
  {
    id: 'a2',
    title: 'Mantenimiento programado de servidores',
    content: 'Se realizará mantenimiento preventivo en los servidores principales el próximo sábado 8 de marzo de 10:00 PM a 2:00 AM. Durante este período algunos servicios podrían no estar disponibles.',
    category: AnnouncementCategory.TECH,
    priority: AnnouncementPriority.URGENT,
    visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR],
    createdBy: 'u2',
    createdByName: 'Juan Pérez',
    createdAt: '2026-03-02T14:30:00',
    isPinned: true
  },
  {
    id: 'a3',
    title: 'Actualización de políticas de vacaciones 2026',
    content: 'Se han actualizado las políticas de vacaciones para el año 2026. Por favor revisar el documento adjunto en el repositorio de RRHH y firmar el acuse de recibo antes del 15 de marzo.',
    category: AnnouncementCategory.RRHH,
    priority: AnnouncementPriority.NORMAL,
    visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE],
    createdBy: 'u3',
    createdByName: 'María García',
    createdAt: '2026-03-01T11:00:00',
    isPinned: false
  },
  {
    id: 'a4',
    title: 'Cumpleaños del mes de Marzo',
    content: 'Este mes celebramos el cumpleaños de: Pedro Sánchez (3 de marzo), Ana Martínez (28 de marzo). ¡Felicidades a todos!',
    category: AnnouncementCategory.GENERAL,
    priority: AnnouncementPriority.LOW,
    visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE],
    createdBy: 'u3',
    createdByName: 'María García',
    createdAt: '2026-03-01T08:00:00',
    isPinned: false
  },
  {
    id: 'a5',
    title: 'Cierre contable Q1 2026',
    content: 'Recordatorio: El cierre contable del primer trimestre será el 31 de marzo. Todos los departamentos deben enviar sus reportes de gastos antes del 25 de marzo.',
    category: AnnouncementCategory.ADMIN,
    priority: AnnouncementPriority.HIGH,
    visibleRoles: [UserRole.ADMIN, UserRole.SUPERVISOR],
    createdBy: 'u4',
    createdByName: 'Ana Martínez',
    createdAt: '2026-03-02T10:00:00',
    isPinned: false
  },
  {
    id: 'a6',
    title: 'Nueva versión del sistema de respaldos',
    content: 'Se ha desplegado la versión 2.0 del sistema de control de respaldos. Las principales mejoras incluyen: reportes automáticos, alertas por correo y nuevo dashboard.',
    category: AnnouncementCategory.TECH,
    priority: AnnouncementPriority.NORMAL,
    visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR],
    createdBy: 'u1',
    createdByName: 'Carlos López',
    createdAt: '2026-02-28T16:00:00',
    isPinned: false
  }
];

export const MOCK_DOCUMENT_CATEGORIES: DocumentCategory[] = [
  { id: 'dc1', name: 'Recursos Humanos', icon: 'users', description: 'Documentos de RRHH, políticas y formatos' },
  { id: 'dc2', name: 'Técnicos', icon: 'cog', description: 'Manuales técnicos y procedimientos' },
  { id: 'dc3', name: 'Administrativos', icon: 'chart', description: 'Documentos administrativos y financieros' },
  { id: 'dc4', name: 'Públicos', icon: 'folder', description: 'Documentos de acceso general' },
  { id: 'dc5', name: 'Plantillas', icon: 'document', description: 'Plantillas y formatos editables' },
];

export const MOCK_DOCUMENTS: Document[] = [
  { id: 'doc1', name: 'Manual del Empleado 2026', description: 'Guía completa de políticas y procedimientos internos', category: 'Recursos Humanos', categoryId: 'dc1', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE], uploadedBy: 'u3', uploadedByName: 'María García', createdAt: '2026-01-15T10:00:00', fileSize: '2.5 MB', fileType: 'PDF' },
  { id: 'doc2', name: 'Política de Vacaciones', description: 'Normativa actualizada sobre solicitud y aprobación de vacaciones', category: 'Recursos Humanos', categoryId: 'dc1', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE], uploadedBy: 'u3', uploadedByName: 'María García', createdAt: '2026-02-01T09:00:00', fileSize: '450 KB', fileType: 'PDF' },
  { id: 'doc3', name: 'Formato Solicitud de Permisos', description: 'Formato oficial para solicitar permisos laborales', category: 'Recursos Humanos', categoryId: 'dc1', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE], uploadedBy: 'u3', uploadedByName: 'María García', createdAt: '2026-01-20T11:00:00', fileSize: '125 KB', fileType: 'DOCX' },
  { id: 'doc4', name: 'Manual de Procedimientos de Respaldos', description: 'Guía técnica para la ejecución de respaldos', category: 'Técnicos', categoryId: 'dc2', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR], uploadedBy: 'u2', uploadedByName: 'Juan Pérez', createdAt: '2026-02-15T14:00:00', fileSize: '3.2 MB', fileType: 'PDF' },
  { id: 'doc5', name: 'Guía de Instalación de Software', description: 'Procedimientos estándar para instalación de software corporativo', category: 'Técnicos', categoryId: 'dc2', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR], uploadedBy: 'u1', uploadedByName: 'Carlos López', createdAt: '2026-01-10T16:00:00', fileSize: '1.8 MB', fileType: 'PDF' },
  { id: 'doc6', name: 'Organigrama Listosoft 2026', description: 'Estructura organizacional actualizada', category: 'Públicos', categoryId: 'dc4', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE], uploadedBy: 'u0', uploadedByName: 'Diego Rodríguez', createdAt: '2026-01-05T09:00:00', fileSize: '890 KB', fileType: 'PDF' },
  { id: 'doc7', name: 'Directorio de Contactos', description: 'Lista de contactos internos y externos importantes', category: 'Públicos', categoryId: 'dc4', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE], uploadedBy: 'u3', uploadedByName: 'María García', createdAt: '2026-02-20T10:00:00', fileSize: '320 KB', fileType: 'XLSX' },
  { id: 'doc8', name: 'Plantilla de Informe Mensual', description: 'Formato estándar para informes mensuales', category: 'Plantillas', categoryId: 'dc5', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.SUPERVISOR], uploadedBy: 'u4', uploadedByName: 'Ana Martínez', createdAt: '2026-01-25T13:00:00', fileSize: '245 KB', fileType: 'DOCX' },
  { id: 'doc9', name: 'Reglamento Interno', description: 'Reglamento interno de trabajo actualizado', category: 'Recursos Humanos', categoryId: 'dc1', fileUrl: '#', visibleRoles: [UserRole.ADMIN, UserRole.TECH, UserRole.SUPERVISOR, UserRole.RRHH, UserRole.EMPLOYEE], uploadedBy: 'u3', uploadedByName: 'María García', createdAt: '2026-01-08T10:00:00', fileSize: '1.2 MB', fileType: 'PDF' },
];

// ==================== BACKUP SYSTEM DATA ====================

export const MOCK_SCHEDULES: BackupSchedule[] = [
  {
    id: 's1',
    name: 'Base de Datos PostgreSQL Principal',
    type: BackupType.DATABASE,
    frequency: FrequencyType.DAILY,
    description: 'Volcado crítico de la base de datos cada medianoche.'
  },
  {
    id: 's2',
    name: 'Almacenamiento FTP Legado',
    type: BackupType.FTP,
    frequency: FrequencyType.WEEKLY,
    daysOfWeek: [1],
    description: 'Sincronización semanal de activos archivados.'
  },
  {
    id: 's3',
    name: 'Respaldo Nube AWS S3',
    type: BackupType.CLOUD,
    frequency: FrequencyType.CUSTOM,
    daysOfWeek: [1, 3, 5], // Lunes, Miércoles, Viernes
    description: 'Sincronización de documentos críticos a la nube.'
  }
];

export const STATUS_COLORS = {
  PENDING: 'bg-gray-100 text-gray-600 border-gray-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  WARNING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  FAILED: 'bg-red-100 text-red-700 border-red-200',
};

export const BACKUP_TYPE_ICONS: Record<BackupType, string> = {
  [BackupType.DATABASE]: '🗄️',
  [BackupType.FTP]: '📁',
  [BackupType.EXTERNAL_DISK]: '💾',
  [BackupType.CLOUD]: '☁️',
  [BackupType.DELETE_BACKUP]: '🗑️'
};

export const APP_VERSION = '1.0.0';
