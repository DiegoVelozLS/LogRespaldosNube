
import React from 'react';
import { User, UserRole, BackupType, BackupSchedule, FrequencyType } from './types';

export const MOCK_USERS: User[] = [
  { id: 'u0', name: 'Admin', lastName: 'Listosoft', email: 'admin@listosoft.com', password: '12345', role: UserRole.ADMIN },
  { id: 'u1', name: 'Usuario', lastName: 'Admin', email: 'admin@company.com', password: 'admin', role: UserRole.ADMIN },
  { id: 'u2', name: 'Juan', lastName: 'Técnico', email: 'john@company.com', password: 'tech', role: UserRole.TECH },
  { id: 'u3', name: 'Sara', lastName: 'Supervisor', email: 'supervisor@company.com', password: 'super', role: UserRole.SUPERVISOR },
];

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
  [BackupType.CLOUD]: '☁️'
};
