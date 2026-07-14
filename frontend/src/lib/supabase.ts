import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  url && anon && !url.includes("your-project") && anon.length > 20,
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anon!)
  : null;

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  locale: string | null;
  vibe_status?: string | null;
  vibe_updated_at?: string | null;
  show_on_map?: boolean;
  created_at?: string;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "blocked";
  created_at: string;
};

export type SnapRow = {
  id: string;
  sender_id: string;
  media_path: string;
  media_type: "image" | "video";
  duration_sec: number;
  created_at: string;
  expires_at: string;
};

export type SnapRecipient = {
  id: string;
  snap_id: string;
  recipient_id: string;
  status: "pending" | "opened" | "consumed";
  opened_at: string | null;
};
