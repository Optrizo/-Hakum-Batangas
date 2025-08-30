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
      cars: {
        Row: {
          id: string
          plate: string
          model: string
          size: string
          service: string
          status: string
          crew: string[] | null
          phone: string
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          cancellation_reason: string | null
          total_cost: number | null
          services: string[] | null
          is_deleted: boolean | null
          time_waiting: string | null
          time_in_progress: string | null
          time_ready_for_payment: string | null
        }
        Insert: {
          id?: string
          plate: string
          model: string
          size: string
          service: string
          status: string
          phone: string
          crew?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          cancellation_reason?: string | null
          total_cost?: number | null
          services?: string[] | null
          is_deleted?: boolean | null
          time_waiting?: string | null
          time_in_progress?: string | null
          time_ready_for_payment?: string | null
        }
        Update: {
          id?: string
          plate?: string
          model?: string
          size?: string
          service?: string
          status?: string
          phone?: string
          crew?: string[] | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          cancellation_reason?: string | null
          total_cost?: number | null
          services?: string[] | null
          is_deleted?: boolean | null
          time_waiting?: string | null
          time_in_progress?: string | null
          time_ready_for_payment?: string | null
        }
      }
      motorcycles: {
        Row: {
          id: string
          plate: string
          model: string
          size: string
          status: string
          crew: string[] | null
          phone: string | null
          created_at: string | null
          updated_at: string | null
          completed_at: string | null
          cancellation_reason: string | null
          total_cost: number | null
          services: string[] | null
          package: string | null
          vehicle_type: string
          is_deleted: boolean | null
          time_waiting: string | null
          time_in_progress: string | null
          time_ready_for_payment: string | null
        }
        Insert: {
          id?: string
          plate: string
          model: string
          size: string
          status?: string
          crew?: string[] | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          cancellation_reason?: string | null
          total_cost?: number | null
          services?: string[] | null
          package?: string | null
          vehicle_type?: string
          is_deleted?: boolean | null
          time_waiting?: string | null
          time_in_progress?: string | null
          time_ready_for_payment?: string | null
        }
        Update: {
          id?: string
          plate?: string
          model?: string
          size?: string
          status?: string
          crew?: string[] | null
          phone?: string | null
          created_at?: string | null
          updated_at?: string | null
          completed_at?: string | null
          cancellation_reason?: string | null
          total_cost?: number | null
          services?: string[] | null
          package?: string | null
          vehicle_type?: string
          is_deleted?: boolean | null
          time_waiting?: string | null
          time_in_progress?: string | null
          time_ready_for_payment?: string | null
        }
      }
      services: {
        Row: {
          id: string
          name: string
          price: number
          description: string | null
          pricing: Json | null
          vehicle_type: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          price?: number
          description?: string | null
          pricing?: Json | null
          vehicle_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          price?: number
          description?: string | null
          pricing?: Json | null
          vehicle_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      crew_members: {
        Row: {
          id: string
          name: string
          phone: string | null
          role: string | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          phone?: string | null
          role?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      service_packages: {
        Row: {
          id: string
          name: string
          description: string | null
          service_ids: string[] | null
          pricing: Json | null
          is_active: boolean | null
          vehicle_type: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          service_ids?: string[] | null
          pricing?: Json | null
          is_active?: boolean | null
          vehicle_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          service_ids?: string[] | null
          pricing?: Json | null
          is_active?: boolean | null
          vehicle_type?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}