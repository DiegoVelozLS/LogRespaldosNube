
export enum UserRole {
  ADMIN = 'ADMIN',
  TECH = 'TECH',
  SUPERVISOR = 'SUPERVISOR'
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions?: string[];
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  password?: string;
  role: string; // Cambio de UserRole a string para ser dinámico
  roleId?: string;
  permissions?: string[]; // Lista de keys: 'dashboard', 'calendar', etc.
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
