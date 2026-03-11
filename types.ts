
export enum UserRole {
  ADMIN = 'ADMIN',
  TECH = 'TECH',
  SOPORTE = 'SOPORTE'
}

// Etiquetas legibles para los roles
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.TECH]: 'Técnico',
  [UserRole.SOPORTE]: 'Soporte',
};

// ==================== INTRANET TYPES ====================

export enum AnnouncementCategory {
  GENERAL = 'GENERAL',
  TECH = 'TECH',
  RRHH = 'RRHH',
  ADMIN = 'ADMIN',
  URGENT = 'URGENT'
}

export enum AnnouncementPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  visibleRoles: string[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  expiresAt?: string;
  deadline?: string;
  isPinned: boolean;
}

export interface Document {
  id: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  fileUrl: string;
  createdAt: string;
  fileSize: string;
  fileType: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  icon: string;
  parentId?: string;
  description?: string;
}

export interface Employee {
  id: string;
  userId: string;
  name: string;
  lastName: string;
  email: string;
  department: string;
  position: string;
  phone?: string;
  extension?: string;
  birthday?: string;
  hireDate?: string;
  photoUrl?: string;
  role: string;
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  password?: string;
  role: string;
}

export enum BackupStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  WARNING = 'WARNING',
  FAILED = 'FAILED'
}

export enum FrequencyType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM = 'CUSTOM'
}

export enum BackupType {
  DATABASE = 'DATABASE',
  FTP = 'FTP',
  EXTERNAL_DISK = 'EXTERNAL_DISK',
  CLOUD = 'CLOUD',
  DELETE_BACKUP = 'DELETE_BACKUP'
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: BackupType;
  frequency: FrequencyType;
  daysOfWeek?: number[];
  description: string;
}

export interface Server {
  id: string;
  name: string;
}

export interface ClientEntry {
  id: string;
  clientName: string;
  clientRuc: string;
  ownerCompany: string;
  ownerRuc: string;
  dbName: string;
  server: string;
  group: string;
  subscriptionActive: boolean;
}

export interface ClientContact {
  id: string;
  clientId: string;
  name: string;
  position: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface BackupLog {
  id: string;
  scheduleId: string;
  status: BackupStatus;
  timestamp: string;
  userId: string;
  userName: string;
  notes: string;
  dateStr: string;
  scheduleName?: string;
}
