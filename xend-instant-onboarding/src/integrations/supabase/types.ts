export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      batch_payouts: {
        Row: {
          created_at: string
          id: string
          recipients: Json
          results: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipients: Json
          results?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          recipients?: Json
          results?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          read: boolean
          transaction_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          read?: boolean
          transaction_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          read?: boolean
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          used: boolean | null
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          used?: boolean | null
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          used?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          backup_share_ed: string | null
          backup_share_secp: string | null
          backup_status: string | null
          created_at: string
          custodian_backup_share_ed: string | null
          custodian_backup_share_secp: string | null
          email: string | null
          id: string
          noah_kyc_customer_id: string | null
          noah_kyc_fiat_options: Json
          noah_kyc_hosted_url: string | null
          noah_kyc_status: string
          noah_kyc_updated_at: string | null
          phone: string | null
          portal_client_id: string | null
          updated_at: string
          user_id: string
          wallet_address: string | null
          wallet_id: string | null
          wallet_share_ed: string | null
          wallet_share_secp: string | null
        }
        Insert: {
          backup_share_ed?: string | null
          backup_share_secp?: string | null
          backup_status?: string | null
          created_at?: string
          custodian_backup_share_ed?: string | null
          custodian_backup_share_secp?: string | null
          email?: string | null
          id?: string
          noah_kyc_customer_id?: string | null
          noah_kyc_fiat_options?: Json
          noah_kyc_hosted_url?: string | null
          noah_kyc_status?: string
          noah_kyc_updated_at?: string | null
          phone?: string | null
          portal_client_id?: string | null
          updated_at?: string
          user_id: string
          wallet_address?: string | null
          wallet_id?: string | null
          wallet_share_ed?: string | null
          wallet_share_secp?: string | null
        }
        Update: {
          backup_share_ed?: string | null
          backup_share_secp?: string | null
          backup_status?: string | null
          created_at?: string
          custodian_backup_share_ed?: string | null
          custodian_backup_share_secp?: string | null
          email?: string | null
          id?: string
          noah_kyc_customer_id?: string | null
          noah_kyc_fiat_options?: Json
          noah_kyc_hosted_url?: string | null
          noah_kyc_status?: string
          noah_kyc_updated_at?: string | null
          phone?: string | null
          portal_client_id?: string | null
          updated_at?: string
          user_id?: string
          wallet_address?: string | null
          wallet_id?: string | null
          wallet_share_ed?: string | null
          wallet_share_secp?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: string
          chain: string
          created_at: string
          id: string
          metadata: Json | null
          status: string
          to_address: string
          token: string
          tx_hash: string | null
          tx_type: string
          user_id: string
        }
        Insert: {
          amount: string
          chain?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          to_address: string
          token?: string
          tx_hash?: string | null
          tx_type?: string
          user_id: string
        }
        Update: {
          amount?: string
          chain?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          status?: string
          to_address?: string
          token?: string
          tx_hash?: string | null
          tx_type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_wallet: { Args: { wallet: string }; Returns: string }
      get_phone_by_wallet: { Args: { wallet: string }; Returns: string }
      get_wallet_by_email: { Args: { lookup_email: string }; Returns: string }
      get_wallet_by_phone: { Args: { lookup_phone: string }; Returns: string }
      search_users: {
        Args: { query: string }
        Returns: {
          email: string
          name: string
          phone: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
