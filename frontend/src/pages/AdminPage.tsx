import { useCallback, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminBlockUser,
  isAdminUser,
  listReports,
  updateReportStatus,
  type AdminReport,
  type ReportStatus,
} from "@/lib/admin";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

export function AdminPage() {
  const t = useT();
  const nav = useNavigate();
  const { toast } = useToast();
  const { user, profile, demoMode, ready } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [filter, setFilter] = useState<ReportStatus | "all">("open");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const admin = profile?.is_admin || (await isAdminUser(user.id));
    setAllowed(admin);
    if (!admin) return;
    const { reports: list, error } = await listReports(filter);
    if (error) toast(error, "err");
    setReports(list);
  }, [user?.id, profile?.is_admin, filter, toast]);

  useEffect(() => {
    if (!ready) return;
    void load();
  }, [ready, load]);

  async function setStatus(r: AdminReport, status: ReportStatus) {
    if (!user?.id) return;
    setBusy(true);
    const err = await updateReportStatus(r.id, user.id, status);
    setBusy(false);
    if (err) toast(err, "err");
    else {
      toast(t("adminUpdated"), "ok");
      void load();
    }
  }

  async function onBlock(r: AdminReport) {
    if (!user?.id) return;
    if (!confirm(t("adminBlockConfirm"))) return;
    setBusy(true);
    const err = await adminBlockUser(user.id, r.reported_id);
    if (!err) {
      await updateReportStatus(r.id, user.id, "resolved", "Blocked by admin");
    }
    setBusy(false);
    if (err) toast(err, "err");
    else {
      toast(t("blocked"), "ok");
      void load();
    }
  }

  if (!ready || allowed === null) {
    return (
      <div className="page-center">
        <p className="muted">{t("loading")}</p>
      </div>
    );
  }

  if (demoMode || !allowed) {
    return <Navigate to="/me" replace />;
  }

  return (
    <div className="app-root">
      <div className="page">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button type="button" className="chip" onClick={() => nav("/me")}>
            ←
          </button>
          <h2 style={{ margin: 0 }}>🛡️ {t("adminTitle")}</h2>
        </div>
        <p className="muted" style={{ fontSize: 13 }}>
          {t("adminHint")}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {(
            [
              ["open", t("adminOpen")],
              ["resolved", t("adminResolved")],
              ["dismissed", t("adminDismissed")],
              ["all", t("adminAll")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`chip ${filter === key ? "active" : ""}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {!reports.length && (
          <p className="muted">{t("adminEmpty")}</p>
        )}

        <div className="stack" style={{ maxWidth: "none", gap: 10 }}>
          {reports.map((r) => (
            <article
              key={r.id}
              className="list-row"
              style={{
                flexDirection: "column",
                alignItems: "stretch",
                gap: 8,
                borderColor:
                  r.status === "open" ? "var(--danger)" : "var(--border)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ color: "var(--danger)" }}>
                  @{r.reported?.username ?? r.reported_id.slice(0, 8)}
                </strong>
                <span className="muted" style={{ fontSize: 11 }}>
                  {r.status} · {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: 14 }}>{r.reason}</div>
              <div className="muted" style={{ fontSize: 12 }}>
                {t("adminReporter")}: @{r.reporter?.username ?? "…"}
                {r.context ? ` · ${r.context}` : ""}
              </div>
              {r.admin_note && (
                <div className="muted" style={{ fontSize: 12 }}>
                  {t("adminNote")}: {r.admin_note}
                </div>
              )}
              {r.status === "open" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    style={{ padding: "0.5rem 0.9rem", fontSize: 13 }}
                    disabled={busy}
                    onClick={() => void onBlock(r)}
                  >
                    🚫 {t("block")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: "0.5rem 0.9rem", fontSize: 13 }}
                    disabled={busy}
                    onClick={() => void setStatus(r, "resolved")}
                  >
                    ✓ {t("adminResolve")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: "0.5rem 0.9rem", fontSize: 13 }}
                    disabled={busy}
                    onClick={() => void setStatus(r, "dismissed")}
                  >
                    {t("adminDismiss")}
                  </button>
                </div>
              )}
              {r.status !== "open" && (
                <button
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() => void setStatus(r, "open")}
                >
                  {t("adminReopen")}
                </button>
              )}
            </article>
          ))}
        </div>
      </div>
      <BottomChrome />
    </div>
  );
}
