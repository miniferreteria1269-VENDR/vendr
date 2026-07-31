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


const emptySupplierForm = {
  supplier_name: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  notes: ""
};


function SupplierManagement() {
  const { t } = useLang();

  const [supplierView, setSupplierView] =
    useState("list");

  const [suppliers, setSuppliers] =
    useState([]);

  const [searchTerm, setSearchTerm] =
    useState("");

  const [form, setForm] =
    useState(emptySupplierForm);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");


  const loadSuppliers = async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const response =
        await apiClient.get("/suppliers");

      const sortedSuppliers = [
        ...(response.data.suppliers || [])
      ].sort((a, b) =>
        String(a.supplier_name || "").localeCompare(
          String(b.supplier_name || ""),
          undefined,
          {
            sensitivity: "base"
          }
        )
      );

      setSuppliers(sortedSuppliers);
    } catch (error) {
      console.error(
        "LOAD SUPPLIERS ERROR:",
        error
      );

      setErrorMessage(
        error.response?.data?.detail ||
        t("supplier_load_failed")
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadSuppliers();
  }, []);


  const filteredSuppliers = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return suppliers;
    }

    return suppliers.filter(supplier => {
      const searchableValues = [
        supplier.supplier_name,
        supplier.contact_name,
        supplier.phone,
        supplier.whatsapp,
        supplier.email
      ];

      return searchableValues.some(value =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearch)
      );
    });
  }, [suppliers, searchTerm]);


  const updateField = (
    field,
    value
  ) => {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  };


  const resetForm = () => {
    setForm(emptySupplierForm);
    setErrorMessage("");
  };


  const openCreateView = () => {
    resetForm();
    setSupplierView("create");
  };


  const returnToList = () => {
    resetForm();
    setSupplierView("list");
  };


  const createSupplier = async () => {
    const supplierName =
      form.supplier_name.trim();

    if (!supplierName) {
      alert(t("supplier_name_required"));
      return;
    }

    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      await apiClient.post(
        "/suppliers",
        null,
        {
          params: {
            supplier_name: supplierName,

            contact_name:
              form.contact_name.trim() ||
              undefined,

            phone:
              form.phone.trim() ||
              undefined,

            whatsapp:
              form.whatsapp.trim() ||
              undefined,

            email:
              form.email.trim() ||
              undefined,

            address:
              form.address.trim() ||
              undefined,

            notes:
              form.notes.trim() ||
              undefined
          }
        }
      );

      alert(t("supplier_created"));

      await loadSuppliers();

      returnToList();
    } catch (error) {
      console.error(
        "CREATE SUPPLIER ERROR:",
        error
      );

      const detail =
        error.response?.data?.detail;

      setErrorMessage(
        detail ||
        t("supplier_create_failed")
      );
    } finally {
      setSubmitting(false);
    }
  };


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
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={() =>
            setSupplierView("list")
          }
          style={
            supplierView === "list"
              ? btnPrimary
              : btnSecondary
          }
        >
          {t("supplier_list")}
        </button>

        <button
          type="button"
          onClick={openCreateView}
          style={
            supplierView === "create"
              ? btnPrimary
              : btnSecondary
          }
        >
          {t("new_supplier")}
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

      {/* SUPPLIER LIST */}
      {supplierView === "list" && (
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
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap"
            }}
          >
            <input
              type="text"
              placeholder={
                t("search_suppliers")
              }
              value={searchTerm}
              onChange={event =>
                setSearchTerm(
                  event.target.value
                )
              }
              style={{
                ...input,
                width: 300
              }}
            />

            <button
              type="button"
              onClick={openCreateView}
              style={btnPrimary}
            >
              + {t("new_supplier")}
            </button>
          </div>

          {loading && (
            <div
              style={{
                color: COLORS.textDim,
                marginBottom: 12
              }}
            >
              {t("loading")}
            </div>
          )}

          {!loading &&
            filteredSuppliers.length === 0 && (
              <div
                style={{
                  color: COLORS.textDim
                }}
              >
                {searchTerm.trim()
                  ? t("no_suppliers_found")
                  : t("no_suppliers")}
              </div>
            )}

          {!loading &&
            filteredSuppliers.length > 0 && (
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  minHeight: 0
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse"
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom:
                          `1px solid ${COLORS.border}`
                      }}
                    >
                      <th
                        style={{
                          textAlign: "left",
                          padding: 8
                        }}
                      >
                        {t("supplier")}
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: 8
                        }}
                      >
                        {t("contact")}
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: 8
                        }}
                      >
                        {t("phone")}
                      </th>

                      <th
                        style={{
                          textAlign: "left",
                          padding: 8
                        }}
                      >
                        {t("whatsapp")}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredSuppliers.map(
                      supplier => (
                        <tr
                          key={
                            supplier.supplier_id
                          }
                          style={{
                            borderBottom:
                              `1px solid ${COLORS.border}`
                          }}
                        >
                          <td
                            style={{
                              padding: 8
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                /*
                                 * This will later open
                                 * the supplier profile.
                                 */
                                console.log(
                                  "SUPPLIER SELECTED:",
                                  supplier
                                );
                              }}
                              style={{
                                background:
                                  "transparent",
                                border: "none",
                                padding: 0,
                                color:
                                  COLORS.primary,
                                cursor:
                                  "pointer",
                                fontWeight:
                                  "bold",
                                textAlign:
                                  "left"
                              }}
                            >
                              {
                                supplier.supplier_name
                              }
                            </button>
                          </td>

                          <td
                            style={{
                              padding: 8
                            }}
                          >
                            {
                              supplier.contact_name ||
                              "—"
                            }
                          </td>

                          <td
                            style={{
                              padding: 8
                            }}
                          >
                            {
                              supplier.phone ||
                              "—"
                            }
                          </td>

                          <td
                            style={{
                              padding: 8
                            }}
                          >
                            {
                              supplier.whatsapp ||
                              "—"
                            }
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* CREATE SUPPLIER */}
      {supplierView === "create" && (
        <div style={card}>
          <div style={{ maxWidth: 500 }}>
            <h3>
              {t("new_supplier")}
            </h3>

            <label>
              {t("supplier_name")} *
            </label>

            <input
              type="text"
              value={form.supplier_name}
              onChange={event =>
                updateField(
                  "supplier_name",
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%",
                marginBottom: 8
              }}
            />

            <label>
              {t("contact_name")}
            </label>

            <input
              type="text"
              value={form.contact_name}
              onChange={event =>
                updateField(
                  "contact_name",
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%",
                marginBottom: 8
              }}
            />

            <label>
              {t("phone")}
            </label>

            <input
              type="text"
              value={form.phone}
              onChange={event =>
                updateField(
                  "phone",
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%",
                marginBottom: 8
              }}
            />

            <label>
              {t("whatsapp")}
            </label>

            <input
              type="text"
              value={form.whatsapp}
              onChange={event =>
                updateField(
                  "whatsapp",
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%",
                marginBottom: 8
              }}
            />

            <label>
              {t("email")}
            </label>

            <input
              type="email"
              value={form.email}
              onChange={event =>
                updateField(
                  "email",
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%",
                marginBottom: 8
              }}
            />

            <label>
              {t("address")}
            </label>

            <input
              type="text"
              value={form.address}
              onChange={event =>
                updateField(
                  "address",
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%",
                marginBottom: 8
              }}
            />

            <label>
              {t("notes")}
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
              rows={4}
              style={{
                ...input,
                width: "100%",
                marginBottom: 12,
                resize: "vertical"
              }}
            />

            <button
              type="button"
              onClick={createSupplier}
              disabled={submitting}
              style={{
                ...btnPrimary,
                opacity:
                  submitting ? 0.6 : 1,
                cursor:
                  submitting
                    ? "default"
                    : "pointer"
              }}
            >
              {submitting
                ? t("loading")
                : t("save")}
            </button>

            <button
              type="button"
              onClick={returnToList}
              disabled={submitting}
              style={{
                ...btnSecondary,
                marginLeft: 8,
                opacity:
                  submitting ? 0.6 : 1
              }}
            >
              {t("cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


export default SupplierManagement;
