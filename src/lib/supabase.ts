import { createClient } from "@supabase/supabase-js";

/**
 * Paste your existing Supabase project credentials below.
 * Find them in your Supabase Dashboard → Project Settings → API.
 *
 * The anon key is safe to ship in the client (RLS protects your data).
 */
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: localStorage,
  },
});

export const isSupabaseConfigured =
  SUPABASE_URL !== "YOUR_SUPABASE_URL" &&
  SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY";

// ---- Domain types (best-guess from spec) ----
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
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  created_at?: string;
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
  status: "open" | "reserved" | "completed" | "cancelled" | string;
  selected_piece_id: string | null;
  created_at?: string;
}
