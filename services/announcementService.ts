
import { supabase } from './supabaseClient';
import { Announcement, AnnouncementCategory, AnnouncementPriority } from '../types';

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

    createAnnouncement: async (announcement: Omit<Announcement, 'id' | 'createdAt'>): Promise<Announcement | null> => {
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
            if (!data) return null;

            const ann = data as any;
            return {
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
            };
        } catch (error) {
            console.error('Error creating announcement:', error);
            return null;
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
    }
};
