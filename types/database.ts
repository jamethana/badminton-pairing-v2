export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionStatus = "draft" | "active" | "completed";
export type PairingStatus = "in_progress" | "completed" | "voided";
export type WinnerTeam = "team_a" | "team_b";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          line_user_id: string | null;
          display_name: string;
          picture_url: string | null;
          skill_level: number;
          calculated_skill_rating: number | null;
          is_moderator: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          line_user_id?: string | null;
          display_name: string;
          picture_url?: string | null;
          skill_level?: number;
          calculated_skill_rating?: number | null;
          is_moderator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          line_user_id?: string | null;
          display_name?: string;
          picture_url?: string | null;
          skill_level?: number;
          calculated_skill_rating?: number | null;
          is_moderator?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          name: string;
          date: string;
          start_time: string;
          end_time: string;
          location: string | null;
          num_courts: number;
          max_players: number;
          status: SessionStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          date: string;
          start_time: string;
          end_time: string;
          location?: string | null;
          num_courts?: number;
          max_players?: number;
          status?: SessionStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          location?: string | null;
          num_courts?: number;
          max_players?: number;
          status?: SessionStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      session_players: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          user_id?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_players_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_players_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      pairings: {
        Row: {
          id: string;
          session_id: string;
          court_number: number;
          sequence_number: number;
          status: PairingStatus;
          team_a_player_1: string;
          team_a_player_2: string;
          team_b_player_1: string;
          team_b_player_2: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          court_number: number;
          sequence_number: number;
          status?: PairingStatus;
          team_a_player_1: string;
          team_a_player_2: string;
          team_b_player_1: string;
          team_b_player_2: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          court_number?: number;
          sequence_number?: number;
          status?: PairingStatus;
          team_a_player_1?: string;
          team_a_player_2?: string;
          team_b_player_1?: string;
          team_b_player_2?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pairings_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pairings_team_a_player_1_fkey";
            columns: ["team_a_player_1"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pairings_team_a_player_2_fkey";
            columns: ["team_a_player_2"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pairings_team_b_player_1_fkey";
            columns: ["team_b_player_1"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pairings_team_b_player_2_fkey";
            columns: ["team_b_player_2"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      game_results: {
        Row: {
          id: string;
          pairing_id: string;
          team_a_score: number;
          team_b_score: number;
          winner_team: WinnerTeam;
          recorded_by: string | null;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          pairing_id: string;
          team_a_score: number;
          team_b_score: number;
          winner_team: WinnerTeam;
          recorded_by?: string | null;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          pairing_id?: string;
          team_a_score?: number;
          team_b_score?: number;
          winner_team?: WinnerTeam;
          recorded_by?: string | null;
          recorded_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_results_pairing_id_fkey";
            columns: ["pairing_id"];
            isOneToOne: true;
            referencedRelation: "pairings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_results_recorded_by_fkey";
            columns: ["recorded_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      session_status: SessionStatus;
      pairing_status: PairingStatus;
      winner_team: WinnerTeam;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
