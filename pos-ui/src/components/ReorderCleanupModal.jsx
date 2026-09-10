import {
  useEffect,
  useMemo,
  useState
} from "react";

import apiClient from "../apiClient";
import { useLang } from "../LanguageContext";
import {
  COLORS,
  btnPrimary,
  btnSecondary
} from "../uiStyles";

const trackedStock = product =>
  product?.tracks_stock === 1 ||
  product?.tracks_stock === true ||
  product?.tracks_stock === "1" ||
  product?.tracks_stock === "true";

function ReorderCleanupModal({
  storeId,
  replenishedItems,
  onClose
}) {
  const { t } = useLang();

  const [candidates, setCandidates] =
    useState(null);
  const [selectedIds, setSelectedIds] =
    useState(() => new Set());
  const [loadError, setLoadError] =
    useState("");
  const [removeError, setRemoveError] =
    useState("");
  const [removing, setRemoving] =
    useState(false);

  const normalizedItems = useMemo(() => {
    const byProduct = new Map();

    for (const item of replenishedItems || []) {
      const productId = Number(
        item?.product_id
      );
      const quantity = Number(
        item?.quantity || 0
      );

      if (
        !Number.isInteger(productId) ||
        productId <= 0 ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        continue;
      }

      byProduct.set(
        productId,
        Number(
          byProduct.get(productId) || 0
        ) + quantity
      );
    }

    return Array.from(
      byProduct,
      ([product_id, quantity]) => ({
        product_id,
        quantity
      })
    );
  }, [replenishedItems]);

  useEffect(() => {
    let cancelled = false;

    const loadCandidates = async () => {
      if (
        !storeId ||
        normalizedItems.length === 0
      ) {
        onClose();
        return;
      }

      setCandidates(null);
      setLoadError("");
      setRemoveError("");

      try {
        const reorderResponse =
          await apiClient.get(
            "/reorder-items",
            {
              params: {
                store_id: storeId
              }
            }
          );

        if (cancelled) return;

        const reorderByProduct = new Map(
          (
            reorderResponse.data
              .reorder_items || []
          ).map(item => [
            Number(item.product_id),
            item
          ])
        );

        const matching = normalizedItems
          .filter(item =>
            reorderByProduct.has(
              item.product_id
            )
          )
          .map(item => {
            const reorderItem =
              reorderByProduct.get(
                item.product_id
              );
            const stock = Number(
              reorderItem.stock || 0
            );
            const threshold = Number(
              reorderItem
                .low_stock_threshold || 0
            );

            return {
              ...item,
              product_name:
                reorderItem.product_name,
              stock,
              threshold,
              still_low:
                trackedStock(reorderItem) &&
                stock <= threshold
            };
          });

        if (matching.length === 0) {
          onClose();
          return;
        }

        setCandidates(matching);
        setSelectedIds(
          new Set(
            matching.map(
              item => item.product_id
            )
          )
        );
      } catch (error) {
        if (cancelled) return;

        console.warn(
          "REORDER CLEANUP CHECK ERROR:",
          error
        );

        setLoadError(
          t("reorder_cleanup_check_failed")
        );
        setCandidates([]);
      }
    };

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [storeId, normalizedItems, onClose, t]);

  if (candidates === null) {
    return null;
  }

  const toggleProduct = productId => {
    setSelectedIds(current => {
      const next = new Set(current);

      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(
      new Set(
        candidates.map(
          item => item.product_id
        )
      )
    );
  };

  const clearAll = () => {
    setSelectedIds(new Set());
  };

  const removeSelected = async () => {
    if (
      removing ||
      selectedIds.size === 0
    ) {
      return;
    }

    setRemoving(true);
    setRemoveError("");

    const selectedCandidates =
      candidates.filter(item =>
        selectedIds.has(item.product_id)
      );

    const results = await Promise.allSettled(
      selectedCandidates.map(item =>
        apiClient.delete(
          `/reorder-items/${item.product_id}`
        )
      )
    );

    const failedIds = new Set();

    results.forEach((result, index) => {
      if (
        result.status === "rejected" &&
        result.reason?.response?.status !== 404
      ) {
        failedIds.add(
          selectedCandidates[index]
            .product_id
        );
      }
    });

    if (failedIds.size === 0) {
      setRemoving(false);
      onClose();
      return;
    }

    setCandidates(current =>
      current.filter(
        item =>
          !selectedIds.has(item.product_id) ||
          failedIds.has(item.product_id)
      )
    );
    setSelectedIds(failedIds);
    setRemoveError(
      t("reorder_cleanup_remove_failed")
    );
    setRemoving(false);
  };

  return (
    <div style={backdropStyle}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reorder-cleanup-title"
        style={modalStyle}
      >
        <h3
          id="reorder-cleanup-title"
          style={{ margin: 0 }}
        >
          {t("remove_replenished_from_reorder")}
        </h3>

        <p
          style={{
            color: COLORS.textDim,
            margin: "8px 0 12px"
          }}
        >
          {t("reorder_cleanup_help")}
        </p>

        {loadError ? (
          <div
            style={{
              color: COLORS.danger,
              marginBottom: 14
            }}
          >
            {loadError}
          </div>
        ) : (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 10
              }}
            >
              <button
                type="button"
                onClick={selectAll}
                disabled={removing}
                style={btnSecondary}
              >
                {t("select_all")}
              </button>

              <button
                type="button"
                onClick={clearAll}
                disabled={removing}
                style={btnSecondary}
              >
                {t("clear_all")}
              </button>
            </div>

            <div style={listStyle}>
              {candidates.map(item => (
                <label
                  key={item.product_id}
                  style={rowStyle}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(
                      item.product_id
                    )}
                    onChange={() =>
                      toggleProduct(
                        item.product_id
                      )
                    }
                    disabled={removing}
                    style={{
                      width: 18,
                      height: 18,
                      flex: "0 0 auto"
                    }}
                  />

                  <span style={{ flex: 1 }}>
                    <strong>
                      {item.product_name}
                    </strong>

                    <span style={detailsStyle}>
                      {t("replenished_quantity")}: +
                      {item.quantity}
                      {" · "}
                      {t("stock")}: {item.stock}
                      {" · LST: "}
                      {item.threshold}
                    </span>
                  </span>

                  {item.still_low && (
                    <strong style={warningStyle}>
                      {t("still_low")}
                    </strong>
                  )}
                </label>
              ))}
            </div>

            {removeError && (
              <div
                style={{
                  color: COLORS.danger,
                  marginTop: 10
                }}
              >
                {removeError}
              </div>
            )}
          </>
        )}

        <div style={actionsStyle}>
          {!loadError && (
            <button
              type="button"
              onClick={removeSelected}
              disabled={
                removing ||
                selectedIds.size === 0
              }
              style={{
                ...btnPrimary,
                opacity:
                  removing ||
                  selectedIds.size === 0
                    ? 0.55
                    : 1
              }}
            >
              {removing
                ? t("removing")
                : t("remove_selected")}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={removing}
            style={btnSecondary}
          >
            {loadError
              ? t("close")
              : t("keep_all")}
          </button>
        </div>
      </div>
    </div>
  );
}

const backdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1300,
  background: "rgba(0, 0, 0, 0.72)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16
};

const modalStyle = {
  width: "min(620px, 100%)",
  maxHeight: "min(82vh, 720px)",
  overflow: "auto",
  background: COLORS.panel,
  color: COLORS.text,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 14,
  padding: 18,
  boxShadow: "0 18px 60px rgba(0, 0, 0, 0.45)"
};

const listStyle = {
  display: "grid",
  gap: 8,
  maxHeight: "44vh",
  overflowY: "auto"
};

const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 9,
  background: COLORS.panelAlt,
  cursor: "pointer"
};

const detailsStyle = {
  display: "block",
  color: COLORS.textDim,
  fontSize: 12,
  marginTop: 4
};

const warningStyle = {
  color: "#facc15",
  fontSize: 12,
  whiteSpace: "nowrap"
};

const actionsStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  flexWrap: "wrap",
  marginTop: 16
};

export default ReorderCleanupModal;
