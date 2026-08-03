import {
  useEffect,
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
  primary: "#3aa0ff"
};

function ProductPanel({
  products,
  searchTerm,
  setSearchTerm,
  addItem,
  storeId
}) {
  const { t } = useLang();

  const [quickItems, setQuickItems] =
    useState([]);

  // ---------------------------------------------
  // LOAD QUICK ITEMS
  // ---------------------------------------------
  const fetchQuickItems = async () => {
    if (!storeId) {
      setQuickItems([]);
      return;
    }

    try {
      const response =
        await apiClient.get(
          "/quick-items",
          {
            params: {
              store_id: storeId
            }
          }
        );

      setQuickItems(
        response.data.products || []
      );
    } catch (error) {
      console.error(
        "Failed to fetch quick items:",
        error
      );

      setQuickItems([]);
    }
  };

  useEffect(() => {
    fetchQuickItems();
  }, [storeId]);

  // ---------------------------------------------
  // DISPLAY PRODUCTS
  // ---------------------------------------------
  const displayProducts =
    searchTerm.trim() === ""
      ? quickItems
      : products;

  return (
    <div
      style={{
        width: "34%",
        minWidth: 240,
        flexShrink: 0,
        boxSizing: "border-box",

        background: COLORS.panel,
        borderRadius: 14,
        padding: 16,

        display: "flex",
        flexDirection: "column",

        color: COLORS.text
      }}
    >
      {/* SEARCH */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 12
        }}
      >
        <input
          type="text"
          placeholder={t("search_products")}
          value={searchTerm}
          onChange={event =>
            setSearchTerm(
              event.target.value
            )
          }
          style={{
            flex: 1,
            minWidth: 0,
            padding: 10,

            borderRadius: 8,
            border:
              `1px solid ${COLORS.border}`,

            background:
              COLORS.panelAlt,

            color:
              COLORS.text,

            boxSizing:
              "border-box"
          }}
        />

        {searchTerm.trim() !== "" && (
          <button
            type="button"
            onClick={() =>
              setSearchTerm("")
            }
            aria-label={
              t("clear_product_search")
            }
            title={
              t("clear_product_search")
            }
            style={{
              width: 42,
              minWidth: 42,

              border: "none",
              borderRadius: 8,

              background:
                COLORS.panelAlt,

              color:
                COLORS.text,

              fontSize: 18,
              fontWeight: "bold",

              cursor: "pointer",
              touchAction:
                "manipulation"
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* QUICK ITEMS LABEL */}
      {searchTerm.trim() === "" && (
        <div
          style={{
            marginBottom: 8,
            color: COLORS.textDim,
            fontSize: 13
          }}
        >
          {t("quick_items")}
        </div>
      )}

      {/* PRODUCT LIST */}
      <div
        style={{
          flex: 1,
          minHeight: 0,

          overflowY: "auto",

          display: "flex",
          flexDirection: "column",
          gap: 8
        }}
      >
        {displayProducts.map(
          product => (
            <div
              key={
                product.product_id
              }
              onClick={() =>
                addItem(product)
              }
              style={{
                background:
                  COLORS.panelAlt,

                borderRadius: 10,
                padding: 10,

                cursor: "pointer",

                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: 12,

                transition: "0.15s",

                border:
                  "1px solid transparent"
              }}
              onMouseEnter={event => {
                event.currentTarget
                  .style.border =
                    `1px solid ${COLORS.primary}`;
              }}
              onMouseLeave={event => {
                event.currentTarget
                  .style.border =
                    "1px solid transparent";
              }}
            >
              {/* LEFT SIDE */}
              <div
                style={{
                  minWidth: 0,
                  flex: 1
                }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow:
                      "ellipsis"
                  }}
                >
                  {product.name}
                </div>

                <div
                  style={{
                    marginTop: 3,

                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",

                    fontSize: 12,
                    color:
                      COLORS.textDim
                  }}
                >
                  {product.tracks_stock ===
                    1 ||
                  product.tracks_stock ===
                    true ? (
                    <span>
                      {t("stock")}:{" "}
                      {Number(
                        product.stock || 0
                      )}
                    </span>
                  ) : (
                    <span>
                      {t(
                        "stock_not_tracked"
                      )}
                    </span>
                  )}

                  {product.location_code && (
                    <span
                      style={{
                        color:
                          COLORS.primary,
                        fontWeight: 600,
                        whiteSpace:
                          "nowrap"
                      }}
                    >
                      {t("location")}:{" "}
                      {
                        product.location_code
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* RIGHT SIDE */}
              <div
                style={{
                  flex: "0 0 auto",

                  fontWeight: "bold",
                  color:
                    COLORS.primary,

                  whiteSpace: "nowrap"
                }}
              >
                $
                {Number(
                  product.price || 0
                ).toFixed(2)}
              </div>
            </div>
          )
        )}

        {displayProducts.length === 0 && (
          <div
            style={{
              padding: 12,
              textAlign: "center",
              color: COLORS.textDim
            }}
          >
            {searchTerm.trim()
              ? t(
                  "no_products_found"
                )
              : t(
                  "no_quick_items"
                )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductPanel;
