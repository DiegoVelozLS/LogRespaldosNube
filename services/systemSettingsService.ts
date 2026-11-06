import { supabase } from './supabaseClient';

export interface ScheduleModuleVisibility {
  module_backups_panel: boolean;
  module_backups_register: boolean;
  module_backups_reports: boolean;
}

const DEFAULT_VISIBILITY: ScheduleModuleVisibility = {
  module_backups_panel: true,
  module_backups_register: true,
  module_backups_reports: true,
};

export const systemSettingsService = {
  /**
   * Obtiene la visibilidad de los módulos de tareas programadas desde Supabase.
   * Si la tabla aún no existe o hay algún error de conexión, retorna los valores por defecto (todos visibles).
   */
  async getScheduleModulesVisibility(): Promise<ScheduleModuleVisibility> {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', ['module_backups_panel', 'module_backups_register', 'module_backups_reports']);

      if (error) {
        console.warn('No se pudo cargar system_settings (usando defaults):', error.message);
        return { ...DEFAULT_VISIBILITY };
      }

      if (!data || data.length === 0) {
        return { ...DEFAULT_VISIBILITY };
      }

      const result: ScheduleModuleVisibility = { ...DEFAULT_VISIBILITY };
      for (const row of data) {
        if (row.key === 'module_backups_panel') {
          result.module_backups_panel = row.value === true || row.value === 'true';
        } else if (row.key === 'module_backups_register') {
          result.module_backups_register = row.value === true || row.value === 'true';
        } else if (row.key === 'module_backups_reports') {
          result.module_backups_reports = row.value === true || row.value === 'true';
        }
      }

      return result;
    } catch (err) {
      console.error('Error al consultar visibilidad de módulos:', err);
      return { ...DEFAULT_VISIBILITY };
    }
  },

  /**
   * Actualiza el valor de visibilidad de un módulo en Supabase.
   */
  async updateModuleVisibility(
    key: keyof ScheduleModuleVisibility,
    enabled: boolean,
    userId?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            key,
            value: enabled,
            updated_at: new Date().toISOString(),
            ...(userId ? { updated_by: userId } : {}),
          },
          { onConflict: 'key' }
        );

      if (error) {
        console.error(`Error al actualizar setting ${key}:`, error);
        throw error;
      }

      return true;
    } catch (err) {
      console.error(`Error en updateModuleVisibility (${key}):`, err);
      throw err;
    }
  },
};
