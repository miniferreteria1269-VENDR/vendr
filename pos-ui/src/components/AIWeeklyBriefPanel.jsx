import {
  useEffect,
  useMemo,
  useState
} from "react";

import {
  useLang
} from "../LanguageContext";

import apiClient from "../apiClient";

import {
  COLORS,
  card,
  btnPrimary,
  input
} from "../uiStyles";

const priorityColors = {
  high: "#ff8a65",
  medium: "#ffd166",
  low: COLORS.primary
};

function AIWeeklyBriefPanel({
  storeId
}) {
  const {
    t,
    lang
  } = useLang();

  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadReports = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient.get(
        "/ai-reports/weekly"
      );

      const loadedReports =
        response.data.reports || [];

      setReports(loadedReports);
      setEnabled(Boolean(response.data.enabled));
      setConfigured(Boolean(response.data.configured));

      setSelectedId(current => {
        const stillExists = loadedReports.some(
          report => String(report.report_id) === String(current)
        );

        return stillExists
          ? current
          : String(loadedReports[0]?.report_id || "");
      });
    } catch (error) {
      console.error("COULD NOT LOAD AI REPORTS:", error);

      setErrorMessage(
        String(
          error.response?.data?.detail ||
          error.message ||
          t("ai_report_load_failed")
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    apiClient.get(
      "/ai-reports/weekly"
    ).then(response => {
      if (cancelled) {
        return;
      }

      const loadedReports =
        response.data.reports || [];

      setReports(loadedReports);
      setEnabled(Boolean(response.data.enabled));
      setConfigured(Boolean(response.data.configured));
      setSelectedId(
        String(loadedReports[0]?.report_id || "")
      );
    }).catch(error => {
      if (cancelled) {
        return;
      }

      console.error("COULD NOT LOAD AI REPORTS:", error);

      setErrorMessage(
        String(
          error.response?.data?.detail ||
          error.message ||
          "Could not load weekly reports."
        )
      );
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedReport = useMemo(
    () => reports.find(
      report => String(report.report_id) === String(selectedId)
    ) || reports[0],
    [reports, selectedId]
  );

  const generateReport = async () => {
    if (generating) {
      return;
    }

    setGenerating(true);
    setErrorMessage("");

    try {
      await apiClient.post(
        "/ai-reports/weekly/generate"
      );

      await loadReports();
    } catch (error) {
      console.error("COULD NOT GENERATE AI REPORT:", error);

      setErrorMessage(
        String(
          error.response?.data?.detail ||
          error.message ||
          t("ai_report_generate_failed")
        )
      );
    } finally {
      setGenerating(false);
    }
  };

  const formatDate = value => {
    if (!value) {
      return "";
    }

    return new Intl.DateTimeFormat(
      lang === "es" ? "es-SV" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC"
      }
    ).format(new Date(`${value}T00:00:00Z`));
  };

  if (loading) {
    return (
      <StatusCard>
        {t("loading")}
      </StatusCard>
    );
  }

  if (!enabled) {
    return (
      <StatusCard>
        <strong>{t("ai_reporting_not_enabled")}</strong>
        <span>{t("ai_reporting_not_enabled_help")}</span>
        <span>
          {t("store_id")}: {storeId}
        </span>
      </StatusCard>
    );
  }

  if (!configured) {
    return (
      <StatusCard>
        <strong>{t("ai_reporting_not_configured")}</strong>
        <span>{t("ai_reporting_not_configured_help")}</span>
      </StatusCard>
    );
  }

  const report = selectedReport?.report;

  return (
    <div>
      {errorMessage && (
        <div style={errorStyle}>
          {errorMessage}
        </div>
      )}

      {!report ? (
        <div
          style={{
            ...card,
            display: "grid",
            gap: 10,
            justifyItems: "start"
          }}
        >
          <strong>{t("no_weekly_reports")}</strong>
          <span style={{ color: COLORS.textDim }}>
            {t("generate_weekly_report_help")}
          </span>
          <button
            type="button"
            onClick={generateReport}
            disabled={generating}
            style={{
              ...btnPrimary,
              opacity: generating ? 0.6 : 1
            }}
          >
            {generating
              ? t("generating_report")
              : t("generate_weekly_report")}
          </button>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              justifyContent: "space-between",
              flexWrap: "wrap",
              marginBottom: 12
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: COLORS.textDim,
                  marginBottom: 4
                }}
              >
                {t("report_period")}
              </div>
              <strong>
                {formatDate(selectedReport.period_start)}
                {" – "}
                {formatDate(selectedReport.period_end)}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap"
              }}
            >
              {reports.length > 1 && (
                <select
                  value={selectedId}
                  onChange={event =>
                    setSelectedId(event.target.value)
                  }
                  style={input}
                  aria-label={t("select_weekly_report")}
                >
                  {reports.map(item => (
                    <option
                      key={item.report_id}
                      value={item.report_id}
                    >
                      {formatDate(item.period_start)}
                      {" – "}
                      {formatDate(item.period_end)}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={generateReport}
                disabled={generating}
                style={{
                  ...btnPrimary,
                  opacity: generating ? 0.6 : 1
                }}
              >
                {generating
                  ? t("generating_report")
                  : t("generate_weekly_report")}
              </button>
            </div>
          </div>

          <section
            style={{
              ...card,
              border: `1px solid ${COLORS.border}`,
              marginBottom: 12
            }}
          >
            <h3
              style={{
                margin: "0 0 8px",
                color: COLORS.primary
              }}
            >
              {report.headline}
            </h3>
            <p style={{ margin: 0, lineHeight: 1.55 }}>
              {report.executive_summary}
            </p>
          </section>

          <div style={sectionGridStyle}>
            <ReportSection
              title={t("sales_performance")}
              section={report.sales_performance}
            />
            <ReportSection
              title={t("profitability")}
              section={report.profitability}
            />
            <ReportSection
              title={t("cash_activity")}
              section={report.cash_activity}
            />
            <ReportSection
              title={t("inventory_activity")}
              section={report.inventory_activity}
            />
          </div>

          <div style={sectionGridStyle}>
            <FindingList
              title={t("positive_signals")}
              items={report.positive_signals}
              emptyLabel={t("no_positive_signals")}
            />
            <FindingList
              title={t("concerns")}
              items={report.concerns}
              emptyLabel={t("no_concerns")}
            />
          </div>

          <ActionList
            title={t("recommended_actions")}
            items={report.recommended_actions}
          />

          {report.data_limitations?.length > 0 && (
            <ReportList
              title={t("data_limitations")}
              items={report.data_limitations}
            />
          )}

          <div
            style={{
              marginTop: 10,
              color: COLORS.textDim,
              fontSize: 11
            }}
          >
            {t("ai_report_disclaimer")}
          </div>
        </>
      )}
    </div>
  );
}

function StatusCard({ children }) {
  return (
    <div
      style={{
        ...card,
        display: "grid",
        gap: 8,
        color: COLORS.textDim
      }}
    >
      {children}
    </div>
  );
}

function ReportSection({ title, section }) {
  if (!section) {
    return null;
  }

  return (
    <section style={card}>
      <h4 style={sectionTitleStyle}>{title}</h4>
      <p style={summaryStyle}>{section.summary}</p>
      <Evidence items={section.evidence} />
    </section>
  );
}

function FindingList({ title, items = [], emptyLabel }) {
  return (
    <section style={card}>
      <h4 style={sectionTitleStyle}>{title}</h4>
      {items.length === 0 ? (
        <span style={{ color: COLORS.textDim }}>
          {emptyLabel}
        </span>
      ) : items.map((item, index) => (
        <article
          key={`${item.title}-${index}`}
          style={{
            borderTop: index ? `1px solid ${COLORS.border}` : "none",
            paddingTop: index ? 10 : 0,
            marginTop: index ? 10 : 0
          }}
        >
          <div style={findingHeaderStyle}>
            <strong>{item.title}</strong>
            <PriorityBadge priority={item.priority} />
          </div>
          <p style={summaryStyle}>{item.explanation}</p>
          <Evidence items={item.evidence} />
        </article>
      ))}
    </section>
  );
}

function ActionList({ title, items = [] }) {
  return (
    <section style={{ ...card, marginTop: 12 }}>
      <h4 style={sectionTitleStyle}>{title}</h4>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((item, index) => (
          <article
            key={`${item.title}-${index}`}
            style={{
              background: COLORS.panelAlt,
              borderRadius: 9,
              padding: 10
            }}
          >
            <div style={findingHeaderStyle}>
              <strong>{`${index + 1}. ${item.title}`}</strong>
              <PriorityBadge priority={item.priority} />
            </div>
            <p style={summaryStyle}>{item.action}</p>
            <div style={{ color: COLORS.textDim, fontSize: 12 }}>
              {item.reason}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportList({ title, items = [] }) {
  return (
    <section style={{ ...card, marginTop: 12 }}>
      <h4 style={sectionTitleStyle}>{title}</h4>
      <Evidence items={items} />
    </section>
  );
}

function Evidence({ items = [] }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      style={{
        margin: "8px 0 0",
        paddingLeft: 18,
        color: COLORS.textDim,
        fontSize: 12,
        lineHeight: 1.45
      }}
    >
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function PriorityBadge({ priority = "low" }) {
  const { t } = useLang();
  const color = priorityColors[priority] || COLORS.primary;

  return (
    <span
      style={{
        border: `1px solid ${color}`,
        borderRadius: 999,
        color,
        fontSize: 10,
        fontWeight: 700,
        padding: "2px 7px",
        textTransform: "uppercase",
        whiteSpace: "nowrap"
      }}
    >
      {t(priority)}
    </span>
  );
}

const errorStyle = {
  marginBottom: 12,
  padding: 10,
  borderRadius: 8,
  background: "rgba(255, 92, 92, 0.12)",
  color: COLORS.danger
};

const sectionGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 12
};

const sectionTitleStyle = {
  margin: "0 0 8px"
};

const summaryStyle = {
  margin: 0,
  lineHeight: 1.5
};

const findingHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10
};

export default AIWeeklyBriefPanel;
