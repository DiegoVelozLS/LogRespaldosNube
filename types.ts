
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
  parentFolderId?: string;
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

export interface AnnouncementNotification {
  notifyByEmail: boolean;
  recipientType: 'ALL' | 'SPECIFIC';
  selectedUserIds: string[];
}

export interface VaultFieldSchema {
  name: string;
  label: string;
  required: boolean;
}

export interface VaultCategory {
  id: string;
  name: string;
  icon: string;
  fields_schema: VaultFieldSchema[];
}

export interface VaultCredential {
  id: string;
  vaultCategoryId: string;
  title: string;
  username: string;
  metadata: Record<string, any>;
  notes?: string;
  updatedAt: string;
  lastAccessedAt?: string;
  lastPasswordRotationAt?: string;
}

export interface VaultCredentialInput {
  id?: string;
  vaultCategoryId: string;
  title: string;
  username: string;
  password?: string;
  metadata: Record<string, any>;
  notes?: string;
}

export interface VaultAuditLog {
  id: string;
  credentialId: string;
  credentialTitle: string;
  vaultCategoryId: string;
  vaultCategoryName: string;
  actorUserId: string;
  actorName: string;
  action: string;
  createdAt: string;
}

export interface BackupFtpFile {
  name: string;
  path: string;
  sizeBytes: number;
  sizeFormatted: string;
  modifiedAt: string;
  isFolder: boolean;
  isDirectory?: boolean;
  server?: string;
  fileType: string;
}

export interface BackupDownloadAuditRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  filename: string;
  filepath: string;
  filesizeBytes: number;
  serverName?: string;
  downloadedAt: string;
  ipAddress?: string;
  status: 'completed' | 'failed' | 'in_progress';
}

export interface AuditSummaryStats {
  todayDownloadBytes: number;
  todayCount: number;
  monthDownloadBytes: number;
  monthCount: number;
  monthUsedGbPercentage: number;
  azureEstimatedCostUsd: number;
  topUser?: { name: string; email: string; bytes: number };
  topServer?: { name: string; bytes: number };
  dailyTrend: Array<{ date: string; bytes: number; count: number }>;
}
