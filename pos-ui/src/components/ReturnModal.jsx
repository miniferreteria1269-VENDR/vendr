import { useMemo, useState } from "react";
import axios from "axios";

import { useLang } from "../LanguageContext";
import {
  COLORS,
  input,
  btnPrimary,
  btnSecondary
} from "../uiStyles";

const API = "https://vendr-onkr.onrender.com";

function ReturnModal({
  storeId,
  products = [],
  onClose,
  onSuccess
}) {
  const { t } = useLang();

  const [mode, setMode] = useState("refund");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] =
    useState(null);
  const [quantity, setQuantity] = useState(1);

  const [submitting, setSubmitting] =
    useState(false);

  const filteredProducts = useMemo(() => {
    const normalizedSearch =
      searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return [];
    }

    return products
      .filter(product =>
        String(product.name || "")
          .toLowerCase()
          .includes(normalizedSearch)
      )
      .slice(0, 50);
  }, [products, searchTerm]);

  const selectProduct = product => {
    const nextQuantity = 1;

    setSelectedProduct(product);
    setQuantity(nextQuantity);
    setSearchTerm("");

    setAmount(
      (
        Number(product.price || 0) *
        nextQuantity
      ).toFixed(2)
    );
  };

  const updateQuantity = value => {
    const nextQuantity = Math.max(
      Number(value) || 1,
      1
    );

    setQuantity(nextQuantity);

    if (selectedProduct) {
      setAmount(
        (
          Number(selectedProduct.price || 0) *
          nextQuantity
        ).toFixed(2)
      );
    }
  };

  const changeMode = nextMode => {
    setMode(nextMode);

    if (nextMode === "refund") {
      setSelectedProduct(null);
      setSearchTerm("");
      setQuantity(1);
    }
  };

  const submit = async () => {
    const numericAmount = Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      alert(t("enter_valid_amount"));
      return;
    }

    if (
      mode === "return" &&
      !selectedProduct
    ) {
      alert(t("select_product"));
      return;
    }

    if (
      mode === "return" &&
      (
        !Number.isFinite(Number(quantity)) ||
        Number(quantity) <= 0
      )
    ) {
      alert(t("enter_valid_quantity"));
      return;
    }

    const items =
      mode === "return"
        ? [
            {
              product_id:
                selectedProduct.product_id,
              quantity: Number(quantity),
              cost: Number(
                selectedProduct.cost || 0
              ),
              price: Number(
                selectedProduct.price || 0
              )
            }
          ]
        : [];

    setSubmitting(true);

    try {
      const response = await axios.post(
        `${API}/returns`,
        {
          store_id: storeId,
          amount: numericAmount,
          items,
          note
        }
      );

      if (
        response.data.status !== "accepted" &&
        response.data.status !== "ok"
      ) {
        throw new Error(
          `Unexpected return status: ${response.data.status}`
        );
      }

      await onSuccess?.();
      onClose();
    } catch (error) {
      console.error(
        "RETURN/REFUND ERROR:",
        error
      );

      alert(t("failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        {/* HEADER */}
        <div style={headerStyle}>
          <div>
            <div style={titleStyle}>
              {t("return_refund")}
            </div>

            <div style={subtitleStyle}>
              {mode === "return"
                ? t("return")
                : t("refund")}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={closeButtonStyle}
            aria-label={t("cancel")}
          >
            ×
          </button>
        </div>

        {/* MODE SWITCH */}
        <div style={modeSwitchStyle}>
          <button
            type="button"
            onClick={() =>
              changeMode("refund")
            }
            style={{
              ...modeButtonStyle,
              ...(mode === "refund"
                ? activeModeButtonStyle
                : {})
            }}
          >
            {t("refund")}
          </button>

          <button
            type="button"
            onClick={() =>
              changeMode("return")
            }
            style={{
              ...modeButtonStyle,
              ...(mode === "return"
                ? activeModeButtonStyle
                : {})
            }}
          >
            {t("return")}
          </button>
        </div>

        {/* RETURN PRODUCT SEARCH */}
        {mode === "return" && (
          <div style={sectionStyle}>
            <label style={labelStyle}>
              {t("select_product")}
            </label>

            {!selectedProduct ? (
              <>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={event =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                  placeholder={
                    t("search_products")
                  }
                  autoFocus
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: 42
                  }}
                />

                {searchTerm.trim() && (
                  <div style={resultsStyle}>
                    {filteredProducts.length >
                    0 ? (
                      filteredProducts.map(
                        product => (
                          <button
                            key={
                              product.product_id
                            }
                            type="button"
                            onClick={() =>
                              selectProduct(
                                product
                              )
                            }
                            style={
                              productResultStyle
                            }
                          >
                            <div
                              style={{
                                minWidth: 0
                              }}
                            >
                              <div
                                style={
                                  productNameStyle
                                }
                              >
                                {product.name}
                              </div>

                              <div
                                style={
                                  productMetaStyle
                                }
                              >
                                {t("stock")}:{" "}
                                {Number(
                                  product.stock || 0
                                )}
                              </div>
                            </div>

                            <div
                              style={
                                productPriceStyle
                              }
                            >
                              $
                              {Number(
                                product.price || 0
                              ).toFixed(2)}
                            </div>
                          </button>
                        )
                      )
                    ) : (
                      <div style={emptyResultStyle}>
                        {t("no_products_found")}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={selectedProductStyle}>
                <div style={{ minWidth: 0 }}>
                  <div style={productNameStyle}>
                    {selectedProduct.name}
                  </div>

                  <div style={productMetaStyle}>
                    {t("stock")}:{" "}
                    {Number(
                      selectedProduct.stock || 0
                    )}
                    {" · "}
                    {t("price")}: $
                    {Number(
                      selectedProduct.price || 0
                    ).toFixed(2)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(null);
                    setSearchTerm("");
                    setQuantity(1);
                    setAmount("");
                  }}
                  style={changeProductButtonStyle}
                >
                  {t("change")}
                </button>
              </div>
            )}

            {selectedProduct && (
              <div style={fieldStyle}>
                <label style={labelStyle}>
                  {t("quantity")}
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={event =>
                    updateQuantity(
                      event.target.value
                    )
                  }
                  style={{
                    ...input,
                    width: "100%",
                    boxSizing: "border-box",
                    minHeight: 42
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* AMOUNT */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            {t("amount")}
          </label>

          <div style={amountWrapperStyle}>
            <span style={currencyStyle}>
              $
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={event =>
                setAmount(event.target.value)
              }
              placeholder="0.00"
              style={amountInputStyle}
            />
          </div>
        </div>

        {/* NOTE */}
        <div style={fieldStyle}>
          <label style={labelStyle}>
            {t("note")}
          </label>

          <textarea
            value={note}
            onChange={event =>
              setNote(event.target.value)
            }
            placeholder={t("note")}
            rows={3}
            style={{
              ...input,
              width: "100%",
              boxSizing: "border-box",
              resize: "vertical",
              fontFamily: "inherit"
            }}
          />
        </div>

        {/* ACTIONS */}
        <div style={actionsStyle}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              ...btnSecondary,
              minHeight: 42,
              opacity: submitting ? 0.6 : 1
            }}
          >
            {t("cancel")}
          </button>

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            style={{
              ...btnPrimary,
              minHeight: 42,
              minWidth: 120,
              opacity: submitting ? 0.6 : 1
            }}
          >
            {submitting
              ? t("loading")
              : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0, 0, 0, 0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
  boxSizing: "border-box"
};

const modalStyle = {
  width: "100%",
  maxWidth: 520,
  maxHeight: "90dvh",
  overflowY: "auto",
  background: COLORS.panel,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 16,
  padding: 20,
  boxSizing: "border-box",
  boxShadow:
    "0 24px 70px rgba(0, 0, 0, 0.55)"
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 18
};

const titleStyle = {
  fontSize: 22,
  fontWeight: 750
};

const subtitleStyle = {
  color: COLORS.textDim,
  fontSize: 13,
  marginTop: 3
};

const closeButtonStyle = {
  width: 36,
  height: 36,
  border: "none",
  borderRadius: 8,
  background: COLORS.panelAlt,
  color: COLORS.text,
  fontSize: 24,
  lineHeight: 1,
  cursor: "pointer"
};

const modeSwitchStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
  background: COLORS.bg,
  padding: 5,
  borderRadius: 10,
  marginBottom: 18
};

const modeButtonStyle = {
  border: "none",
  borderRadius: 8,
  padding: "10px 12px",
  background: "transparent",
  color: COLORS.textDim,
  cursor: "pointer",
  fontWeight: 650
};

const activeModeButtonStyle = {
  background: COLORS.primary,
  color: "white"
};

const sectionStyle = {
  marginBottom: 16
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 14
};

const labelStyle = {
  color: COLORS.textDim,
  fontSize: 13,
  fontWeight: 650
};

const resultsStyle = {
  maxHeight: 250,
  overflowY: "auto",
  marginTop: 6,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  background: COLORS.bg
};

const productResultStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "11px 12px",
  border: "none",
  borderBottom:
    `1px solid ${COLORS.border}`,
  background: "transparent",
  color: COLORS.text,
  textAlign: "left",
  cursor: "pointer"
};

const productNameStyle = {
  fontWeight: 650,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap"
};

const productMetaStyle = {
  color: COLORS.textDim,
  fontSize: 12,
  marginTop: 3
};

const productPriceStyle = {
  color: COLORS.primary,
  fontWeight: 750,
  whiteSpace: "nowrap"
};

const emptyResultStyle = {
  padding: 16,
  textAlign: "center",
  color: COLORS.textDim
};

const selectedProductStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: 12,
  background: COLORS.panelAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10
};

const changeProductButtonStyle = {
  border: "none",
  background: "transparent",
  color: COLORS.primary,
  cursor: "pointer",
  fontWeight: 650
};

const amountWrapperStyle = {
  display: "flex",
  alignItems: "center",
  background: COLORS.panelAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  minHeight: 44
};

const currencyStyle = {
  color: COLORS.textDim,
  paddingLeft: 12,
  fontWeight: 700
};

const amountInputStyle = {
  flex: 1,
  minWidth: 0,
  border: "none",
  outline: "none",
  background: "transparent",
  color: COLORS.text,
  padding: "10px 12px 10px 5px",
  fontSize: 18,
  fontWeight: 700
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 22
};

export default ReturnModal;
