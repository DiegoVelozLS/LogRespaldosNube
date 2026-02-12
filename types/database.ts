
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    name: string
                    last_name: string
                    role: 'ADMIN' | 'TECH' | 'SUPERVISOR'
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    name?: string
                    last_name?: string
                    role?: 'ADMIN' | 'TECH' | 'SUPERVISOR'
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string
                    last_name?: string
                    role?: 'ADMIN' | 'TECH' | 'SUPERVISOR'
                    created_at?: string
                    updated_at?: string
                }
            }
            backup_schedules: {
                Row: {
                    id: string
                    name: string
                    type: 'DATABASE' | 'FTP' | 'EXTERNAL_DISK' | 'CLOUD'
                    frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM'
                    days_of_week: number[] | null
                    description: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    type: 'DATABASE' | 'FTP' | 'EXTERNAL_DISK' | 'CLOUD'
                    frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM'
                    days_of_week?: number[] | null
                    description?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    type?: 'DATABASE' | 'FTP' | 'EXTERNAL_DISK' | 'CLOUD'
                    frequency?: 'DAILY' | 'WEEKLY' | 'CUSTOM'
                    days_of_week?: number[] | null
                    description?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            backup_logs: {
                Row: {
                    id: string
                    schedule_id: string
                    user_id: string | null
                    status: 'PENDING' | 'COMPLETED' | 'WARNING' | 'FAILED'
                    notes: string | null
                    date_str: string
                    timestamp: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    schedule_id: string
                    user_id?: string | null
                    status: 'PENDING' | 'COMPLETED' | 'WARNING' | 'FAILED'
                    notes?: string | null
                    date_str: string
                    timestamp?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    schedule_id?: string
                    user_id?: string | null
                    status?: 'PENDING' | 'COMPLETED' | 'WARNING' | 'FAILED'
                    notes?: string | null
                    date_str?: string
                    timestamp?: string
                    created_at?: string
                }
            }
        }
    }
}
