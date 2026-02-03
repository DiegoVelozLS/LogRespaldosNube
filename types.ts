
export enum UserRole {
  ADMIN = 'ADMIN',
  TECH = 'TECH',
  SUPERVISOR = 'SUPERVISOR'
}

export interface User {
  id: string;
  name: string;
  lastName: string;
  email: string;
  password?: string;
  role: UserRole;
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
  SPECIFIC_DAYS = 'SPECIFIC_DAYS'
}

export enum BackupType {
  DATABASE = 'DATABASE',
  FTP = 'FTP',
  EXTERNAL_DISK = 'EXTERNAL_DISK',
  CLOUD = 'CLOUD'
}

export interface BackupSchedule {
  id: string;
  name: string;
  type: BackupType;
  frequency: FrequencyType;
  daysOfWeek?: number[];
  description: string;
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
}
