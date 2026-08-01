import {
  useEffect,
  useMemo,
  useState
} from "react";

import { useLang } from "../LanguageContext";
import apiClient from "../apiClient";

import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";


const emptyClientForm = {
  client_name: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  tax_id: "",
  notes: "",
  credit_limit: ""
};


function ClientManagement() {
  const { t } = useLang();

  const [clients, setClients] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [showInactive, setShowInactive] =
    useState(false);

  const [form, setForm] =
    useState(emptyClientForm);

  const [editingClientId, setEditingClientId] =
    useState(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");


  const label = (key, fallback) => {
    const translated = t(key);

    if (
      !translated ||
      translated === key
    ) {
      return fallback;
    }

    return translated;
  };


  const loadClients = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await apiClient.get(
          "/clients",
          {
            params: {
              include_inactive:
                showInactive
            }
          }
        );

      const sortedClients = [
        ...(response.data.clients || [])
      ].sort((a, b) =>
        String(a.client_name || "")
          .localeCompare(
            String(b.client_name || ""),
            undefined,
            {
              sensitivity: "base"
            }
          )
      );

      setClients(sortedClients);
    } catch (error) {
      console.error(
        "LOAD CLIENTS ERROR:",
        error
      );

      setClients([]);

      setErrorMessage(
        error.response?.data?.detail ||
        label(
          "client_load_failed",
          "Unable to load clients."
        )
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadClients();
  }, [showInactive]);


  const filteredClients = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return clients;
    }

    return clients.filter(client => {
      const searchableValues = [
        client.client_name,
        client.contact_name,
        client.phone,
        client.whatsapp,
        client.email,
        client.address,
        client.tax_id
      ];

      return searchableValues.some(value =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [clients, searchTerm]);


  const updateField = (
    field,
    value
  ) => {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  };


  const closeModal = () => {
    if (submitting) {
      return;
    }

    setModalOpen(false);
    setEditingClientId(null);
    setForm(emptyClientForm);
    setErrorMessage("");
  };


  const openCreateModal = () => {
    setEditingClientId(null);
    setForm(emptyClientForm);
    setErrorMessage("");
    setModalOpen(true);
  };


  const openEditModal = client => {
    setEditingClientId(
      client.client_id
    );

    setForm({
      client_name:
        client.client_name || "",

      contact_name:
        client.contact_name || "",

      phone:
        client.phone || "",

      whatsapp:
        client.whatsapp || "",

      email:
        client.email || "",

      address:
        client.address || "",

      tax_id:
        client.tax_id || "",

      notes:
        client.notes || "",

      credit_limit:
        client.credit_limit == null
          ? ""
          : String(client.credit_limit)
    });

    setErrorMessage("");
    setModalOpen(true);
  };


  const buildPayload = () => ({
    client_name:
      form.client_name.trim(),

    contact_name:
      form.contact_name.trim() || null,

    phone:
      form.phone.trim() || null,

    whatsapp:
      form.whatsapp.trim() || null,

    email:
      form.email.trim() || null,

    address:
      form.address.trim() || null,

    tax_id:
      form.tax_id.trim() || null,

    notes:
      form.notes.trim() || null,

    credit_limit:
      form.credit_limit === ""
        ? null
        : Number(form.credit_limit)
  });


  const saveClient = async () => {
    const payload = buildPayload();

    if (!payload.client_name) {
      setErrorMessage(
        label(
          "client_name_required",
          "Client name is required."
        )
      );

      return;
    }

    if (
      payload.credit_limit !== null &&
      (
        !Number.isFinite(
          payload.credit_limit
        ) ||
        payload.credit_limit < 0
      )
    ) {
      setErrorMessage(
        label(
          "invalid_credit_limit",
          "Credit limit must be zero or greater."
        )
      );

      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (editingClientId === null) {
        await apiClient.post(
          "/clients",
          payload
        );
      } else {
        await apiClient.put(
          `/clients/${editingClientId}`,
          payload
        );
      }

      setModalOpen(false);
      setEditingClientId(null);
      setForm(emptyClientForm);

      await loadClients();
    } catch (error) {
      console.error(
        "SAVE CLIENT ERROR:",
        error
      );

      setErrorMessage(
        error.response?.data?.detail ||
        label(
          "client_save_failed",
          "Unable to save client."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };


  const changeClientStatus = async client => {
    const activating =
      !client.is_active;

    const confirmationMessage = activating
      ? label(
          "confirm_reactivate_client",
          `Reactivate ${client.client_name}?`
        )
      : label(
          "confirm_deactivate_client",
          `Deactivate ${client.client_name}? Their history will remain available.`
        );

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setErrorMessage("");

    try {
      await apiClient.patch(
        `/clients/${client.client_id}/${
          activating
            ? "reactivate"
            : "deactivate"
        }`
      );

      await loadClients();
    } catch (error) {
      console.error(
        "CHANGE CLIENT STATUS ERROR:",
        error
      );

      setErrorMessage(
        error.response?.data?.detail ||
        label(
          "client_status_failed",
          "Unable to change client status."
        )
      );
    }
  };


  const formatCreditLimit = value => {
    if (value == null) {
      return "—";
    }

    return `$${Number(value).toFixed(2)}`;
  };


  const formatBalance = value =>
    `$${Number(value || 0).toFixed(2)}`;


  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0
      }}
    >
      {errorMessage && !modalOpen && (
        <div
          style={{
            background: COLORS.panelAlt,
            color: COLORS.danger,
            borderRadius: 8,
            padding: 10,
            marginBottom: 12
          }}
        >
          {errorMessage}
        </div>
      )}

      <div
        style={{
          ...card,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
            flexWrap: "wrap"
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <input
              type="text"
              placeholder={label(
                "search_clients",
                "Search clients..."
              )}
              value={searchTerm}
              onChange={event =>
                setSearchTerm(
                  event.target.value
                )
              }
              style={{
                ...input,
                width: 280,
                maxWidth: "100%"
              }}
            />

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: COLORS.textDim,
                whiteSpace: "nowrap",
                cursor: "pointer"
              }}
            >
              <input
                type="checkbox"
                checked={showInactive}
                onChange={event =>
                  setShowInactive(
                    event.target.checked
                  )
                }
              />

              {label(
                "show_inactive",
                "Show inactive"
              )}
            </label>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            style={btnPrimary}
          >
            + {label(
              "new_client",
              "New Client"
            )}
          </button>
        </div>

        {loading && (
          <div
            style={{
              color: COLORS.textDim
            }}
          >
            {label("loading", "Loading...")}
          </div>
        )}

        {!loading &&
          filteredClients.length === 0 && (
            <div
              style={{
                color: COLORS.textDim
              }}
            >
              {searchTerm.trim()
                ? label(
                    "no_clients_found",
                    "No matching clients found."
                  )
                : label(
                    "no_clients",
                    "No clients have been created."
                  )}
            </div>
          )}

        {!loading &&
          filteredClients.length > 0 && (
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                border:
                  `1px solid ${COLORS.border}`,
                borderRadius: 8
              }}
            >
              <table
                style={{
                  width: "100%",
                  minWidth: 900,
                  borderCollapse: "collapse"
                }}
              >
                <thead>
                  <tr>
                    <TableHeader>
                      {label("client", "Client")}
                    </TableHeader>

                    <TableHeader>
                      {label("contact", "Contact")}
                    </TableHeader>

                    <TableHeader>
                      {label("phone", "Phone")}
                    </TableHeader>

                    <TableHeader>
                      {label("whatsapp", "WhatsApp")}
                    </TableHeader>

                    <TableHeader>
                      {label(
                        "credit_limit",
                        "Credit Limit"
                      )}
                    </TableHeader>

                    <TableHeader>
                      {label(
                        "balance",
                        "Balance"
                      )}
                    </TableHeader>

                    <TableHeader>
                      {label("status", "Status")}
                    </TableHeader>

                    <TableHeader>
                      {label("actions", "Actions")}
                    </TableHeader>
                  </tr>
                </thead>

                <tbody>
                  {filteredClients.map(client => (
                    <tr
                      key={client.client_id}
                      style={{
                        borderBottom:
                          `1px solid ${COLORS.border}`,
                        opacity:
                          client.is_active
                            ? 1
                            : 0.65
                      }}
                    >
                      <TableCell>
                        <button
                          type="button"
                          onClick={() =>
                            openEditModal(client)
                          }
                          style={{
                            background: "transparent",
                            border: "none",
                            padding: 0,
                            color: COLORS.primary,
                            cursor: "pointer",
                            fontWeight: "bold",
                            textAlign: "left"
                          }}
                        >
                          {client.client_name}
                        </button>
                      </TableCell>

                      <TableCell>
                        {client.contact_name || "—"}
                      </TableCell>

                      <TableCell>
                        {client.phone || "—"}
                      </TableCell>

                      <TableCell>
                        {client.whatsapp || "—"}
                      </TableCell>

                      <TableCell>
                        {formatCreditLimit(
                          client.credit_limit
                        )}
                      </TableCell>

                      <TableCell>
                        <span
                          title={
                            client.has_overdue_balance
                              ? label(
                                  "overdue_balance",
                                  "This client has an overdue balance."
                                )
                              : undefined
                          }
                          style={{
                            color:
                              client.has_overdue_balance
                                ? COLORS.danger
                                : COLORS.text,
                            fontWeight: "bold",
                            whiteSpace: "nowrap"
                          }}
                        >
                          {formatBalance(
                            client.outstanding_balance
                          )}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span
                          style={{
                            color: client.is_active
                              ? "#36d17c"
                              : COLORS.textDim,
                            fontWeight: "bold"
                          }}
                        >
                          {client.is_active
                            ? label("active", "Active")
                            : label("inactive", "Inactive")}
                        </span>
                      </TableCell>

                      <TableCell>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap"
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              openEditModal(client)
                            }
                            disabled={!client.is_active}
                            style={{
                              ...btnSecondary,
                              padding: "5px 8px",
                              opacity:
                                client.is_active
                                  ? 1
                                  : 0.5
                            }}
                          >
                            {label("edit", "Edit")}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              changeClientStatus(client)
                            }
                            style={{
                              ...(client.is_active
                                ? dangerButtonStyle
                                : btnPrimary),
                              padding: "5px 8px"
                            }}
                          >
                            {client.is_active
                              ? label(
                                  "deactivate",
                                  "Deactivate"
                                )
                              : label(
                                  "reactivate",
                                  "Reactivate"
                                )}
                          </button>
                        </div>
                      </TableCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {modalOpen && (
        <div
          role="presentation"
          onMouseDown={event => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
          style={modalBackdropStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="client-modal-title"
            style={modalStyle}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 14
              }}
            >
              <h3
                id="client-modal-title"
                style={{ margin: 0 }}
              >
                {editingClientId === null
                  ? label(
                      "new_client",
                      "New Client"
                    )
                  : label(
                      "edit_client",
                      "Edit Client"
                    )}
              </h3>

              <button
                type="button"
                aria-label={label("close", "Close")}
                onClick={closeModal}
                disabled={submitting}
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div
                style={{
                  background: COLORS.panelAlt,
                  color: COLORS.danger,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12
                }}
              >
                {errorMessage}
              </div>
            )}

            <div style={formGridStyle}>
              <FormField
                label={`${label(
                  "client_name",
                  "Client Name"
                )} *`}
                value={form.client_name}
                onChange={value =>
                  updateField("client_name", value)
                }
                disabled={submitting}
              />

              <FormField
                label={label(
                  "contact_name",
                  "Contact Name"
                )}
                value={form.contact_name}
                onChange={value =>
                  updateField("contact_name", value)
                }
                disabled={submitting}
              />

              <FormField
                label={label("phone", "Phone")}
                value={form.phone}
                onChange={value =>
                  updateField("phone", value)
                }
                disabled={submitting}
              />

              <FormField
                label={label("whatsapp", "WhatsApp")}
                value={form.whatsapp}
                onChange={value =>
                  updateField("whatsapp", value)
                }
                disabled={submitting}
              />

              <FormField
                label={label("email", "Email")}
                type="email"
                value={form.email}
                onChange={value =>
                  updateField("email", value)
                }
                disabled={submitting}
              />

              <FormField
                label={label(
                  "tax_id",
                  "Tax / Identification Number"
                )}
                value={form.tax_id}
                onChange={value =>
                  updateField("tax_id", value)
                }
                disabled={submitting}
              />

              <FormField
                label={label("address", "Address")}
                value={form.address}
                onChange={value =>
                  updateField("address", value)
                }
                disabled={submitting}
              />

              <FormField
                label={label(
                  "credit_limit",
                  "Credit Limit"
                )}
                type="number"
                min="0"
                step="0.01"
                value={form.credit_limit}
                onChange={value =>
                  updateField("credit_limit", value)
                }
                disabled={submitting}
              />
            </div>

            <label
              style={{
                display: "block",
                marginTop: 10,
                marginBottom: 4
              }}
            >
              {label("notes", "Notes")}
            </label>

            <textarea
              value={form.notes}
              onChange={event =>
                updateField(
                  "notes",
                  event.target.value
                )
              }
              disabled={submitting}
              rows={3}
              style={{
                ...input,
                width: "100%",
                boxSizing: "border-box",
                resize: "vertical"
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
                flexWrap: "wrap"
              }}
            >
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                style={{
                  ...btnSecondary,
                  opacity: submitting ? 0.6 : 1
                }}
              >
                {label("cancel", "Cancel")}
              </button>

              <button
                type="button"
                onClick={saveClient}
                disabled={submitting}
                style={{
                  ...btnPrimary,
                  opacity: submitting ? 0.6 : 1,
                  cursor: submitting
                    ? "default"
                    : "pointer"
                }}
              >
                {submitting
                  ? label("loading", "Saving...")
                  : label("save", "Save")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function TableHeader({ children }) {
  return (
    <th
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1,
        background: COLORS.panel,
        textAlign: "left",
        padding: 8,
        borderBottom:
          `1px solid ${COLORS.border}`,
        whiteSpace: "nowrap"
      }}
    >
      {children}
    </th>
  );
}


function TableCell({ children }) {
  return (
    <td
      style={{
        padding: 8,
        verticalAlign: "top"
      }}
    >
      {children}
    </td>
  );
}


function FormField({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  min,
  step
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0
      }}
    >
      <span>{label}</span>

      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={event =>
          onChange(event.target.value)
        }
        disabled={disabled}
        style={{
          ...input,
          width: "100%",
          boxSizing: "border-box"
        }}
      />
    </label>
  );
}


const modalBackdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box",
  background: "rgba(0, 0, 0, 0.72)"
};


const modalStyle = {
  width: "min(720px, 100%)",
  maxHeight: "calc(100vh - 32px)",
  overflowY: "auto",
  boxSizing: "border-box",
  background: COLORS.panel,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 12,
  padding: 16,
  boxShadow: "0 20px 60px rgba(0, 0, 0, 0.45)"
};


const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10
};


const closeButtonStyle = {
  background: "transparent",
  border: "none",
  color: COLORS.text,
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer",
  padding: 4
};


const dangerButtonStyle = {
  background: COLORS.danger,
  color: "white",
  border: "none",
  borderRadius: 6,
  cursor: "pointer"
};


export default ClientManagement;
