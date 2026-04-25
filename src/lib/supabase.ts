import { createClient } from "@supabase/supabase-js";

/**
 * Supabase project credentials.
 *
 * Use:
 * - Project URL without /rest/v1/
 * - Legacy anon public key or publishable key
 *
 * Never put the service_role key in frontend code.
 */

export const SUPABASE_URL = "https://gkuncderdwrnrfbgwrql.supabase.co";

export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrdW5jZGVyZHdybnJmYmd3cnFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5ODMxMDIsImV4cCI6MjA5MjU1OTEwMn0._0APMM0ZtXo53KSneMzrSdHfzpRrry1PxryMHtaZcbY";

export const isSupabaseConfigured =
  /^https?:\/\//.test(SUPABASE_URL) &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_ANON_KEY.includes("PASTE_YOUR");

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : "https://placeholder.supabase.co",
  isSupabaseConfigured ? SUPABASE_ANON_KEY : "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage:
        typeof window !== "undefined" ? window.localStorage : undefined,
    },
  }
);

export type RackName = "A" | "B" | "C" | "LEFTOVERS";

export interface GlassPiece {
  id: string;
  code: string;
  width: number;
  height: number;
  thickness: number;
  glass_type: string;
  status: "available" | "reserved" | "used" | "broken" | string;
  rack: RackName | string;
  rack_order: number | null;
  parent_piece_id: string | null;
  reserved_order_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  phone_normalized?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  customer_id: string | null;
  customer_name_snapshot: string;
  customer_phone_snapshot: string | null;
  glass_type: string;
  width: number;
  height: number;
  thickness: number;
  notes: string | null;
  allow_rotation: boolean;
  receipt_type: "vat" | "non_vat" | string;
  status: "open" | "reserved" | "completed" | "cancelled" | string;
  selected_piece_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  width: number;
  height: number;
  quantity: number;
  thickness: number;
  glass_type: string;
  allow_rotation: boolean;
  notes: string | null;
  created_at?: string;
}
