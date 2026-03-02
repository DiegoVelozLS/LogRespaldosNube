
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
            roles: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    created_at?: string
                }
            }
            role_permissions: {
                Row: {
                    role_id: string
                    permission_key: string
                }
                Insert: {
                    role_id: string
                    permission_key: string
                }
                Update: {
                    role_id?: string
                    permission_key?: string
                }
            }
            users: {
                Row: {
                    id: string
                    email: string
                    name: string
                    last_name: string
                    role: string
                    role_id: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    name?: string
                    last_name?: string
                    role?: string
                    role_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string
                    last_name?: string
                    role?: string
                    role_id?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            servers: {
                Row: {
                    id: string
                    name: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    created_at?: string
                }
            }
            backup_schedules: {
                Row: {
                    id: string
                    name: string
                    type: string
                    frequency: string
                    days_of_week: number[] | null
                    description: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    type: string
                    frequency: string
                    days_of_week?: number[] | null
                    description?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    type?: string
                    frequency?: string
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
                    status: string
                    notes: string | null
                    date_str: string
                    timestamp: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    schedule_id: string
                    user_id?: string | null
                    status: string
                    notes?: string | null
                    date_str: string
                    timestamp?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    schedule_id?: string
                    user_id?: string | null
                    status?: string
                    notes?: string | null
                    date_str?: string
                    timestamp?: string
                    created_at?: string
                }
            }
        }
    }
}
