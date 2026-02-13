
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { BackupSchedule, BackupLog, User, BackupStatus, UserRole, BackupType, FrequencyType } from '../types';

export const supabaseDataService = {
  // ==================== AUTHENTICATION ====================

  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          return {
            id: profile.id,
            name: profile.name,
            lastName: profile.last_name,
            email: profile.email,
            role: profile.role as UserRole
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        return {
          id: profile.id,
          name: profile.name,
          lastName: profile.last_name,
          email: profile.email,
          role: profile.role as UserRole
        };
      }
      return null;
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  changePassword: async (userId: string, currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      // Supabase requiere que el usuario esté autenticado para cambiar contraseña
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Change password error:', error);
      return false;
    }
  },

  // ==================== USER MANAGEMENT ====================

  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(u => ({
        id: u.id,
        name: u.name,
        lastName: u.last_name,
        email: u.email,
        role: u.role as UserRole
      }));
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  },

  saveUser: async (user: { name: string; lastName: string; email: string; password: string; role: UserRole }): Promise<User | null> => {
    try {
      // Usar un cliente temporal para no cerrar la sesión del admin actual
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey);

      // Crear usuario en auth.users usando el cliente temporal
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            name: user.name,
            last_name: user.lastName,
            role: user.role
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) return null;

      // El trigger automáticamente creará el registro en public.users
      // Esperar un momento y consultar usando el cliente PRINCIPAL (Admin)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError) console.error('Profile fetch error:', profileError);

      if (profile) {
        return {
          id: profile.id,
          name: profile.name,
          lastName: profile.last_name,
          email: profile.email,
          role: profile.role as UserRole
        };
      }

      return null;
    } catch (error) {
      console.error('Save user error:', error);
      return null;
    }
  },

  updateUser: async (id: string, updates: Partial<Omit<User, 'id' | 'email'>> & { password?: string }): Promise<boolean> => {
    try {
      // 1. Actualizar datos del perfil (public.users)
      const dbUpdates: Record<string, any> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.lastName) dbUpdates.last_name = updates.lastName;
      if (updates.role) dbUpdates.role = updates.role;

      const { error: profileError } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', id);

      if (profileError) throw profileError;

      // 2. Si hay contraseña, actualizarla usando RPC seguro (auth.users)
      if (updates.password && updates.password.length >= 6) {
        const { error: passwordError } = await supabase.rpc('admin_update_password', {
          target_user_id: id,
          new_password: updates.password
        });

        if (passwordError) throw passwordError;
      }

      return true;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  },

  deleteUser: async (id: string): Promise<boolean> => {
    try {
      // Usar la función RPC segura para eliminar de auth.users y public.users
      const { error } = await supabase.rpc('delete_user_completely', { target_user_id: id });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      return false;
    }
  },

  // ==================== SCHEDULES ====================

  getSchedules: async (): Promise<BackupSchedule[]> => {
    try {
      const { data, error } = await supabase
        .from('backup_schedules')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type as BackupType,
        frequency: s.frequency as FrequencyType,
        daysOfWeek: s.days_of_week || undefined,
        description: s.description || ''
      }));
    } catch (error) {
      console.error('Get schedules error:', error);
      return [];
    }
  },

  saveSchedule: async (schedule: Omit<BackupSchedule, 'id'>): Promise<BackupSchedule | null> => {
    try {
      const { data, error } = await supabase
        .from('backup_schedules')
        .insert({
          name: schedule.name,
          type: schedule.type,
          frequency: schedule.frequency,
          days_of_week: schedule.daysOfWeek || null,
          description: schedule.description
        } as any)
        .select()
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        type: data.type as BackupType,
        frequency: data.frequency as FrequencyType,
        daysOfWeek: data.days_of_week || undefined,
        description: data.description || ''
      };
    } catch (error) {
      console.error('Save schedule error:', error);
      return null;
    }
  },

  updateSchedule: async (id: string, updates: Partial<Omit<BackupSchedule, 'id'>>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.type) dbUpdates.type = updates.type;
      if (updates.frequency) dbUpdates.frequency = updates.frequency;
      if (updates.daysOfWeek !== undefined) dbUpdates.days_of_week = updates.daysOfWeek || null;
      if (updates.description !== undefined) dbUpdates.description = updates.description;

      const { error } = await supabase
        .from('backup_schedules')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update schedule error:', error);
      return false;
    }
  },

  deleteSchedule: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('backup_schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete schedule error:', error);
      return false;
    }
  },

  // ==================== LOGS ====================

  getLogs: async (): Promise<BackupLog[]> => {
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .select(`
          *,
          schedule:backup_schedules(name),
          user:users(name, last_name)
        `)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((log: any) => ({
        id: log.id,
        scheduleId: log.schedule_id,
        status: log.status as BackupStatus,
        timestamp: log.timestamp,
        userId: log.user_id || '',
        userName: log.user ? `${log.user.name} ${log.user.last_name}` : 'Usuario eliminado',
        notes: log.notes || '',
        dateStr: log.date_str,
        scheduleName: log.schedule?.name || 'Tarea eliminada'
      }));
    } catch (error) {
      console.error('Get logs error:', error);
      return [];
    }
  },

  saveLog: async (log: Omit<BackupLog, 'id' | 'userName' | 'scheduleName'>): Promise<BackupLog | null> => {
    try {
      const { data, error } = await supabase
        .from('backup_logs')
        .insert({
          schedule_id: log.scheduleId,
          user_id: log.userId,
          status: log.status,
          notes: log.notes,
          date_str: log.dateStr,
          timestamp: log.timestamp
        } as any)
        .select(`
          *,
          schedule:backup_schedules(name),
          user:users(name, last_name)
        `)
        .single();

      if (error) throw error;
      if (!data) return null;

      const result: any = data;
      return {
        id: result.id,
        scheduleId: result.schedule_id,
        status: result.status as BackupStatus,
        timestamp: result.timestamp,
        userId: result.user_id || '',
        userName: result.user ? `${result.user.name} ${result.user.last_name}` : '',
        notes: result.notes || '',
        dateStr: result.date_str,
        scheduleName: result.schedule?.name || ''
      };
    } catch (error) {
      console.error('Save log error:', error);
      return null;
    }
  },

  deleteLog: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('backup_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete log error:', error);
      return false;
    }
  },

  // ==================== HELPER FUNCTIONS ====================

  getTasksForDate: async (date: Date): Promise<{ schedule: BackupSchedule; log?: BackupLog }[]> => {
    try {
      const schedules = await supabaseDataService.getSchedules();
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay(); // 0 = Domingo

      const { data: logs, error } = await supabase
        .from('backup_logs')
        .select(`
          *,
          schedule:backup_schedules(name),
          user:users(name, last_name)
        `)
        .eq('date_str', dateStr);

      if (error) throw error;
      if (!logs) return [];

      const logsMap = new Map(
        logs.map((log: any) => [
          log.schedule_id,
          {
            id: log.id,
            scheduleId: log.schedule_id,
            status: log.status as BackupStatus,
            timestamp: log.timestamp,
            userId: log.user_id || '',
            userName: log.user ? `${log.user.name} ${log.user.last_name}` : '',
            notes: log.notes || '',
            dateStr: log.date_str,
            scheduleName: log.schedule?.name || ''
          } as BackupLog
        ])
      );

      return schedules
        .filter(schedule => {
          if (schedule.frequency === FrequencyType.DAILY) return true;
          if (schedule.frequency === FrequencyType.WEEKLY || schedule.frequency === FrequencyType.CUSTOM) {
            return schedule.daysOfWeek?.includes(dayOfWeek) || false;
          }
          return false;
        })
        .map(schedule => ({
          schedule,
          log: logsMap.get(schedule.id)
        }));
    } catch (error) {
      console.error('Get tasks for date error:', error);
      return [];
    }
  },

  getMonthlyReport: async (year: number, month: number): Promise<BackupLog[]> => {
    try {
      let startDate: string;
      let endDate: string;

      if (month === -1) {
        // Todo el año
        startDate = `${year}-01-01`;
        endDate = `${year}-12-31`;
      } else {
        // Mes específico
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        startDate = start.toISOString().split('T')[0];
        endDate = end.toISOString().split('T')[0];
      }

      const { data, error } = await supabase
        .from('backup_logs')
        .select(`
          *,
          schedule:backup_schedules(name),
          user:users(name, last_name)
        `)
        .gte('date_str', startDate)
        .lte('date_str', endDate)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map((log: any) => ({
        id: log.id,
        scheduleId: log.schedule_id,
        status: log.status as BackupStatus,
        timestamp: log.timestamp,
        userId: log.user_id || '',
        userName: log.user ? `${log.user.name} ${log.user.last_name}` : 'Usuario eliminado',
        notes: log.notes || '',
        dateStr: log.date_str,
        scheduleName: log.schedule?.name || 'Tarea eliminada'
      }));
    } catch (error) {
      console.error('Get monthly report error:', error);
      return [];
    }
  }
};
