
import { BackupSchedule, BackupLog, User, BackupStatus, UserRole } from '../types';
import { MOCK_SCHEDULES, MOCK_USERS } from '../constants';

const LOGS_KEY = 'cloudguard_logs';
const SCHEDULES_KEY = 'cloudguard_schedules';
const USER_KEY = 'cloudguard_current_user';
const USERS_LIST_KEY = 'cloudguard_users_list';

export const dataService = {
  // Authentication
  login: (email: string, pass: string): User | null => {
    const users = dataService.getUsers();
    const user = users.find(u => u.email === email && u.password === pass);
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  logout: () => {
    localStorage.removeItem(USER_KEY);
  },

  // User Management
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_LIST_KEY);
    return data ? JSON.parse(data) : MOCK_USERS;
  },

  saveUser: (user: Omit<User, 'id'>) => {
    const users = dataService.getUsers();
    const newUser = { ...user, id: Math.random().toString(36).substr(2, 9) };
    users.push(newUser);
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
    return newUser;
  },

  updateUser: (id: string, user: Partial<Omit<User, 'id'>>) => {
    const users = dataService.getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...user };
      localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
      return users[index];
    }
    return null;
  },

  changePassword: (userId: string, currentPassword: string, newPassword: string): boolean => {
    const users = dataService.getUsers();
    const user = users.find(u => u.id === userId);
    if (user && user.password === currentPassword) {
      user.password = newPassword;
      localStorage.setItem(USERS_LIST_KEY, JSON.stringify(users));
      // Actualizar usuario actual en sesión
      const currentUser = dataService.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        currentUser.password = newPassword;
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      }
      return true;
    }
    return false;
  },

  deleteUser: (id: string) => {
    const users = dataService.getUsers();
    const filteredUsers = users.filter(u => u.id !== id);
    localStorage.setItem(USERS_LIST_KEY, JSON.stringify(filteredUsers));
  },

  // Schedules
  getSchedules: (): BackupSchedule[] => {
    const data = localStorage.getItem(SCHEDULES_KEY);
    return data ? JSON.parse(data) : MOCK_SCHEDULES;
  },

  saveSchedule: (schedule: Omit<BackupSchedule, 'id'>) => {
    const schedules = dataService.getSchedules();
    const newSchedule = { ...schedule, id: Math.random().toString(36).substr(2, 9) };
    schedules.push(newSchedule);
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
    return newSchedule;
  },

  updateSchedule: (id: string, schedule: Partial<Omit<BackupSchedule, 'id'>>) => {
    const schedules = dataService.getSchedules();
    const index = schedules.findIndex(s => s.id === id);
    if (index !== -1) {
      schedules[index] = { ...schedules[index], ...schedule };
      localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
      return schedules[index];
    }
    return null;
  },

  deleteSchedule: (id: string) => {
    const schedules = dataService.getSchedules();
    const filteredSchedules = schedules.filter(s => s.id !== id);
    localStorage.setItem(SCHEDULES_KEY, JSON.stringify(filteredSchedules));
  },

  // Logs
  getLogs: (): BackupLog[] => {
    const data = localStorage.getItem(LOGS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveLog: (log: Omit<BackupLog, 'id'>): BackupLog => {
    const logs = dataService.getLogs();
    const newLog: BackupLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
    };
    logs.push(newLog);
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    return newLog;
  },

  deleteLog: (logId: string) => {
    const logs = dataService.getLogs();
    const filteredLogs = logs.filter(l => l.id !== logId);
    localStorage.setItem(LOGS_KEY, JSON.stringify(filteredLogs));
  },

  getTasksForDate: (date: Date): { schedule: BackupSchedule; log?: BackupLog }[] => {
    const schedules = dataService.getSchedules();
    const logs = dataService.getLogs();
    const dateStr = date.toISOString().split('T')[0];
    const dayOfWeek = date.getDay();

    return schedules
      .filter(s => {
        if (s.frequency === 'DAILY') return true;
        if (s.frequency === 'WEEKLY' || s.frequency === 'CUSTOM') {
          return s.daysOfWeek?.includes(dayOfWeek);
        }
        return false;
      })
      .map(s => ({
        schedule: s,
        log: logs.find(l => l.scheduleId === s.id && l.dateStr === dateStr)
      }));
  }
};
