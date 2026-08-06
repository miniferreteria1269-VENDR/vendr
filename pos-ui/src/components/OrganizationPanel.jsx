import {
  useEffect,
  useMemo,
  useState
} from "react";

import apiClient from "../apiClient";
import { useLang } from "../LanguageContext";

const COLORS = {
  panel: "#1a1d24",
  panelAlt: "#222733",
  border: "#2f3542",
  text: "#e6edf3",
  textDim: "#9da7b3",
  primary: "#3aa0ff",
  danger: "#ff5c5c"
};

const TOKEN_KEY =
  "vendr_organization_report_token";

const getLocalDateValue = () => {
  const now = new Date();

  const localDate = new Date(
    now.getTime() -
    now.getTimezoneOffset() * 60000
  );

  return localDate
    .toISOString()
    .slice(0, 10);
};

const getErrorDetail = (
  error,
  fallback
) => {
  return String(
    error.response?.data?.detail ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
};

const getTokenExpiration = token => {
  try {
    const payloadPart = token.split(".")[1];

    const normalizedPayload = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      "="
    );

    const payload = JSON.parse(
      window.atob(paddedPayload)
    );

    return Number(payload.exp || 0) * 1000;
  } catch (error) {
    return 0;
  }
};

function OrganizationPanel({
  organization,
  onLocked
}) {
  const { t } = useLang();

  const today = getLocalDateValue();

  const [organizationToken, setOrganizationToken] =
    useState(() =>
      sessionStorage.getItem(TOKEN_KEY) || ""
    );

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [stores, setStores] = useState([]);
  const [selectedStoreIds, setSelectedStoreIds] =
    useState([]);

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] =
    useState("");

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

  const selectedStoreSet = useMemo(
    () => new Set(selectedStoreIds),
    [selectedStoreIds]
  );

  const allStoresSelected =
    stores.length > 0 &&
    selectedStoreIds.length === stores.length;

  const lockOrganization = (
    returnToPreviousView = true
  ) => {
    sessionStorage.removeItem(TOKEN_KEY);
    setOrganizationToken("");
    setPassword("");
    setStores([]);
    setSelectedStoreIds([]);
    setReport(null);
    setErrorMessage("");

    if (returnToPreviousView) {
      onLocked?.();
    }
  };

  const handleProtectedError = (
    error,
    fallback
  ) => {
    if (
      error.response?.status === 401 ||
      error.response?.status === 403
    ) {
      lockOrganization(false);
      setLoginError(
        t("organization_session_expired")
      );
      return;
    }

    setErrorMessage(
      getErrorDetail(error, fallback)
    );
  };

  const getOrganizationHeaders = token => ({
    "X-Organization-Token": token
  });

  const loadReport = async (
    token,
    storeIds = selectedStoreIds
  ) => {
    if (
      !token ||
      invalidDateRange ||
      storeIds.length === 0
    ) {
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient.get(
        "/organization-report/sales",
        {
          params: {
            start_date: startDate,
            end_date: endDate,
            store_ids: storeIds.join(",")
          },
          headers:
            getOrganizationHeaders(token)
        }
      );

      setReport(response.data);
    } catch (error) {
      console.error(
        "Unable to load organization report:",
        error
      );

      handleProtectedError(
        error,
        t("organization_report_load_failed")
      );
    } finally {
      setLoading(false);
    }
  };

  const loadStoresAndInitialReport = async token => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response = await apiClient.get(
        "/organization-report/stores",
        {
          headers:
            getOrganizationHeaders(token)
        }
      );

      const loadedStores =
        response.data.stores || [];

      const loadedStoreIds = loadedStores.map(
        store => Number(store.store_id)
      );

      setStores(loadedStores);
      setSelectedStoreIds(loadedStoreIds);

      if (loadedStoreIds.length === 0) {
        setReport(null);
        return;
      }

      const reportResponse = await apiClient.get(
        "/organization-report/sales",
        {
          params: {
            start_date: startDate,
            end_date: endDate,
            store_ids: loadedStoreIds.join(",")
          },
          headers:
            getOrganizationHeaders(token)
        }
      );

      setReport(reportResponse.data);
    } catch (error) {
      console.error(
        "Unable to initialize organization report:",
        error
      );

      handleProtectedError(
        error,
        t("organization_report_load_failed")
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationToken) {
      loadStoresAndInitialReport(
        organizationToken
      );
    }
  }, [organizationToken]);

  // Remove the sensitive report from the screen as soon
  // as the short-lived secondary token expires.
  useEffect(() => {
    if (!organizationToken) return;

    const expiresAt = getTokenExpiration(
      organizationToken
    );

    const remainingMilliseconds =
      expiresAt - Date.now();

    if (remainingMilliseconds <= 0) {
      lockOrganization(false);
      setLoginError(
        t("organization_session_expired")
      );
      return;
    }

    const timeoutId = window.setTimeout(
      () => {
        lockOrganization(false);
        setLoginError(
          t("organization_session_expired")
        );
      },
      remainingMilliseconds
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [organizationToken]);

  const unlockOrganization = async event => {
    event.preventDefault();

    const normalizedUsername = username.trim();

    if (!normalizedUsername || !password) {
      setLoginError(
        t("organization_credentials_required")
      );
      return;
    }

    setUnlocking(true);
    setLoginError("");

    try {
      const response = await apiClient.post(
        "/organization-access/login",
        {
          username: normalizedUsername,
          password
        }
      );

      const responseData = response.data || {};

      const issuedToken =
        responseData.organization_token ||
        responseData.organization_access_token ||
        responseData.organization_report_token ||
        responseData.access_token;

      if (!issuedToken) {
        throw new Error(
          "Organization token was not returned"
        );
      }

      sessionStorage.setItem(
        TOKEN_KEY,
        issuedToken
      );

      setPassword("");
      setOrganizationToken(issuedToken);
    } catch (error) {
      console.error(
        "Unable to unlock organization reports:",
        error
      );

      setLoginError(
        getErrorDetail(
          error,
          t("organization_login_failed")
        )
      );
    } finally {
      setUnlocking(false);
    }
  };

  const toggleStore = storeId => {
    setSelectedStoreIds(current => {
      if (current.includes(storeId)) {
        return current.filter(
          id => id !== storeId
        );
      }

      return [
        ...current,
        storeId
      ];
    });
  };

  const selectAllStores = () => {
    setSelectedStoreIds(
      stores.map(
        store => Number(store.store_id)
      )
    );
  };

  const formatMoney = value =>
    `$${Number(value || 0).toFixed(2)}`;

  if (!organizationToken) {
    return (
      <div style={pageStyle}>
        <div style={lockedPanelStyle}>
          <h2 style={{ margin: 0 }}>
            {t("organization_reports")}
          </h2>

          <div
            style={{
              color: COLORS.textDim,
              lineHeight: 1.45
            }}
          >
            {organization?.organization_name ||
              t("organization")}
          </div>

          <div
            style={{
              color: COLORS.textDim,
              lineHeight: 1.45
            }}
          >
            {t("organization_unlock_description")}
          </div>

          <form
            onSubmit={unlockOrganization}
            style={{
              display: "grid",
              gap: 12
            }}
          >
            <label style={labelStyle}>
              {t("username")}

              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={event =>
                  setUsername(event.target.value)
                }
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              {t("password")}

              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event =>
                  setPassword(event.target.value)
                }
                style={inputStyle}
              />
            </label>

            {loginError && (
              <div style={errorStyle}>
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={unlocking}
              style={{
                ...primaryButtonStyle,
                opacity: unlocking ? 0.6 : 1,
                cursor:
                  unlocking
                    ? "not-allowed"
                    : "pointer"
              }}
            >
              {unlocking
                ? t("unlocking")
                : t("unlock_organization")}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const summary = report?.summary || {};
  const storeReports = report?.stores || [];

  return (
    <div style={pageStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap"
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            {report?.organization
              ?.organization_name ||
              organization?.organization_name ||
              t("organization_reports")}
          </h2>

          <div
            style={{
              color: COLORS.textDim,
              marginTop: 4
            }}
          >
            {t("organization_sales_report")}
          </div>
        </div>

        <button
          type="button"
          onClick={() => lockOrganization(true)}
          style={secondaryButtonStyle}
        >
          {t("lock_organization")}
        </button>
      </div>

      <div style={filterPanelStyle}>
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "end",
            flexWrap: "wrap"
          }}
        >
          <label style={labelStyle}>
            {t("start_date")}

            <input
              type="date"
              value={startDate}
              onChange={event =>
                setStartDate(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            {t("end_date")}

            <input
              type="date"
              value={endDate}
              onChange={event =>
                setEndDate(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              loadReport(
                organizationToken,
                selectedStoreIds
              )
            }
            disabled={
              loading ||
              invalidDateRange ||
              selectedStoreIds.length === 0
            }
            style={{
              ...primaryButtonStyle,
              opacity:
                loading ||
                invalidDateRange ||
                selectedStoreIds.length === 0
                  ? 0.6
                  : 1
            }}
          >
            {loading
              ? t("loading")
              : t("apply")}
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap"
          }}
        >
          <button
            type="button"
            onClick={selectAllStores}
            style={{
              ...secondaryButtonStyle,
              background:
                allStoresSelected
                  ? COLORS.primary
                  : COLORS.panelAlt
            }}
          >
            {t("all_stores")}
          </button>

          {stores.map(store => {
            const storeId = Number(
              store.store_id
            );

            const selected =
              selectedStoreSet.has(storeId);

            return (
              <label
                key={storeId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border:
                    `1px solid ${
                      selected
                        ? COLORS.primary
                        : COLORS.border
                    }`,
                  background:
                    selected
                      ? "rgba(58,160,255,0.14)"
                      : COLORS.panelAlt,
                  cursor: "pointer",
                  userSelect: "none"
                }}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() =>
                    toggleStore(storeId)
                  }
                />

                {store.store_name}
              </label>
            );
          })}
        </div>

        {selectedStoreIds.length === 0 && (
          <div style={errorStyle}>
            {t("select_at_least_one_store")}
          </div>
        )}
      </div>

      {errorMessage && (
        <div style={errorStyle}>
          {errorMessage}
        </div>
      )}

      <div style={metricGridStyle}>
        <Metric
          label={t("revenue")}
          value={formatMoney(summary.revenue)}
        />

        <Metric
          label={t("profit")}
          value={formatMoney(summary.profit)}
        />

        <Metric
          label={t("tickets")}
          value={Number(summary.tickets || 0)}
        />

        <Metric
          label={t("avg_ticket")}
          value={formatMoney(
            summary.average_ticket
          )}
        />

        <Metric
          label={t("avg_daily_revenue")}
          value={formatMoney(
            summary.average_daily_revenue
          )}
        />

        <Metric
          label={t("avg_daily_profit")}
          value={formatMoney(
            summary.average_daily_profit
          )}
        />
      </div>

      <div style={tableShellStyle}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headerCellStyle}>
                {t("store")}
              </th>

              <th style={headerCellStyle}>
                {t("revenue")}
              </th>

              <th style={headerCellStyle}>
                {t("profit")}
              </th>

              <th style={headerCellStyle}>
                {t("tickets")}
              </th>

              <th style={headerCellStyle}>
                {t("avg_ticket")}
              </th>

              <th style={headerCellStyle}>
                {t("revenue_share")}
              </th>

              <th style={headerCellStyle}>
                {t("profit_share")}
              </th>
            </tr>
          </thead>

          <tbody>
            {storeReports.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={emptyCellStyle}
                >
                  {loading
                    ? t("loading")
                    : t("no_data")}
                </td>
              </tr>
            ) : (
              storeReports.map(store => (
                <tr key={store.store_id}>
                  <td style={bodyCellStyle}>
                    {store.store_name}
                  </td>

                  <td style={bodyCellStyle}>
                    {formatMoney(store.revenue)}
                  </td>

                  <td style={bodyCellStyle}>
                    {formatMoney(store.profit)}
                  </td>

                  <td style={bodyCellStyle}>
                    {Number(store.tickets || 0)}
                  </td>

                  <td style={bodyCellStyle}>
                    {formatMoney(
                      store.average_ticket
                    )}
                  </td>

                  <td style={bodyCellStyle}>
                    {Number(
                      store.revenue_share_percent || 0
                    ).toFixed(2)}%
                  </td>

                  <td style={bodyCellStyle}>
                    {Number(
                      store.profit_share_percent || 0
                    ).toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({
  label,
  value
}) {
  return (
    <div style={metricStyle}>
      <div
        style={{
          color: COLORS.textDim,
          fontSize: 12
        }}
      >
        {label}
      </div>

      <div
        style={{
          color: COLORS.primary,
          fontSize: 20,
          fontWeight: "bold"
        }}
      >
        {value}
      </div>
    </div>
  );
}

const pageStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  boxSizing: "border-box"
};

const lockedPanelStyle = {
  width: "100%",
  maxWidth: 430,
  margin: "48px auto",
  padding: 20,
  borderRadius: 12,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.panel,
  display: "grid",
  gap: 16,
  boxSizing: "border-box"
};

const filterPanelStyle = {
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: 12,
  display: "grid",
  gap: 12
};

const labelStyle = {
  display: "grid",
  gap: 5,
  color: COLORS.text,
  fontSize: 13
};

const inputStyle = {
  minWidth: 0,
  padding: "9px 10px",
  borderRadius: 8,
  border: `1px solid ${COLORS.border}`,
  background: COLORS.panelAlt,
  color: COLORS.text,
  boxSizing: "border-box"
};

const primaryButtonStyle = {
  padding: "9px 13px",
  border: "none",
  borderRadius: 8,
  background: COLORS.primary,
  color: "white",
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const secondaryButtonStyle = {
  padding: "8px 11px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.panelAlt,
  color: COLORS.text,
  cursor: "pointer",
  whiteSpace: "nowrap"
};

const errorStyle = {
  padding: 10,
  borderRadius: 8,
  background: "rgba(255,92,92,0.12)",
  color: COLORS.danger
};

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(6, minmax(120px, 1fr))",
  gap: 10,
  overflowX: "auto"
};

const metricStyle = {
  minWidth: 120,
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  padding: 12
};

const tableShellStyle = {
  flex: 1,
  minHeight: 180,
  overflow: "auto",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10
};

const tableStyle = {
  width: "100%",
  minWidth: 820,
  borderCollapse: "collapse"
};

const headerCellStyle = {
  position: "sticky",
  top: 0,
  zIndex: 1,
  padding: "10px 12px",
  textAlign: "left",
  whiteSpace: "nowrap",
  background: COLORS.panelAlt,
  borderBottom: `1px solid ${COLORS.border}`
};

const bodyCellStyle = {
  padding: "10px 12px",
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${COLORS.border}`
};

const emptyCellStyle = {
  ...bodyCellStyle,
  height: 100,
  textAlign: "center",
  color: COLORS.textDim
};

export default OrganizationPanel;
