import { supabase, type Profile } from "@/lib/supabase";
import { blockUser } from "@/lib/blocks";

export type ReportStatus = "open" | "resolved" | "dismissed";

export type AdminReport = {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  context: string | null;
  status: ReportStatus;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
  reporter?: Profile | null;
  reported?: Profile | null;
};

export async function isAdminUser(userId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();
  return Boolean(data?.is_admin);
}

export async function listReports(
  status: ReportStatus | "all" = "open",
): Promise<{ reports: AdminReport[]; error?: string }> {
  if (!supabase) return { reports: [], error: "No backend" };
  let q = supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return { reports: [], error: error.message };
  const rows = (data as AdminReport[]) ?? [];
  if (!rows.length) return { reports: [] };

  const ids = [
    ...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id])),
  ];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids);
  const byId = new Map((profiles as Profile[] | null)?.map((p) => [p.id, p]));

  return {
    reports: rows.map((r) => ({
      ...r,
      status: (r.status as ReportStatus) || "open",
      reporter: byId.get(r.reporter_id) ?? null,
      reported: byId.get(r.reported_id) ?? null,
    })),
  };
}

export async function updateReportStatus(
  reportId: string,
  adminId: string,
  status: ReportStatus,
  note?: string,
): Promise<string | null> {
  if (!supabase) return "No backend";
  const { error } = await supabase
    .from("reports")
    .update({
      status,
      admin_note: note?.trim().slice(0, 500) || null,
      resolved_at:
        status === "open" ? null : new Date().toISOString(),
      resolved_by: status === "open" ? null : adminId,
    })
    .eq("id", reportId);
  return error?.message ?? null;
}

export async function adminBlockUser(
  adminId: string,
  targetId: string,
): Promise<string | null> {
  return blockUser(adminId, targetId);
}

export async function countOpenReports(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if (error) return 0;
  return count ?? 0;
}
