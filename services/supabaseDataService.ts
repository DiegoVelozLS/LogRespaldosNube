
import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { BackupSchedule, BackupLog, User, BackupStatus, Role, UserRole, BackupType, FrequencyType, ClientEntry, Server, Employee, ClientContact } from '../types';

export const supabaseDataService = {
  // ==================== AUTHENTICATION ====================

  loginWithGoogle: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) {
      console.error('Google login error:', error);
      throw error;
    }
  },

  // Obtiene o crea el perfil del usuario en public.users (para OAuth)
  getOrCreateUserProfile: async (authUser: { id: string; email?: string; user_metadata?: any }): Promise<User | null> => {
    try {
      console.log('getOrCreateUserProfile called with:', authUser.id, authUser.email);
      
      // Primero intentar obtener el perfil existente
      const { data: existingProfile, error: fetchError } = await supabase
        .from('users')
        .select(`
          *,
          roles(id, name, description, role_permissions(permission_key))
        `)
        .eq('id', authUser.id)
        .single();

      console.log('Existing profile query result:', existingProfile, 'Error:', fetchError);

      if (existingProfile) {
        const roleData = existingProfile.roles as any;
        return {
          id: existingProfile.id,
          name: existingProfile.name,
          lastName: existingProfile.last_name,
          email: existingProfile.email,
          role: roleData?.name || existingProfile.role,
          roleId: existingProfile.role_id,
          permissions: roleData?.role_permissions?.map((p: any) => p.permission_key) || []
        };
      }

      // Si no existe, crear nuevo perfil con rol por defecto (EMPLOYEE)
      const metadata = authUser.user_metadata || {};
      console.log('User metadata from Google:', metadata);
      
      // Google provee given_name y family_name directamente
      const firstName = metadata.given_name || metadata.name?.split(' ')[0] || 'Usuario';
      const lastName = metadata.family_name || metadata.name?.split(' ').slice(1).join(' ') || '';

      // Obtener el rol EMPLOYEE por defecto
      const { data: defaultRole, error: roleError } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'EMPLOYEE')
        .single();

      console.log('Default role query:', defaultRole, 'Error:', roleError);

      const insertData = {
        id: authUser.id,
        email: authUser.email || '',
        name: firstName,
        last_name: lastName,
        role: 'EMPLOYEE',
        role_id: defaultRole?.id || null
      };
      console.log('Attempting to insert user:', insertData);

      const { data: newProfile, error: insertError } = await supabase
        .from('users')
        .insert(insertData)
        .select(`
          *,
          roles(id, name, description, role_permissions(permission_key))
        `)
        .single();

      console.log('Insert result:', newProfile, 'Error:', insertError);

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return null;
      }

      if (newProfile) {
        const roleData = newProfile.roles as any;
        return {
          id: newProfile.id,
          name: newProfile.name,
          lastName: newProfile.last_name,
          email: newProfile.email,
          role: roleData?.name || newProfile.role,
          roleId: newProfile.role_id,
          permissions: roleData?.role_permissions?.map((p: any) => p.permission_key) || []
        };
      }
      return null;
    } catch (error) {
      console.error('getOrCreateUserProfile error:', error);
      return null;
    }
  },

  login: async (email: string, password: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select(`
            *,
            roles(id, name, description, role_permissions(permission_key))
          `)
          .eq('id', data.user.id)
          .single();

        if (profileError) throw profileError;

        if (profile) {
          const roleData = profile.roles as any;
          return {
            id: profile.id,
            name: profile.name,
            lastName: profile.last_name,
            email: profile.email,
            role: roleData?.name || profile.role,
            roleId: profile.role_id,
            permissions: roleData?.role_permissions?.map((p: any) => p.permission_key) || []
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
        .select(`
          *,
          roles(id, name, description, role_permissions(permission_key))
        `)
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile) {
        const roleData = profile.roles as any;
        return {
          id: profile.id,
          name: profile.name,
          lastName: profile.last_name,
          email: profile.email,
          role: roleData?.name || profile.role,
          roleId: profile.role_id,
          permissions: roleData?.role_permissions?.map((p: any) => p.permission_key) || []
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

  // ==================== SERVERS ====================

  getServers: async (): Promise<Server[]> => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get servers error:', error);
      return [];
    }
  },

  saveServer: async (name: string): Promise<Server | null> => {
    try {
      const { data, error } = await supabase
        .from('servers')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Save server error:', error);
      return null;
    }
  },

  deleteServer: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('servers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete server error:', error);
      return false;
    }
  },

  // ==================== ROLES ====================

  getRoles: async (): Promise<Role[]> => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*, role_permissions(permission_key)')
        .order('name', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: (r.role_permissions as any[] || []).map(p => p.permission_key)
      }));
    } catch (error) {
      console.error('Get roles error:', error);
      return [];
    }
  },

  saveRole: async (role: Omit<Role, 'id'>): Promise<Role | null> => {
    try {
      // 1. Crear el rol
      console.log('Attempting to insert role:', { name: role.name, description: role.description });
      const { data, error } = await supabase
        .from('roles')
        .insert({ name: role.name, description: role.description })
        .select()
        .single();

      if (error) {
        console.error('Supabase error inserting role:', error);
        throw error;
      }
      if (!data) return null;
      console.log('Role inserted successfully:', data);

      // 2. Insertar permisos
      if (role.permissions && role.permissions.length > 0) {
        const permsEntries = role.permissions.map(p => ({
          role_id: data.id,
          permission_key: p
        }));
        const { error: permsError } = await supabase
          .from('role_permissions')
          .insert(permsEntries);
        if (permsError) throw permsError;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        permissions: role.permissions
      };
    } catch (error: any) {
      console.error('Save role error full detail:', error);
      alert('Error al guardar el rol: ' + (error?.message || 'Error desconocido'));
      return null;
    }
  },

  updateRole: async (id: string, updates: Partial<Role>): Promise<boolean> => {
    try {
      // 1. Actualizar datos básicos si existen
      if (updates.name || updates.description) {
        const { error: roleError } = await supabase
          .from('roles')
          .update({ name: updates.name, description: updates.description })
          .eq('id', id);
        if (roleError) throw roleError;
      }

      // 2. Actualizar permisos si existen
      if (updates.permissions) {
        // Borrar anteriores
        const { error: delError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', id);
        if (delError) throw delError;

        // Insertar nuevos
        if (updates.permissions.length > 0) {
          const permsEntries = updates.permissions.map(p => ({
            role_id: id,
            permission_key: p
          }));
          const { error: insError } = await supabase
            .from('role_permissions')
            .insert(permsEntries);
          if (insError) throw insError;
        }
      }

      return true;
    } catch (error: any) {
      console.error('Update role error full detail:', error);
      alert('Error al actualizar el rol: ' + (error?.message || 'Error desconocido'));
      return false;
    }
  },

  deleteRole: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete role error:', error);
      return false;
    }
  },

  // ==================== USERS & AUTH ====================

  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          roles(id, name, description, role_permissions(permission_key))
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return data.map(u => {
        const roleData = u.roles as any;
        return {
          id: u.id,
          name: u.name,
          lastName: u.last_name,
          email: u.email,
          role: roleData?.name || u.role,
          roleId: u.role_id,
          permissions: roleData?.role_permissions?.map((p: any) => p.permission_key) || []
        };
      });
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
            role: user.role, // Mantenemos el nombre del rol por compatibilidad con el trigger anterior
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
      if ((updates as any).roleId) dbUpdates.role_id = (updates as any).roleId;

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
  },

  // ==================== EMPLOYEES ====================

  getEmployees: async (): Promise<Employee[]> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(e => ({
        id: e.id,
        userId: e.user_id || '',
        name: e.name,
        lastName: e.last_name,
        email: e.email,
        department: e.department,
        position: e.position,
        phone: e.phone,
        extension: e.extension,
        birthday: e.birthday,
        hireDate: e.hire_date,
        photoUrl: e.photo_url,
        role: e.role
      }));
    } catch (error) {
      console.error('Get employees error:', error);
      return [];
    }
  },

  saveEmployee: async (employee: Omit<Employee, 'id'>): Promise<Employee | null> => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          user_id: employee.userId || null,
          name: employee.name,
          last_name: employee.lastName,
          email: employee.email,
          department: employee.department,
          position: employee.position,
          phone: employee.phone || null,
          extension: employee.extension || null,
          birthday: employee.birthday || null,
          hire_date: employee.hireDate || null,
          photo_url: employee.photoUrl || null,
          role: employee.role || 'EMPLOYEE'
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id || '',
        name: data.name,
        lastName: data.last_name,
        email: data.email,
        department: data.department,
        position: data.position,
        phone: data.phone,
        extension: data.extension,
        birthday: data.birthday,
        hireDate: data.hire_date,
        photoUrl: data.photo_url,
        role: data.role
      };
    } catch (error) {
      console.error('Save employee error:', error);
      return null;
    }
  },

  updateEmployee: async (id: string, updates: Partial<Omit<Employee, 'id'>>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.lastName) dbUpdates.last_name = updates.lastName;
      if (updates.email) dbUpdates.email = updates.email;
      if (updates.department) dbUpdates.department = updates.department;
      if (updates.position) dbUpdates.position = updates.position;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.extension !== undefined) dbUpdates.extension = updates.extension;
      if (updates.birthday !== undefined) dbUpdates.birthday = updates.birthday;
      if (updates.hireDate !== undefined) dbUpdates.hire_date = updates.hireDate;
      if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
      if (updates.role) dbUpdates.role = updates.role;

      const { error } = await supabase
        .from('employees')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update employee error:', error);
      return false;
    }
  },

  deleteEmployee: async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete employee error:', error);
        return { success: false, error: error.message || 'Error desconocido al eliminar' };
      }
      return { success: true };
    } catch (error: any) {
      console.error('Delete employee error:', error);
      return { success: false, error: error?.message || 'Error desconocido al eliminar' };
    }
  },

  // ==================== CLIENTS (DIRECTORIO) ====================

  getClients: async (): Promise<ClientEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('client_name', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(c => ({
        id: c.id,
        clientName: c.client_name,
        clientRuc: c.client_ruc,
        ownerCompany: c.owner_company,
        ownerRuc: c.owner_ruc,
        dbName: c.db_name,
        server: c.server,
        group: c.group_code,
        subscriptionActive: c.subscription_active
      }));
    } catch (error) {
      console.error('Get clients error:', error);
      return [];
    }
  },

  saveClient: async (client: Omit<ClientEntry, 'id'>): Promise<ClientEntry | null> => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          client_name: client.clientName,
          client_ruc: client.clientRuc,
          owner_company: client.ownerCompany,
          owner_ruc: client.ownerRuc,
          db_name: client.dbName,
          server: client.server,
          group_code: client.group,
          subscription_active: client.subscriptionActive
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        clientName: data.client_name,
        clientRuc: data.client_ruc,
        ownerCompany: data.owner_company,
        ownerRuc: data.owner_ruc,
        dbName: data.db_name,
        server: data.server,
        group: data.group_code,
        subscriptionActive: data.subscription_active
      };
    } catch (error) {
      console.error('Save client error:', error);
      return null;
    }
  },

  updateClient: async (id: string, updates: Partial<Omit<ClientEntry, 'id'>>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.clientName) dbUpdates.client_name = updates.clientName;
      if (updates.clientRuc) dbUpdates.client_ruc = updates.clientRuc;
      if (updates.ownerCompany) dbUpdates.owner_company = updates.ownerCompany;
      if (updates.ownerRuc) dbUpdates.owner_ruc = updates.ownerRuc;
      if (updates.dbName) dbUpdates.db_name = updates.dbName;
      if (updates.server) dbUpdates.server = updates.server;
      if (updates.group) dbUpdates.group_code = updates.group;
      if (updates.subscriptionActive !== undefined) dbUpdates.subscription_active = updates.subscriptionActive;

      const { error } = await supabase
        .from('clients')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update client error:', error);
      return false;
    }
  },

  deleteClient: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete client error:', error);
      return false;
    }
  },

  // ==================== CLIENT CONTACTS ====================

  getClientContacts: async (clientId: string): Promise<ClientContact[]> => {
    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('name', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      return data.map(c => ({
        id: c.id,
        clientId: c.client_id,
        name: c.name,
        position: c.position || '',
        email: c.email || '',
        phone: c.phone || '',
        notes: c.notes || undefined
      }));
    } catch (error) {
      console.error('Get client contacts error:', error);
      return [];
    }
  },

  saveClientContact: async (contact: Omit<ClientContact, 'id'>): Promise<ClientContact | null> => {
    try {
      const { data, error } = await supabase
        .from('client_contacts')
        .insert({
          client_id: contact.clientId,
          name: contact.name,
          position: contact.position,
          email: contact.email,
          phone: contact.phone,
          notes: contact.notes || null
        })
        .select()
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        clientId: data.client_id,
        name: data.name,
        position: data.position || '',
        email: data.email || '',
        phone: data.phone || '',
        notes: data.notes || undefined
      };
    } catch (error) {
      console.error('Save client contact error:', error);
      return null;
    }
  },

  updateClientContact: async (id: string, updates: Partial<Omit<ClientContact, 'id' | 'clientId'>>): Promise<boolean> => {
    try {
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.position !== undefined) dbUpdates.position = updates.position;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;

      const { error } = await supabase
        .from('client_contacts')
        .update(dbUpdates as any)
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Update client contact error:', error);
      return false;
    }
  },

  deleteClientContact: async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete client contact error:', error);
      return false;
    }
  }
};
