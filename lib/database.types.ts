// ═══════════════════════════════════════════════════════════════
//  lib/database.types.ts
//
//  Hand-written to match migration.sql.
//  Replace with auto-generated types once you run:
//    npx supabase gen types typescript --local > lib/database.types.ts
// ═══════════════════════════════════════════════════════════════

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          chain_event_id: number;
          title: string;
          description: string | null;
          organizer: string;
          max_attendees: number | null;
          is_locked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          chain_event_id: number;
          title: string;
          description?: string | null;
          organizer: string;
          max_attendees?: number | null;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          chain_event_id?: number;
          title?: string;
          description?: string | null;
          organizer?: string;
          max_attendees?: number | null;
          is_locked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      check_ins: {
        Row: {
          id: string;
          event_id: string;
          wallet_address: string;
          checked_in_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          wallet_address: string;
          checked_in_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          wallet_address?: string;
          checked_in_at?: string;
        };
      };
      giveaways: {
        Row: {
          id: string;
          event_id: string;
          winner_count: number;
          winners: string[];
          tx_hash: string | null;
          executed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          winner_count: number;
          winners?: string[];
          tx_hash?: string | null;
          executed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          winner_count?: number;
          winners?: string[];
          tx_hash?: string | null;
          executed_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      v_event_summary: {
        Row: {
          id: string;
          chain_event_id: number;
          title: string;
          organizer: string;
          is_locked: boolean;
          created_at: string;
          attendee_count: number;
          giveaway_executed: boolean;
          winner_count: number | null;
          winners: string[] | null;
          tx_hash: string | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
