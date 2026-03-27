
import { supabase } from './supabaseClient';
import { Announcement, AnnouncementCategory, AnnouncementPriority, Employee, AnnouncementNotification } from '../types';

export const announcementService = {
    getAnnouncements: async (): Promise<Announcement[]> => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (!data) return [];

            return (data as any[]).map(ann => ({
                id: ann.id,
                title: ann.title,
                content: ann.content,
                category: ann.category as AnnouncementCategory,
                priority: ann.priority as AnnouncementPriority,
                visibleRoles: ann.visible_roles,
                createdBy: ann.created_by,
                createdByName: ann.created_by_name,
                createdAt: ann.created_at,
                isPinned: ann.is_pinned,
                expiresAt: ann.expires_at || undefined,
                deadline: ann.deadline || undefined
            }));
        } catch (error) {
            console.error('Error fetching announcements:', error);
            return [];
        }
    },

    createAnnouncement: async (announcement: Omit<Announcement, 'id' | 'createdAt'>): Promise<{ success: boolean; data?: Announcement; error?: string }> => {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .insert({
                    title: announcement.title,
                    content: announcement.content,
                    category: announcement.category,
                    priority: announcement.priority,
                    visible_roles: announcement.visibleRoles,
                    created_by: announcement.createdBy,
                    created_by_name: announcement.createdByName,
                    is_pinned: announcement.isPinned,
                    expires_at: announcement.expiresAt || null,
                    deadline: announcement.deadline || null
                } as any)
                .select()
                .single();

            if (error) throw error;
            if (!data) return { success: false, error: 'No se recibieron datos de la base de datos' };

            const ann = data as any;
            return {
                success: true,
                data: {
                    id: ann.id,
                    title: ann.title,
                    content: ann.content,
                    category: ann.category as AnnouncementCategory,
                    priority: ann.priority as AnnouncementPriority,
                    visibleRoles: ann.visible_roles,
                    createdBy: ann.created_by,
                    createdByName: ann.created_by_name,
                    createdAt: ann.created_at,
                    isPinned: ann.is_pinned,
                    expiresAt: ann.expires_at || undefined,
                    deadline: ann.deadline || undefined
                }
            };
        } catch (error: any) {
            console.error('Error creating announcement:', error);
            // Simplificado: extrae el mensaje de error de Supabase
            const detail = error.message || error.details || JSON.stringify(error);
            return { success: false, error: detail };
        }
    },

    updateAnnouncement: async (id: string, updates: Partial<Announcement>): Promise<boolean> => {
        try {
            const dbUpdates: any = {};
            if (updates.title) dbUpdates.title = updates.title;
            if (updates.content) dbUpdates.content = updates.content;
            if (updates.category) dbUpdates.category = updates.category;
            if (updates.priority) dbUpdates.priority = updates.priority;
            if (updates.visibleRoles) dbUpdates.visible_roles = updates.visibleRoles;
            if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
            if (updates.expiresAt !== undefined) dbUpdates.expires_at = updates.expiresAt;
            if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;

            const { error } = await (supabase
                .from('announcements') as any)
                .update(dbUpdates)
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating announcement:', error);
            return false;
        }
    },

    deleteAnnouncement: async (id: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('announcements')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting announcement:', error);
            return false;
        }
    },

    /**
     * Verifica si hay empleados que cumplen años hoy y crea un anuncio
     * de felicitación si aún no existe. El anuncio expira al final del día.
     */
    ensureBirthdayAnnouncements: async (employees: Employee[]): Promise<void> => {
        try {
            const today = new Date();
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();

            const birthdayEmployees = employees.filter(emp => {
                if (!emp.birthday) return false;
                const bday = new Date(emp.birthday);
                // Comparar solo mes y día (ignora el año)
                return (bday.getMonth() + 1) === todayMonth && bday.getDate() === todayDay;
            });

            if (birthdayEmployees.length === 0) return;

            // Verificar si ya se creó un anuncio de cumpleaños hoy
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
            const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

            const { data: existing } = await supabase
                .from('announcements')
                .select('title')
                .gte('created_at', todayStart)
                .lt('created_at', todayEnd)
                .like('title', '%🎂%');

            const existingTitles = (existing || []).map((a: any) => a.title as string);

            // Fin del día actual como deadline
            const deadline = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

            for (const emp of birthdayEmployees) {
                const fullName = `${emp.name} ${emp.lastName}`;
                const title = `🎂 ¡Feliz Cumpleaños, ${fullName}!`;

                if (existingTitles.includes(title)) continue;

                await supabase.from('announcements').insert({
                    title,
                    content: `¡Hoy es el cumpleaños de ${fullName}! 🎉 Todo el equipo de Listosoft le desea un maravilloso día lleno de alegría y celebración. ¡Muchas felicidades! 🎈🎊`,
                    category: AnnouncementCategory.RRHH,
                    priority: AnnouncementPriority.NORMAL,
                    visible_roles: ['ADMIN', 'TECH', 'SOPORTE'],
                    created_by: 'system',
                    created_by_name: 'Sistema',
                    is_pinned: false,
                    expires_at: null,
                    deadline,
                } as any);
            }
        } catch (error) {
            console.error('Error creating birthday announcements:', error);
        }
    },

    /**
     * Envía notificaciones por correo electrónico invocando una Edge Function de Supabase.
     */
    sendAnnouncementNotification: async (announcementId: string, notification: AnnouncementNotification): Promise<boolean> => {
        try {
            const { data, error } = await supabase.functions.invoke('send-announcement-email', {
                body: {
                    announcementId,
                    recipientType: notification.recipientType,
                    selectedUserIds: notification.selectedUserIds
                }
            });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error invoking send-announcement-email function:', error);
            return false;
        }
    }
};
