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
      event_config: {
        Row: {
          id: number
          event_start: string | null
          is_frozen: boolean | null
          last_roast_phrases: string[] | null
          last_roast_at: string | null
        }
        Insert: {
          id?: number
          event_start?: string | null
          is_frozen?: boolean | null
          last_roast_phrases?: string[] | null
          last_roast_at?: string | null
        }
        Update: {
          id?: number
          event_start?: string | null
          is_frozen?: boolean | null
          last_roast_phrases?: string[] | null
          last_roast_at?: string | null
        }
      }
      participants: {
        Row: {
          id: string
          name: string
          gender: 'm' | 'f' | null
          seat_order: number | null
          is_knocked_out: boolean | null
          paused_until: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          gender?: 'm' | 'f' | null
          seat_order?: number | null
          is_knocked_out?: boolean | null
          paused_until?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          gender?: 'm' | 'f' | null
          seat_order?: number | null
          is_knocked_out?: boolean | null
          paused_until?: string | null
          created_at?: string | null
        }
      }
      puffer_logs: {
        Row: {
          id: number
          participant_id: string | null
          eaten_at: string | null
        }
        Insert: {
          id?: number
          participant_id?: string | null
          eaten_at?: string | null
        }
        Update: {
          id?: number
          participant_id?: string | null
          eaten_at?: string | null
        }
      }
    }
    Views: {
      extended_stats: {
        Row: {
          id: string
          name: string
          gender: 'm' | 'f' | null
          seat_order: number | null
          is_knocked_out: boolean | null
          paused_until: string | null
          created_at: string | null
          total_count: number | null
          velocity_30m: number | null
        }
      }
    }
  }
}
