export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      budget_category_limits: {
        Row: { category_id: string; created_at: string; id: string; limit_satang: number; monthly_budget_id: string }
        Insert: { category_id: string; created_at?: string; id?: string; limit_satang: number; monthly_budget_id: string }
        Update: { category_id?: string; created_at?: string; id?: string; limit_satang?: number; monthly_budget_id?: string }
        Relationships: []
      }
      categories: {
        Row: { created_at: string; household_id: string; id: string; is_active: boolean; name: string; normalized_name: string }
        Insert: { created_at?: string; household_id: string; id?: string; is_active?: boolean; name: string; normalized_name: string }
        Update: { created_at?: string; household_id?: string; id?: string; is_active?: boolean; name?: string; normalized_name?: string }
        Relationships: []
      }
      exchange_rates: {
        Row: { fetched_at: string; ils_per_thb: number; rate_date: string; usd_per_thb: number }
        Insert: { fetched_at?: string; ils_per_thb: number; rate_date: string; usd_per_thb: number }
        Update: { fetched_at?: string; ils_per_thb?: number; rate_date?: string; usd_per_thb?: number }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_satang: number; capture_method: Database['public']['Enums']['capture_method']; category_id: string
          created_at: string; created_by: string; duplicate_confirmed: boolean; expense_date: string; household_id: string
          id: string; ils_per_thb: number | null; ilya_share_bps: number; merchant: string; normalized_merchant: string
          notes: string | null; owner: Database['public']['Enums']['budget_owner']; paid_from: Database['public']['Enums']['payment_source']; usd_per_thb: number | null
        }
        Insert: {
          amount_satang: number; capture_method?: Database['public']['Enums']['capture_method']; category_id: string
          created_at?: string; created_by: string; duplicate_confirmed?: boolean; expense_date: string; household_id: string
          id?: string; ils_per_thb?: number | null; ilya_share_bps: number; merchant: string; normalized_merchant: string
          notes?: string | null; owner: Database['public']['Enums']['budget_owner']; paid_from: Database['public']['Enums']['payment_source']; usd_per_thb?: number | null
        }
        Update: {
          amount_satang?: number; capture_method?: Database['public']['Enums']['capture_method']; category_id?: string
          created_at?: string; created_by?: string; duplicate_confirmed?: boolean; expense_date?: string; household_id?: string
          id?: string; ils_per_thb?: number | null; ilya_share_bps?: number; merchant?: string; normalized_merchant?: string
          notes?: string | null; owner?: Database['public']['Enums']['budget_owner']; paid_from?: Database['public']['Enums']['payment_source']; usd_per_thb?: number | null
        }
        Relationships: []
      }
      household_invitations: {
        Row: { accepted_at: string | null; created_at: string; email: string; household_id: string; id: string; person_key: Database['public']['Enums']['budget_owner'] }
        Insert: { accepted_at?: string | null; created_at?: string; email: string; household_id: string; id?: string; person_key?: Database['public']['Enums']['budget_owner'] }
        Update: { accepted_at?: string | null; created_at?: string; email?: string; household_id?: string; id?: string; person_key?: Database['public']['Enums']['budget_owner'] }
        Relationships: []
      }
      household_members: {
        Row: { created_at: string; household_id: string; person_key: Database['public']['Enums']['budget_owner']; user_id: string }
        Insert: { created_at?: string; household_id: string; person_key: Database['public']['Enums']['budget_owner']; user_id: string }
        Update: { created_at?: string; household_id?: string; person_key?: Database['public']['Enums']['budget_owner']; user_id?: string }
        Relationships: []
      }
      households: {
        Row: { created_at: string; id: string; name: string; timezone: string }
        Insert: { created_at?: string; id?: string; name: string; timezone?: string }
        Update: { created_at?: string; id?: string; name?: string; timezone?: string }
        Relationships: []
      }
      merchant_rules: {
        Row: { category_id: string; created_at: string; household_id: string; id: string; normalized_merchant: string; updated_at: string }
        Insert: { category_id: string; created_at?: string; household_id: string; id?: string; normalized_merchant: string; updated_at?: string }
        Update: { category_id?: string; created_at?: string; household_id?: string; id?: string; normalized_merchant?: string; updated_at?: string }
        Relationships: []
      }
      monthly_budgets: {
        Row: { created_at: string; household_id: string; id: string; month: string; owner: Database['public']['Enums']['budget_owner']; total_limit_satang: number }
        Insert: { created_at?: string; household_id: string; id?: string; month: string; owner: Database['public']['Enums']['budget_owner']; total_limit_satang: number }
        Update: { created_at?: string; household_id?: string; id?: string; month?: string; owner?: Database['public']['Enums']['budget_owner']; total_limit_satang?: number }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string; display_name: string; id: string }
        Insert: { created_at?: string; display_name: string; id: string }
        Update: { created_at?: string; display_name?: string; id?: string }
        Relationships: []
      }
      settlements: {
        Row: { amount_satang: number; created_at: string; created_by: string; from_person: Database['public']['Enums']['budget_owner']; household_id: string; id: string; settlement_date: string; to_person: Database['public']['Enums']['budget_owner'] }
        Insert: { amount_satang: number; created_at?: string; created_by: string; from_person: Database['public']['Enums']['budget_owner']; household_id: string; id?: string; settlement_date: string; to_person: Database['public']['Enums']['budget_owner'] }
        Update: { amount_satang?: number; created_at?: string; created_by?: string; from_person?: Database['public']['Enums']['budget_owner']; household_id?: string; id?: string; settlement_date?: string; to_person?: Database['public']['Enums']['budget_owner'] }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      accept_household_invitation: { Args: Record<PropertyKey, never>; Returns: string }
      bootstrap_household: { Args: { household_name: string; invited_email: string }; Returns: string }
      is_household_member: { Args: { target_household_id: string }; Returns: boolean }
      merge_category: { Args: { source_category_id: string; target_category_id: string }; Returns: undefined }
    }
    Enums: {
      budget_owner: 'ilya' | 'masha' | 'mutual'
      capture_method: 'manual' | 'text' | 'voice' | 'receipt'
      payment_source: 'ilya' | 'masha' | 'mutual'
    }
    CompositeTypes: Record<string, never>
  }
}
