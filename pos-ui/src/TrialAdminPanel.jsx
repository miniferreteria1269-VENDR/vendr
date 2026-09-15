import { useCallback, useEffect, useMemo, useState } from "react";
import apiClient from "./apiClient";
import { useLang } from "./LanguageContext";

const PAYMENT_METHODS = ["cash", "bank_transfer", "wompi", "other"];

function newPaymentId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function TrialAdminPanel({ onBack }) {
  const { t } = useLang();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentStore, setPaymentStore] = useState(null);
  const [savingPayment, setSavingPayment] = useState(false);
  const [historyStore, setHistoryStore] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({
    client_payment_id: newPaymentId(),
    amount: "20.00",
    months: "1",
    payment_method: "bank_transfer",
    payment_reference: "",
    note: "",
    paid_at: new Date().toISOString().slice(0, 10),
  });

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get("/trial/admin/stores");
      setStores(response.data?.stores || []);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || t("trial_admin_load_failed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    // The initial request synchronizes this view with the backend ledger.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStores();
  }, [loadStores]);

  const summary = useMemo(() => ({
    trials: stores.filter(store => store.account_type === "trial" && !store.account_read_only).length,
    active: stores.filter(store => ["active", "due_soon", "paid_unmanaged", "canceled_active"].includes(store.subscription_status)).length,
    attention: stores.filter(store => ["trial_expired", "grace", "past_due", "canceled"].includes(store.subscription_status)).length,
  }), [stores]);

  const visibleStores = useMemo(() => {
    if (filter === "all") return stores;
    if (filter === "attention") {
      return stores.filter(store => ["trial_expired", "grace", "past_due", "canceled"].includes(store.subscription_status));
    }
    if (filter === "active") {
      return stores.filter(store => ["active", "due_soon", "paid_unmanaged", "canceled_active"].includes(store.subscription_status));
    }
    return stores.filter(store => store.subscription_status === filter);
  }, [filter, stores]);

  const openPayment = store => {
    setPaymentStore(store);
    setError("");
    setForm({
      client_payment_id: newPaymentId(),
      amount: store.subscription_monthly_price || "20.00",
      months: "1",
      payment_method: "bank_transfer",
      payment_reference: "",
      note: "",
      paid_at: new Date().toISOString().slice(0, 10),
    });
  };

  const savePayment = async event => {
    event.preventDefault();
    if (!paymentStore || savingPayment) return;
    setSavingPayment(true);
    setError("");

    try {
      await apiClient.post(`/trial/admin/stores/${paymentStore.store_id}/payments`, {
        client_payment_id: form.client_payment_id,
        amount: form.amount,
        months: Number(form.months),
        payment_method: form.payment_method,
        payment_reference: form.payment_reference.trim() || null,
        note: form.note.trim() || null,
        paid_at: new Date(`${form.paid_at}T12:00:00`).toISOString(),
      });
      setPaymentStore(null);
      await loadStores();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || t("subscription_payment_failed"));
    } finally {
      setSavingPayment(false);
    }
  };

  const openHistory = async store => {
    setHistoryStore(store);
    setPayments([]);
    setLoadingHistory(true);
    setError("");

    try {
      const response = await apiClient.get(`/trial/admin/stores/${store.store_id}/payments`);
      setPayments(response.data?.payments || []);
    } catch (requestError) {
      setError(requestError.response?.data?.detail || t("subscription_history_failed"));
    } finally {
      setLoadingHistory(false);
    }
  };

  const cancelSubscription = async store => {
    if (!window.confirm(t("subscription_cancel_confirm").replace("{store}", store.store_name))) return;
    setError("");

    try {
      await apiClient.post(`/trial/admin/stores/${store.store_id}/cancel`, { note: null });
      await loadStores();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || t("subscription_cancel_failed"));
    }
  };

  const resumeSubscription = async store => {
    setError("");

    try {
      await apiClient.post(`/trial/admin/stores/${store.store_id}/resume`, { note: null });
      await loadStores();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || t("subscription_resume_failed"));
    }
  };

  return (
    <main style={page}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <header style={header}>
          <div>
            <div style={{ color: "#ff9652", fontWeight: 900 }}>{t("trial_admin_eyebrow")}</div>
            <h1 style={{ margin: "6px 0 0" }}>{t("subscription_admin_title")}</h1>
            <p style={{ ...muted, fontSize: 14 }}>{t("subscription_admin_intro")}</p>
          </div>
          <button onClick={onBack} style={secondaryButton}>{t("trial_admin_back")}</button>
        </header>

        <section style={summaryGrid}>
          <SummaryCard label={t("subscription_summary_trials")} value={summary.trials} color="#fde68a" />
          <SummaryCard label={t("subscription_summary_active")} value={summary.active} color="#86efac" />
          <SummaryCard label={t("subscription_summary_attention")} value={summary.attention} color="#fca5a5" />
        </section>

        <div style={filterBar}>
          {[
            ["all", t("all")],
            ["trial_active", t("trial_admin_active")],
            ["active", t("subscription_status_active")],
            ["attention", t("subscription_filter_attention")],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setFilter(value)} style={filter === value ? primaryButton : secondaryButton}>
              {label}
            </button>
          ))}
        </div>

        {error && <div role="alert" style={errorBox}>{error}</div>}
        {loading ? (
          <p style={{ color: "#aeb7c9" }}>{t("loading")}</p>
        ) : visibleStores.length === 0 ? (
          <div style={emptyCard}>{t("trial_admin_empty")}</div>
        ) : (
          <div style={tableShell}>
            <table style={{ width: "100%", minWidth: 1080, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[t("trial_admin_store"), t("trial_admin_contact"), t("trial_admin_status"), t("subscription_paid_through"), t("subscription_last_payment"), t("options")].map(label => <th key={label} style={th}>{label}</th>)}
                </tr>
              </thead>
              <tbody>
                {visibleStores.map(store => (
                  <tr key={store.store_id}>
                    <td style={td}><strong>{store.store_name}</strong><div style={muted}>#{store.store_id} · {store.email || "—"}</div></td>
                    <td style={td}>{store.contact_name || "—"}<div style={muted}>{store.whatsapp || ""}</div></td>
                    <td style={td}><StatusBadge status={store.subscription_status} t={t} /></td>
                    <td style={td}>
                      {formatDate(store.subscription_paid_through)}
                      {store.subscription_grace_until && <div style={muted}>{t("subscription_grace_until")}: {formatDate(store.subscription_grace_until)}</div>}
                      {!store.subscription_paid_through && store.account_type === "trial" && <div style={muted}>{t("trial_admin_expires")}: {formatDate(store.trial_expires_at)}</div>}
                    </td>
                    <td style={td}>
                      {store.last_payment_amount ? `$${Number(store.last_payment_amount).toFixed(2)}` : "—"}
                      {store.last_payment_at && <div style={muted}>{formatDate(store.last_payment_at)}</div>}
                    </td>
                    <td style={td}>
                      <div style={actions}>
                        <button onClick={() => openPayment(store)} style={primaryButton}>{t("subscription_record_payment")}</button>
                        <button onClick={() => openHistory(store)} style={secondaryButton}>{t("subscription_history")}</button>
                        {["active", "due_soon"].includes(store.subscription_status) && <button onClick={() => cancelSubscription(store)} style={dangerButton}>{t("subscription_cancel")}</button>}
                        {store.subscription_status === "canceled_active" && <button onClick={() => resumeSubscription(store)} style={secondaryButton}>{t("subscription_resume")}</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {paymentStore && (
        <Modal title={t("subscription_record_payment")} onClose={() => setPaymentStore(null)}>
          <p style={{ marginTop: 0 }}><strong>{paymentStore.store_name}</strong></p>
          {error && <div role="alert" style={errorBox}>{error}</div>}
          <form onSubmit={savePayment} style={formGrid}>
            <Field label={t("subscription_amount")}><input type="number" min="0.01" step="0.01" required value={form.amount} onChange={event => setForm(current => ({ ...current, amount: event.target.value }))} style={inputStyle} /></Field>
            <Field label={t("subscription_months")}><input type="number" min="1" max="24" required value={form.months} onChange={event => setForm(current => ({ ...current, months: event.target.value }))} style={inputStyle} /></Field>
            <Field label={t("subscription_payment_date")}><input type="date" required value={form.paid_at} onChange={event => setForm(current => ({ ...current, paid_at: event.target.value }))} style={inputStyle} /></Field>
            <Field label={t("subscription_payment_method")}>
              <select value={form.payment_method} onChange={event => setForm(current => ({ ...current, payment_method: event.target.value }))} style={inputStyle}>
                {PAYMENT_METHODS.map(method => <option key={method} value={method}>{t(`subscription_method_${method}`)}</option>)}
              </select>
            </Field>
            <Field label={t("subscription_reference")} full><input value={form.payment_reference} onChange={event => setForm(current => ({ ...current, payment_reference: event.target.value }))} style={inputStyle} /></Field>
            <Field label={t("note_optional")} full><textarea value={form.note} onChange={event => setForm(current => ({ ...current, note: event.target.value }))} rows={3} style={inputStyle} /></Field>
            <div style={{ ...actions, gridColumn: "1 / -1", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setPaymentStore(null)} style={secondaryButton}>{t("cancel")}</button>
              <button type="submit" disabled={savingPayment} style={primaryButton}>{savingPayment ? t("loading") : t("confirm")}</button>
            </div>
          </form>
        </Modal>
      )}

      {historyStore && (
        <Modal title={`${t("subscription_history")} · ${historyStore.store_name}`} onClose={() => setHistoryStore(null)} wide>
          {error && <div role="alert" style={errorBox}>{error}</div>}
          {loadingHistory ? <p>{t("loading")}</p> : error ? null : payments.length === 0 ? <div style={emptyCard}>{t("subscription_no_payments")}</div> : (
            <div style={{ ...tableShell, maxHeight: "55dvh" }}>
              <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
                <thead><tr>{[t("subscription_payment_date"), t("subscription_amount"), t("subscription_period"), t("subscription_payment_method"), t("subscription_reference")].map(label => <th key={label} style={th}>{label}</th>)}</tr></thead>
                <tbody>{payments.map(payment => (
                  <tr key={payment.subscription_payment_id}>
                    <td style={td}>{formatDate(payment.paid_at)}</td>
                    <td style={td}>${Number(payment.amount).toFixed(2)}</td>
                    <td style={td}>{formatDate(payment.period_start)} – {formatDate(payment.period_end)}<div style={muted}>{payment.months_granted} {t("subscription_months_short")}</div></td>
                    <td style={td}>{t(`subscription_method_${payment.payment_method}`)}</td>
                    <td style={td}>{payment.payment_reference || "—"}{payment.note && <div style={muted}>{payment.note}</div>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Modal>
      )}
    </main>
  );
}

function SummaryCard({ label, value, color }) {
  return <div style={summaryCard}><div style={muted}>{label}</div><div style={{ color, fontSize: 28, fontWeight: 900 }}>{value}</div></div>;
}

function StatusBadge({ status, t }) {
  const warning = ["trial_expired", "grace", "past_due", "canceled"].includes(status);
  const color = warning ? "#fca5a5" : ["trial_active", "due_soon"].includes(status) ? "#fde68a" : "#86efac";
  return <span style={{ ...badge, color, borderColor: color }}>{t(`subscription_status_${status}`)}</span>;
}

function Field({ label, children, full = false }) {
  return <label style={{ display: "grid", gap: 6, gridColumn: full ? "1 / -1" : undefined }}><span style={{ color: "#cbd5e1", fontWeight: 700, fontSize: 13 }}>{label}</span>{children}</label>;
}

function Modal({ title, onClose, children, wide = false }) {
  return <div style={overlay} role="dialog" aria-modal="true"><section style={{ ...modal, maxWidth: wide ? 940 : 600 }}><header style={modalHeader}><h2 style={{ margin: 0 }}>{title}</h2><button onClick={onClose} aria-label="Close" style={closeButton}>×</button></header>{children}</section></div>;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

const page = { minHeight: "100dvh", background: "#0b0d12", color: "#f5f7fb", padding: "clamp(18px, 4vw, 48px)", boxSizing: "border-box", fontFamily: "system-ui, -apple-system, sans-serif" };
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" };
const summaryGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 };
const summaryCard = { border: "1px solid #32394a", background: "#181c25", borderRadius: 12, padding: 16 };
const filterBar = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 };
const tableShell = { overflow: "auto", border: "1px solid #32394a", borderRadius: 12, background: "#181c25" };
const th = { textAlign: "left", padding: 13, color: "#aeb7c9", borderBottom: "1px solid #32394a", background: "#202532", whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1 };
const td = { padding: 13, borderBottom: "1px solid #2a3040", verticalAlign: "top" };
const muted = { color: "#919bad", fontSize: 12, marginTop: 3 };
const badge = { display: "inline-block", border: "1px solid", borderRadius: 999, padding: "4px 8px", fontWeight: 800, fontSize: 12, whiteSpace: "nowrap" };
const actions = { display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" };
const primaryButton = { border: 0, borderRadius: 8, background: "#3ba4f7", color: "#08111d", padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const secondaryButton = { border: "1px solid #32394a", borderRadius: 8, background: "#202532", color: "#f5f7fb", padding: "9px 12px", fontWeight: 700, cursor: "pointer" };
const dangerButton = { ...secondaryButton, borderColor: "#7f1d1d", color: "#fca5a5" };
const errorBox = { marginBottom: 18, border: "1px solid #991b1b", background: "rgba(127,29,29,.32)", color: "#fecaca", borderRadius: 9, padding: 12 };
const emptyCard = { border: "1px solid #32394a", background: "#181c25", color: "#aeb7c9", borderRadius: 12, padding: 24 };
const overlay = { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.76)", display: "grid", placeItems: "center", padding: 16 };
const modal = { width: "100%", maxHeight: "90dvh", overflow: "auto", boxSizing: "border-box", border: "1px solid #3a4255", background: "#181c25", borderRadius: 14, padding: 20, boxShadow: "0 24px 70px rgba(0,0,0,.5)" };
const modalHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 };
const closeButton = { border: 0, background: "transparent", color: "#cbd5e1", fontSize: 28, cursor: "pointer" };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 };
const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #465066", borderRadius: 8, background: "#202532", color: "#f5f7fb", padding: "10px 11px", font: "inherit" };
