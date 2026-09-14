import { useCallback, useEffect, useState } from "react";
import apiClient from "./apiClient";
import { useLang } from "./LanguageContext";

export default function TrialAdminPanel({ onBack }) {
  const { t } = useLang();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [converting, setConverting] = useState(null);

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get("/trial/admin/stores");
      setStores(response.data?.stores || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
        t("trial_admin_load_failed")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  const convertStore = async (store) => {
    if (!window.confirm(t("trial_admin_convert_confirm", { store: store.store_name }))) return;

    setConverting(store.store_id);
    setError("");

    try {
      await apiClient.post(`/trial/admin/stores/${store.store_id}/convert`);
      await loadStores();
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail ||
        t("trial_admin_convert_failed")
      );
    } finally {
      setConverting(null);
    }
  };

  return (
    <main style={page}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <header style={header}>
          <div>
            <div style={{ color: "#ff9652", fontWeight: 900 }}>{t("trial_admin_eyebrow")}</div>
            <h1 style={{ margin: "6px 0 0" }}>{t("trial_admin_title")}</h1>
          </div>
          <button onClick={onBack} style={secondaryButton}>{t("trial_admin_back")}</button>
        </header>

        {error && <div role="alert" style={errorBox}>{error}</div>}
        {loading ? (
          <p style={{ color: "#aeb7c9" }}>{t("loading")}</p>
        ) : stores.length === 0 ? (
          <div style={emptyCard}>{t("trial_admin_empty")}</div>
        ) : (
          <div style={tableShell}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t("trial_admin_store"), t("trial_admin_contact"), t("email"), t("trial_admin_started"), t("trial_admin_expires"), t("trial_admin_status"), t("options")].map(label => (
                    <th key={label} style={th}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stores.map(store => (
                  <tr key={store.store_id}>
                    <td style={td}><strong>{store.store_name}</strong><div style={muted}>#{store.store_id}</div></td>
                    <td style={td}>{store.contact_name || "—"}<div style={muted}>{store.whatsapp || ""}</div></td>
                    <td style={td}>{store.email || "—"}</td>
                    <td style={td}>{formatDate(store.trial_started_at)}</td>
                    <td style={td}>{formatDate(store.trial_expires_at)}</td>
                    <td style={td}>
                      <span style={{
                        ...badge,
                        color: store.account_type === "paid" ? "#86efac" : store.trial_read_only ? "#fca5a5" : "#fde68a",
                        borderColor: store.account_type === "paid" ? "#166534" : store.trial_read_only ? "#991b1b" : "#92400e",
                      }}>
                        {store.account_type === "paid"
                          ? t("trial_admin_paid")
                          : store.trial_read_only
                            ? t("trial_admin_expired")
                            : t("trial_admin_active")}
                      </span>
                    </td>
                    <td style={td}>
                      {store.account_type === "trial" && (
                        <button
                          onClick={() => convertStore(store)}
                          disabled={converting === store.store_id}
                          style={primaryButton}
                        >
                          {converting === store.store_id ? t("loading") : t("trial_admin_convert")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

const page = { minHeight: "100dvh", background: "#0b0d12", color: "#f5f7fb", padding: "clamp(18px, 4vw, 48px)", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, sans-serif" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 24 };
const tableShell = { overflowX: "auto", border: "1px solid #32394a", borderRadius: 12, background: "#181c25" };
const th = { textAlign: "left", padding: 13, color: "#aeb7c9", borderBottom: "1px solid #32394a", background: "#202532", whiteSpace: "nowrap" };
const td = { padding: 13, borderBottom: "1px solid #2a3040", verticalAlign: "top" };
const muted = { color: "#919bad", fontSize: 12, marginTop: 3 };
const badge = { display: "inline-block", border: "1px solid", borderRadius: 999, padding: "4px 8px", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap" };
const primaryButton = { border: 0, borderRadius: 8, background: "#3ba4f7", color: "#08111d", padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const secondaryButton = { border: "1px solid #32394a", borderRadius: 8, background: "#202532", color: "#f5f7fb", padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const errorBox = { marginBottom: 18, border: "1px solid #991b1b", background: "rgba(127,29,29,.32)", color: "#fecaca", borderRadius: 9, padding: 12 };
const emptyCard = { border: "1px solid #32394a", background: "#181c25", color: "#aeb7c9", borderRadius: 12, padding: 24 };
