import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";
import ProductMovementSummary from "./ProductMovementSummary";
import { StockAdjustment } from "./ProductManagement";
import apiClient from "../apiClient";
import {
  exportInventoryToExcel
} from "../utils/excelExport";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  btnDanger,
  input,
} from "../uiStyles";

function InventoryReport({
  storeId,
  priorityLowStockCount = 0,
  onPriorityLowStockChanged,
}) {
  const { t } = useLang();

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryView, setInventoryView] = useState("stock");

  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockView, setLowStockView] = useState("lowstock");
  const [showZeroStockOnly, setShowZeroStockOnly] = useState(false);
  const [reorderItems, setReorderItems] = useState([]);
  const [reorderFilter, setReorderFilter] = useState("master");
  const [reorderPriorityFilter, setReorderPriorityFilter] = useState("all");
  const [reorderSupplierId, setReorderSupplierId] = useState("");
  const [activeReorderProduct, setActiveReorderProduct] = useState(null);
  const [adjustmentProduct, setAdjustmentProduct] = useState(null);
  const [thresholdProduct, setThresholdProduct] = useState(null);
  const [thresholdValue, setThresholdValue] = useState("");
  const [thresholdSaving, setThresholdSaving] = useState(false);
  const [thresholdError, setThresholdError] = useState("");
  const [assignedProductSuppliers, setAssignedProductSuppliers] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [reorderForm, setReorderForm] = useState({
    supplier_id: "",
    quantity: 1,
    purchase_priority: false,
  });
  const [reorderLoading, setReorderLoading] = useState(false);
  const [reorderSaving, setReorderSaving] = useState(false);
  const [reorderError, setReorderError] = useState("");
  const [reorderProductPickerOpen, setReorderProductPickerOpen] =
    useState(false);
  const [reorderProductSearch, setReorderProductSearch] =
    useState("");
  const [reorderProductOptions, setReorderProductOptions] =
    useState([]);
  const [reorderProductOptionsLoading, setReorderProductOptionsLoading] =
    useState(false);
  const [reorderProductOptionsError, setReorderProductOptionsError] =
    useState("");
  const [paretoItems, setParetoItems] = useState([]);
  const [deadStockItems, setDeadStockItems] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);

  const [serviceStartDate, setServiceStartDate] = useState("");
  const [serviceEndDate, setServiceEndDate] = useState("");
  const [deadStockDays, setDeadStockDays] = useState(90);
  const [paretoMode, setParetoMode] = useState("investment");
  const [totals, setTotals] = useState({
    cost: 0,
    price: 0,
  });

  const formatMoney = (value) => Number(value || 0).toFixed(2);

  const translatedText = (key, fallback) => {
    const translated = t(key);

    return translated && translated !== key
      ? translated
      : fallback;
  };

  const loadInventory = async () => {
    const res = await apiClient.get(
      "/stock-report",
      {
        params: {
          store_id: storeId,
          name:
            searchTerm ||
            undefined
        }
      }
    );

    const sorted = (
      res.data.products || []
    ).sort((a, b) =>
      a.name.localeCompare(
        b.name,
        undefined,
        {
          sensitivity: "base"
        }
      )
    );

    setProducts(sorted);

    setTotals({
      cost:
        res.data
          .total_inventory_cost || 0,

      price:
        res.data
          .total_inventory_price || 0
    });
  };

  const loadLowStock = async () => {
    const res = await apiClient.get(
      "/low-stock",
      {
        params: {
          store_id: storeId,
        },
      }
    );

    setLowStockItems(res.data.low_stock || []);

    onPriorityLowStockChanged?.(
      Number(res.data.priority_count || 0)
    );
  };

  const loadReorderItems = async () => {
    const res = await apiClient.get(
      "/reorder-items",
      {
        params: {
          store_id: storeId,
        },
      }
    );

    setReorderItems(res.data.reorder_items || []);
  };

  const loadAllSuppliers = async () => {
    const res = await apiClient.get("/suppliers");

    const sortedSuppliers = [
      ...(res.data.suppliers || []),
    ].sort((a, b) =>
      String(a.supplier_name || "").localeCompare(
        String(b.supplier_name || ""),
        undefined,
        { sensitivity: "base" }
      )
    );

    setAllSuppliers(sortedSuppliers);
  };

  const openReorderProductPicker = async () => {
    setReorderProductPickerOpen(true);
    setReorderProductSearch("");
    setReorderProductOptionsError("");
    setReorderProductOptionsLoading(true);

    try {
      const response = await apiClient.get(
        "/products",
        {
          params: {
            store_id: storeId,
          },
        }
      );

      const loadedProducts = [
        ...(response.data.products || []),
      ]
        .filter(
          (product) =>
            Number(product.tracks_stock) === 1
        )
        .sort((a, b) =>
          String(a.name || "").localeCompare(
            String(b.name || ""),
            undefined,
            { sensitivity: "base" }
          )
        );

      setReorderProductOptions(loadedProducts);
    } catch (error) {
      console.error(
        "LOAD REORDER PRODUCT OPTIONS ERROR:",
        error
      );

      setReorderProductOptions([]);
      setReorderProductOptionsError(
        error.response?.data?.detail ||
          "Unable to load products."
      );
    } finally {
      setReorderProductOptionsLoading(false);
    }
  };

  const closeReorderProductPicker = () => {
    setReorderProductPickerOpen(false);
    setReorderProductSearch("");
    setReorderProductOptionsError("");
  };

  const selectReorderProduct = (product) => {
    closeReorderProductPicker();

    openReorderModal({
      ...product,
      threshold: product.low_stock_threshold,
    });
  };

  const loadPareto = async () => {
    const res = await apiClient.get(
      "/inventory-pareto",
      {
        params: {
          store_id: storeId,
        },
      }
    );

    setParetoItems(res.data.products || []);
  };

  const loadDeadStock = async () => {
    const res = await apiClient.get(
      "/dead-stock",
      {
        params: {
          store_id: storeId,
          days: deadStockDays,
        },
      }
    );

    setDeadStockItems(res.data.products || []);
  };

  const loadServices = async () => {
    const res = await apiClient.get(
      "/service-report",
      {
        params: {
          store_id: storeId,
          start_date: serviceStartDate || undefined,
          end_date: serviceEndDate || undefined,
        },
      }
    );

    setServiceItems(res.data.services || []);
  };

  useEffect(() => {
    loadInventory();
  }, []);

  useEffect(() => {
    if (inventoryView !== "stock") return;

    const delay = setTimeout(loadInventory, 300);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  useEffect(() => {
    if (inventoryView === "services") {
      loadServices();
    }
  }, [serviceStartDate, serviceEndDate]);

  useEffect(() => {
    if (inventoryView === "lowstock") {
      loadLowStock();
      loadReorderItems();
      loadAllSuppliers();
    }

    if (inventoryView === "pareto") {
      loadPareto();
    }

    if (inventoryView === "services") {
      loadServices();
    }

    if (inventoryView === "deadstock") {
      loadDeadStock();
    }
  }, [inventoryView]);

  useEffect(() => {
    if (inventoryView === "deadstock") {
      loadDeadStock();
    }
  }, [deadStockDays]);

  const serviceTotals = {
    cost: serviceItems.reduce(
      (sum, service) => sum + (service.cost || 0),
      0
    ),
    revenue: serviceItems.reduce(
      (sum, service) => sum + (service.revenue || 0),
      0
    ),
    profit: serviceItems.reduce(
      (sum, service) => sum + (service.profit || 0),
      0
    ),
  };

  const filteredProducts = products.filter(
    (product) =>
      product.quantity !== null &&
      product.quantity !== undefined
  );

  const filteredLowStock = lowStockItems.filter(
    (item) =>
      item.stock !== null &&
      item.stock !== undefined &&
      item.threshold !== null
  );

  const visibleLowStock = showZeroStockOnly
    ? filteredLowStock.filter(
        (item) => Number(item.stock) === 0
      )
    : filteredLowStock;

  const normalizedReorderProductSearch =
    reorderProductSearch.trim().toLowerCase();

  const visibleReorderProductOptions =
    reorderProductOptions.filter((product) =>
      normalizedReorderProductSearch === ""
        ? true
        : String(product.name || "")
            .toLowerCase()
            .includes(normalizedReorderProductSearch)
    );

  const filteredServices = serviceItems.filter(
    (service) => service.instances !== undefined
  );

  const exportVisibleInventory = () => {
    if (filteredProducts.length === 0) return;

    exportInventoryToExcel({
      products: filteredProducts,
      totals,
      storeId,
      labels: {
        product: translatedText("product", "Product"),
        quantity: translatedText("quantity", "Quantity"),
        cost: translatedText("cost", "Cost"),
        price: translatedText("price", "Price"),
        totalCost: translatedText("total_cost", "Total Cost"),
        totalValue: translatedText("total_value", "Total Value"),
        profit: translatedText("profit", "Profit"),
        total: translatedText("total", "Total"),
        inventorySheet: translatedText("inventory", "Inventory")
      }
    });
  };

  const sortedPareto = [...paretoItems].sort((a, b) => {
    const getValue = (product) =>
      paretoMode === "investment"
        ? product.investment || 0
        : paretoMode === "sales"
        ? product.revenue || 0
        : product.profit || 0;

    return getValue(b) - getValue(a);
  });

  const topCount = Math.ceil(sortedPareto.length * 0.2);

  const reorderSupplierOptions = Array.from(
    new Map(
      reorderItems
        .filter((item) => item.supplier_id != null)
        .map((item) => [
          String(item.supplier_id),
          {
            supplier_id: item.supplier_id,
            supplier_name: item.supplier_name,
          },
        ])
    ).values()
  ).sort((a, b) =>
    String(a.supplier_name || "").localeCompare(
      String(b.supplier_name || ""),
      undefined,
      { sensitivity: "base" }
    )
  );

  const supplierFilteredReorderItems = reorderItems.filter((item) => {
    if (reorderFilter === "unassigned") {
      return item.supplier_id == null;
    }

    if (reorderFilter === "supplier") {
      return (
        reorderSupplierId !== "" &&
        String(item.supplier_id) === String(reorderSupplierId)
      );
    }

    return true;
  });

  const visibleReorderItems = supplierFilteredReorderItems
    .filter((item) => {
      if (reorderPriorityFilter === "priority") {
        return item.purchase_priority === true;
      }

      if (reorderPriorityFilter === "regular") {
        return item.purchase_priority !== true;
      }

      return true;
    })
    .sort((a, b) =>
      Number(b.purchase_priority === true) -
      Number(a.purchase_priority === true)
    );

  const visibleProjectedTotal = visibleReorderItems.reduce(
    (sum, item) =>
      sum + Number(item.projected_cost || 0),
    0
  );

  const visiblePriorityProjectedTotal = visibleReorderItems.reduce(
    (sum, item) =>
      item.purchase_priority
        ? sum + Number(item.projected_cost || 0)
        : sum,
    0
  );

  const visiblePriorityCount = visibleReorderItems.filter(
    (item) => item.purchase_priority === true
  ).length;

  const visibleUnknownCostCount = visibleReorderItems.filter(
    (item) => item.estimated_unit_cost == null
  ).length;

  const currentSupplierFilter = reorderSupplierOptions.find(
    (supplier) =>
      String(supplier.supplier_id) ===
      String(reorderSupplierId)
  );

  const reorderModalSupplierChoices =
    assignedProductSuppliers.length > 0
      ? assignedProductSuppliers
      : allSuppliers;

  const selectedReorderModalSupplier =
    reorderModalSupplierChoices.find(
      (supplier) =>
        String(supplier.supplier_id) ===
        String(reorderForm.supplier_id)
    );

  const openReorderModal = async (product) => {
    const existingItem = reorderItems.find(
      (item) => item.product_id === product.product_id
    );

    const normalizedProduct = {
      product_id: product.product_id,
      name: product.name || product.product_name,
      stock: product.stock,
      threshold: product.threshold,
    };

    setActiveReorderProduct(normalizedProduct);
    setAssignedProductSuppliers([]);
    setReorderError("");
    setReorderLoading(true);
    setReorderForm({
      supplier_id:
        existingItem?.supplier_id != null
          ? String(existingItem.supplier_id)
          : "",
      quantity:
        existingItem?.quantity ||
        Math.max(
          Number(product.threshold || 0) -
            Number(product.stock || 0),
          1
        ),
      purchase_priority:
        existingItem?.purchase_priority === true,
    });

    try {
      const response = await apiClient.get(
        `/products/${product.product_id}/suppliers`
      );

      const assigned = response.data.suppliers || [];
      setAssignedProductSuppliers(assigned);

      if (!existingItem) {
        const preferred = assigned.find(
          (supplier) => supplier.is_preferred
        );

        if (preferred) {
          setReorderForm((previous) => ({
            ...previous,
            supplier_id: String(preferred.supplier_id),
          }));
        }
      }
    } catch (error) {
      console.error(
        "LOAD PRODUCT SUPPLIERS ERROR:",
        error
      );

      setReorderError(
        error.response?.data?.detail ||
          "Unable to load product suppliers."
      );
    } finally {
      setReorderLoading(false);
    }
  };

  const handleLowStockAdjustment = async ({
    product_id,
    new_stock,
  }) => {
    setLowStockItems((previous) =>
      previous
        .map((item) =>
          item.product_id === product_id
            ? { ...item, stock: new_stock }
            : item
        )
        .filter(
          (item) =>
            Number(item.stock) <=
            Number(item.threshold)
        )
    );

    if (navigator.onLine) {
      await loadLowStock();
    }
  };

  const openThresholdModal = (product) => {
    setThresholdProduct(product);
    setThresholdValue(String(product.threshold ?? 0));
    setThresholdError("");
  };

  const closeThresholdModal = () => {
    if (thresholdSaving) return;

    setThresholdProduct(null);
    setThresholdValue("");
    setThresholdError("");
  };

  const saveLowStockThreshold = async () => {
    const numericThreshold = Number(thresholdValue);

    if (
      !thresholdProduct ||
      !Number.isInteger(numericThreshold) ||
      numericThreshold < 0
    ) {
      setThresholdError(
        t("invalid_low_stock_threshold")
      );
      return;
    }

    if (
      numericThreshold ===
      Number(thresholdProduct.threshold || 0)
    ) {
      setThresholdError(t("same_low_stock_threshold"));
      return;
    }

    setThresholdSaving(true);
    setThresholdError("");

    try {
      await apiClient.post(
        "/edit-product",
        null,
        {
          params: {
            store_id: storeId,
            product_id: thresholdProduct.product_id,
            name: thresholdProduct.name,
            low_stock_threshold: numericThreshold,
            tracks_stock: true,
          },
        }
      );

      await loadLowStock();
      setThresholdProduct(null);
      setThresholdValue("");
      alert(t("low_stock_threshold_updated"));
    } catch (error) {
      setThresholdError(
        error.response?.data?.detail ||
          t("low_stock_threshold_update_failed")
      );
    } finally {
      setThresholdSaving(false);
    }
  };

  const closeReorderModal = () => {
    if (reorderSaving) return;

    setActiveReorderProduct(null);
    setAssignedProductSuppliers([]);
    setReorderError("");
  };

  const saveReorderItem = async () => {
    if (!activeReorderProduct || reorderSaving) return;

    const quantity = Number(reorderForm.quantity);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setReorderError(
        "Reorder quantity must be a positive whole number."
      );
      return;
    }

    setReorderSaving(true);
    setReorderError("");

    try {
      await apiClient.post(
        `/reorder-items/${activeReorderProduct.product_id}`,
        {
          quantity,
          supplier_id:
            reorderForm.supplier_id === ""
              ? null
              : Number(reorderForm.supplier_id),
          purchase_priority:
            reorderForm.purchase_priority === true,
        }
      );

      await loadReorderItems();
      setActiveReorderProduct(null);
      setAssignedProductSuppliers([]);
    } catch (error) {
      console.error("SAVE REORDER ITEM ERROR:", error);

      setReorderError(
        error.response?.data?.detail ||
          "Unable to save reorder item."
      );
    } finally {
      setReorderSaving(false);
    }
  };

  const removeReorderItem = async (item) => {
    if (
      !window.confirm(
        `Remove ${item.product_name} from the reorder list?`
      )
    ) {
      return;
    }

    try {
      await apiClient.delete(
        `/reorder-items/${item.product_id}`
      );

      await loadReorderItems();
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Unable to remove reorder item."
      );
    }
  };

  const clearCurrentReorderView = async () => {
    if (visibleReorderItems.length === 0) return;

    let scope = "all";
    let supplierId;
    let confirmation;

    if (reorderFilter === "supplier") {
      scope = "supplier";
      supplierId = Number(reorderSupplierId);
      confirmation =
        `Remove all ${visibleReorderItems.length} products from ` +
        `${currentSupplierFilter?.supplier_name || "this supplier"}'s reorder list?\n\n` +
        "They will also be removed from the master reorder list.";
    } else if (reorderFilter === "unassigned") {
      scope = "unassigned";
      confirmation =
        `Remove all ${visibleReorderItems.length} unassigned products?\n\n` +
        "They will also be removed from the master reorder list.";
    } else {
      confirmation =
        `Clear all ${visibleReorderItems.length} products from every reorder list?\n\n` +
        "This cannot be undone.";
    }

    if (!window.confirm(confirmation)) return;

    try {
      await apiClient.delete("/reorder-items", {
        params: {
          scope,
          supplier_id: supplierId,
        },
      });

      await loadReorderItems();

      if (scope === "supplier") {
        setReorderSupplierId("");
      }
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Unable to clear reorder list."
      );
    }
  };

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0,
      }}
    >
      

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {[
          "stock",
          "movement",
          "adjustment",
          "pareto",
          "lowstock",
          "services",
          "deadstock",
        ].map((view) => (
          <button
            key={view}
            onClick={() => setInventoryView(view)}
            style={
              inventoryView === view
                ? btnPrimary
                : btnSecondary
            }
          >
            {view === "lowstock" &&
              priorityLowStockCount > 0 && (
                <span
                  aria-hidden="true"
                  title={t("priority_low_stock_alert")}
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    marginRight: 6,
                    borderRadius: "50%",
                    background: "#ff8c42",
                    boxShadow: "0 0 6px #ff8c42",
                  }}
                />
              )}

            {t(view).toUpperCase()}
          </button>
        ))}
      </div>

      {inventoryView === "stock" && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          <input
            placeholder={t("search_inventory")}
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            style={{
              ...input,
              width: 300,
              maxWidth: "100%"
            }}
          />

          <button
            type="button"
            onClick={exportVisibleInventory}
            disabled={filteredProducts.length === 0}
            title={translatedText(
              "export_excel",
              "Export the visible inventory to Excel"
            )}
            style={{
              ...btnSecondary,
              opacity:
                filteredProducts.length === 0
                  ? 0.55
                  : 1,
              cursor:
                filteredProducts.length === 0
                  ? "not-allowed"
                  : "pointer"
            }}
          >
            ↓ Excel (.xlsx)
          </button>
        </div>
      )}

      {/* STOCK */}
      {inventoryView === "stock" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 30,
              marginBottom: 16,
              fontWeight: "bold",
              flexWrap: "wrap",
            }}
          >
            <div>
              {t("cost")}: ${formatMoney(totals.cost)}
            </div>

            <div>
              {t("value")}: ${formatMoney(totals.price)}
            </div>

            <div style={{ color: COLORS.primary }}>
              {t("profit")}: $
              {formatMoney(totals.price - totals.cost)}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              minHeight: 0,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Cost</th>
                  <th>Price</th>
                  <th>Total Cost</th>
                  <th>Total Value</th>
                  <th>Profit</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product, index) => {
                  const totalCost =
                    product.investment || 0;

                  const totalValue =
                    (product.price || 0) *
                    (product.quantity || 0);

                  const profit =
                    totalValue - totalCost;

                  return (
                    <tr
                      key={index}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>
                        ${formatMoney(product.cost)}
                      </td>
                      <td>
                        ${formatMoney(product.price)}
                      </td>
                      <td>
                        ${formatMoney(totalCost)}
                      </td>
                      <td>
                        ${formatMoney(totalValue)}
                      </td>
                      <td
                        style={{
                          color:
                            profit >= 0
                              ? COLORS.primary
                              : COLORS.danger,
                        }}
                      >
                        ${formatMoney(profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MOVEMENT */}
      {inventoryView === "movement" && (
        <ProductMovementSummary storeId={storeId} />
      )}

      {/* ADJUSTMENT */}
      {inventoryView === "adjustment" && (
        <StockAdjustment storeId={storeId} />
      )}

      {/* LOW STOCK */}
      {inventoryView === "lowstock" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setLowStockView("lowstock")}
              style={
                lowStockView === "lowstock"
                  ? btnPrimary
                  : btnSecondary
              }
            >
              {t("lowstock")}
            </button>

            <button
              type="button"
              onClick={() => {
                setLowStockView("reorder");
                loadReorderItems();
              }}
              style={
                lowStockView === "reorder"
                  ? btnPrimary
                  : btnSecondary
              }
            >
              {t("reorder_list")}
            </button>
          </div>

          {lowStockView === "lowstock" && (
            <>
              <h3 style={{ marginTop: 0 }}>
                {t("lowstock")}
              </h3>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    ...card,
                    padding: "10px 14px",
                    minWidth: 180,
                  }}
                >
                  <div
                    style={{
                      color: COLORS.textDim,
                      fontSize: 12,
                    }}
                  >
                    {t("low_stock_products_count")}
                  </div>
                  <div
                    style={{
                      color: COLORS.primary,
                      fontSize: 22,
                      fontWeight: "bold",
                    }}
                  >
                    {visibleLowStock.length}
                  </div>
                </div>

                <button
                  type="button"
                  aria-pressed={showZeroStockOnly}
                  onClick={() =>
                    setShowZeroStockOnly(
                      (previous) => !previous
                    )
                  }
                  style={{
                    ...(showZeroStockOnly
                      ? btnPrimary
                      : btnSecondary),
                  }}
                >
                  {t("stock_zero")}
                </button>
              </div>

              {priorityLowStockCount > 0 && (
                <div
                  style={{
                    background: COLORS.panelAlt,
                    border: "1px solid #ff8c42",
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 12,
                    color: COLORS.textDim,
                    fontSize: 13,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      display: "inline-block",
                      width: 8,
                      height: 8,
                      marginRight: 7,
                      borderRadius: "50%",
                      background: "#ff8c42",
                      boxShadow: "0 0 6px #ff8c42",
                    }}
                  />
                  {t("priority_low_stock_explanation")}
                </div>
              )}

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  minHeight: 0,
                }}
              >
                {visibleLowStock.length === 0 && (
                  <div style={{ color: COLORS.textDim }}>
                    {showZeroStockOnly
                      ? t("no_zero_stock_products")
                      : t("no_issues")}
                  </div>
                )}

                {visibleLowStock.map((item) => {
                  const existingReorderItem = reorderItems.find(
                    (reorderItem) =>
                      reorderItem.product_id === item.product_id
                  );

                  return (
                    <div
                      key={item.product_id}
                      style={{
                        padding: 10,
                        borderBottom: `1px solid ${COLORS.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            flexWrap: "wrap",
                          }}
                        >
                          <b>{item.name}</b>

                          {item.is_priority && (
                            <span
                              title={t(
                                "priority_low_stock_explanation"
                              )}
                              style={{
                                border: "1px solid #ff8c42",
                                borderRadius: 999,
                                padding: "2px 7px",
                                color: "#ffad73",
                                fontSize: 11,
                                fontWeight: "bold",
                              }}
                            >
                              {t("priority_reorder")}
                            </span>
                          )}
                        </div>

                        <div>
                          {t("stock")}: {item.stock} /{" "}
                          {t("min")}: {item.threshold}
                        </div>

                        {item.is_priority && (
                          <div
                            style={{
                              marginTop: 3,
                              color: "#ffad73",
                              fontSize: 12,
                            }}
                          >
                            {t("units_sold_last_30_days")}: {" "}
                            {item.units_sold_30d}
                          </div>
                        )}

                        {existingReorderItem && (
                          <div
                            style={{
                              marginTop: 3,
                              color: COLORS.textDim,
                              fontSize: 12,
                            }}
                          >
                            On reorder list: {existingReorderItem.quantity}
                            {existingReorderItem.supplier_name
                              ? ` · ${existingReorderItem.supplier_name}`
                              : " · Unassigned"}
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setAdjustmentProduct(item)
                          }
                          style={btnSecondary}
                        >
                          {t("adjust_stock")}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openThresholdModal(item)
                          }
                          style={btnSecondary}
                        >
                          {t("change_low_stock")}
                        </button>

                        <button
                          type="button"
                          onClick={() => openReorderModal(item)}
                          style={
                            existingReorderItem
                              ? btnSecondary
                              : btnPrimary
                          }
                        >
                          {existingReorderItem
                            ? t("update_reorder")
                            : t("add_to_reorder")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {lowStockView === "reorder" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  flexWrap: "wrap",
                }}
              >
                {[
                  ["master", t("master_list")],
                  ["supplier", t("by_supplier")],
                  ["unassigned", t("unassigned")],
                ].map(([filter, label]) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => {
                      setReorderFilter(filter);

                      if (filter !== "supplier") {
                        setReorderSupplierId("");
                      }
                    }}
                    style={
                      reorderFilter === filter
                        ? btnPrimary
                        : btnSecondary
                    }
                  >
                    {label}
                  </button>
                ))}

                {reorderFilter === "supplier" && (
                  <select
                    value={reorderSupplierId}
                    onChange={(event) =>
                      setReorderSupplierId(event.target.value)
                    }
                    style={{
                      ...input,
                      minWidth: 220,
                    }}
                  >
                    <option value="">
                      Select supplier...
                    </option>

                    {reorderSupplierOptions.map((supplier) => (
                      <option
                        key={supplier.supplier_id}
                        value={supplier.supplier_id}
                      >
                        {supplier.supplier_name}
                      </option>
                    ))}
                  </select>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    paddingLeft: 8,
                    borderLeft: `1px solid ${COLORS.border}`,
                  }}
                >
                  {[
                    ["all", t("all")],
                    ["priority", t("purchase_priority")],
                    ["regular", t("non_priority")],
                  ].map(([filter, label]) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() =>
                        setReorderPriorityFilter(filter)
                      }
                      style={
                        reorderPriorityFilter === filter
                          ? btnPrimary
                          : btnSecondary
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={openReorderProductPicker}
                  style={{
                    ...btnPrimary,
                    marginLeft: "auto",
                  }}
                >
                  + {t("add_product")}
                </button>
              </div>

              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  minHeight: 0,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={reorderHeaderCell}>Product</th>
                      <th style={reorderHeaderCell}>Supplier</th>
                      <th style={reorderHeaderCell}>Supplier SKU</th>
                      <th style={reorderHeaderCell}>Quantity</th>
                      <th style={reorderHeaderCell}>Estimated Unit Cost</th>
                      <th style={reorderHeaderCell}>Projected Cost</th>
                      <th style={reorderHeaderCell}>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleReorderItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: 18,
                            textAlign: "center",
                            color: COLORS.textDim,
                          }}
                        >
                          {reorderFilter === "supplier" &&
                          reorderSupplierId === ""
                            ? "Select a supplier to view its reorder list."
                            : "No products in this reorder list."}
                        </td>
                      </tr>
                    ) : (
                      visibleReorderItems.map((item) => (
                        <tr key={item.product_id}>
                          <td style={reorderBodyCell}>
                            <strong>{item.product_name}</strong>

                            {item.purchase_priority && (
                              <div
                                style={{
                                  display: "inline-block",
                                  marginLeft: 7,
                                  padding: "2px 7px",
                                  border: "1px solid #ff8c42",
                                  borderRadius: 999,
                                  color: "#ffad73",
                                  fontSize: 11,
                                  fontWeight: "bold",
                                }}
                              >
                                {t("must_purchase")}
                              </div>
                            )}
                          </td>

                          <td style={reorderBodyCell}>
                            {item.supplier_name || "Unassigned"}
                          </td>

                          <td style={reorderBodyCell}>
                            {item.supplier_sku || "—"}
                          </td>

                          <td style={reorderBodyCell}>
                            {item.quantity}
                          </td>

                          <td style={reorderBodyCell}>
                            {item.estimated_unit_cost == null ? (
                              <span style={{ color: COLORS.textDim }}>
                                Unknown
                              </span>
                            ) : (
                              <>
                                ${formatMoney(item.estimated_unit_cost)}
                                <div
                                  style={{
                                    color: COLORS.textDim,
                                    fontSize: 11,
                                    marginTop: 2,
                                  }}
                                >
                                  {item.cost_source === "supplier_last_cost"
                                    ? "Supplier cost"
                                    : "Product cost"}
                                </div>
                              </>
                            )}
                          </td>

                          <td style={reorderBodyCell}>
                            {item.projected_cost == null
                              ? "Excluded"
                              : `$${formatMoney(item.projected_cost)}`}
                          </td>

                          <td style={reorderBodyCell}>
                            <div
                              style={{
                                display: "flex",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => openReorderModal(item)}
                                style={btnSecondary}
                              >
                                {t("edit")}
                              </button>

                              <button
                                type="button"
                                onClick={() => removeReorderItem(item)}
                                style={btnDanger}
                              >
                                {t("remove")}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  alignItems: "end",
                  justifyContent: "space-between",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div
                    style={{
                      color: COLORS.primary,
                      fontSize: 20,
                      fontWeight: "bold",
                    }}
                  >
                    Projected total: $
                    {formatMoney(visibleProjectedTotal)}
                  </div>

                  {visiblePriorityCount > 0 && (
                    <div
                      style={{
                        color: "#ffad73",
                        marginTop: 4,
                        fontWeight: "bold",
                      }}
                    >
                      {t("priority_subtotal")}: ${
                        formatMoney(
                          visiblePriorityProjectedTotal
                        )
                      } ({visiblePriorityCount})
                    </div>
                  )}

                  {visibleUnknownCostCount > 0 && (
                    <div
                      style={{
                        color: COLORS.textDim,
                        marginTop: 4,
                      }}
                    >
                      {visibleUnknownCostCount}{" "}
                      {visibleUnknownCostCount === 1
                        ? "item is"
                        : "items are"}{" "}
                      excluded because the cost is unknown.
                    </div>
                  )}
                </div>

                {visibleReorderItems.length > 0 &&
                  reorderPriorityFilter === "all" && (
                  <button
                    type="button"
                    onClick={clearCurrentReorderView}
                    style={btnDanger}
                  >
                    {reorderFilter === "master"
                      ? t("clear_all")
                      : reorderFilter === "supplier"
                      ? t("clear_supplier_list")
                      : t("clear_unassigned")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* PARETO */}
      {inventoryView === "pareto" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <h3>{t("pareto")}</h3>

          <div
            style={{
              background: COLORS.panelAlt,
              padding: 10,
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 13,
              color: COLORS.textDim,
            }}
          >
            <div style={{ marginBottom: 6 }}>
              {t("pareto_desc_1")}
            </div>

            <div style={{ marginBottom: 6 }}>
              {t("pareto_desc_2")}
            </div>

            <div style={{ marginBottom: 6 }}>
              {t("pareto_desc_3")}
            </div>

            <ul style={{ paddingLeft: 18 }}>
              <li>{t("pareto_focus")}</li>
              <li>{t("pareto_reduce")}</li>
              <li>{t("pareto_improve")}</li>
            </ul>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 12,
              flexWrap: "wrap",
            }}
          >
            {["investment", "sales", "profit"].map(
              (mode) => (
                <button
                  key={mode}
                  onClick={() => setParetoMode(mode)}
                  style={
                    paretoMode === mode
                      ? btnPrimary
                      : btnSecondary
                  }
                >
                  {t(mode).toUpperCase()}
                </button>
              )
            )}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {sortedPareto.map((product, index) => {
              const value =
                paretoMode === "investment"
                  ? product.investment
                  : paretoMode === "sales"
                  ? product.revenue
                  : product.profit;

              return (
                <div
                  key={index}
                  style={{
                    background:
                      index < topCount
                        ? COLORS.highlight
                        : COLORS.panelAlt,
                    padding: 8,
                    marginBottom: 6,
                    borderRadius: 6,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      color:
                        index < topCount
                          ? COLORS.primary
                          : COLORS.text,
                    }}
                  >
                    {product.name}
                  </div>

                  <div
                    style={{
                      color:
                        index < topCount
                          ? COLORS.primary
                          : COLORS.text,
                    }}
                  >
                    ${formatMoney(value)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SERVICES */}
      {inventoryView === "services" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              type="date"
              value={serviceStartDate}
              onChange={(event) =>
                setServiceStartDate(event.target.value)
              }
              style={input}
            />

            <input
              type="date"
              value={serviceEndDate}
              onChange={(event) =>
                setServiceEndDate(event.target.value)
              }
              style={input}
            />

            <button
              onClick={loadServices}
              style={btnPrimary}
            >
              {t("apply")}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 30,
              marginBottom: 12,
              fontWeight: "bold",
              flexWrap: "wrap",
            }}
          >
            <div>
              {t("cost")}: $
              {formatMoney(serviceTotals.cost)}
            </div>

            <div>
              {t("value")}: $
              {formatMoney(serviceTotals.revenue)}
            </div>

            <div style={{ color: COLORS.primary }}>
              {t("profit")}: $
              {formatMoney(serviceTotals.profit)}
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              minHeight: 0,
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}
                >
                  <th>Name</th>
                  <th>Instances</th>
                  <th>Cost</th>
                  <th>Revenue</th>
                  <th>Profit</th>
                </tr>
              </thead>

              <tbody>
                {filteredServices.map(
                  (service, index) => (
                    <tr
                      key={index}
                      style={{
                        borderBottom: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <td>{service.name}</td>
                      <td>{service.instances || 0}</td>
                      <td>
                        ${formatMoney(service.cost)}
                      </td>
                      <td>
                        ${formatMoney(service.revenue)}
                      </td>
                      <td
                        style={{
                          color:
                            (service.profit || 0) >= 0
                              ? COLORS.primary
                              : COLORS.danger,
                        }}
                      >
                        ${formatMoney(service.profit)}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DEAD STOCK */}
      {inventoryView === "deadstock" && (
        <div
          style={{
            ...card,
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div
            style={{
              marginBottom: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <input
              type="number"
              value={deadStockDays}
              onChange={(event) =>
                setDeadStockDays(
                  Number(event.target.value)
                )
              }
              style={input}
            />

            <button
              onClick={loadDeadStock}
              style={btnPrimary}
            >
              {t("apply")}
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              minHeight: 0,
            }}
          >
            {deadStockItems.map((product, index) => (
              <div
                key={index}
                style={{
                  background: COLORS.panelAlt,
                  padding: 8,
                  marginBottom: 6,
                  borderRadius: 6,
                }}
              >
                {product.name} —{" "}
                {product.days_since_sale ?? t("never")}
              </div>
            ))}
          </div>
        </div>
      )}

      {adjustmentProduct && (
        <div style={reorderModalBackdrop}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("adjust_stock")}
            style={{
              ...reorderModalPanel,
              width: "min(560px, 100%)",
            }}
          >
            <StockAdjustment
              storeId={storeId}
              initialProduct={{
                ...adjustmentProduct,
                tracks_stock: true,
              }}
              compact
              onClose={() => setAdjustmentProduct(null)}
              onCompleted={handleLowStockAdjustment}
            />
          </div>
        </div>
      )}

      {thresholdProduct && (
        <div
          role="presentation"
          onMouseDown={closeThresholdModal}
          style={reorderModalBackdrop}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("change_low_stock")}
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              ...reorderModalPanel,
              width: "min(460px, 100%)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>
                  {t("change_low_stock")}
                </h3>
                <div
                  style={{
                    color: COLORS.textDim,
                    marginTop: 4,
                  }}
                >
                  {thresholdProduct.name}
                </div>
              </div>

              <button
                type="button"
                onClick={closeThresholdModal}
                disabled={thresholdSaving}
                style={reorderModalClose}
              >
                ×
              </button>
            </div>

            <label style={reorderFieldStyle}>
              <span>{t("low_stock_threshold")}</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                autoFocus
                value={thresholdValue}
                onChange={(event) =>
                  setThresholdValue(event.target.value)
                }
                disabled={thresholdSaving}
                style={{
                  ...input,
                  width: "100%",
                  border: `2px solid ${COLORS.primary}`,
                }}
              />
            </label>

            <div
              style={{
                color: COLORS.textDim,
                fontSize: 12,
                marginTop: 8,
              }}
            >
              {t("low_stock_threshold_help")}
            </div>

            {thresholdError && (
              <div
                style={{
                  color: COLORS.danger,
                  marginTop: 10,
                }}
              >
                {thresholdError}
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={closeThresholdModal}
                disabled={thresholdSaving}
                style={btnSecondary}
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                onClick={saveLowStockThreshold}
                disabled={thresholdSaving}
                style={{
                  ...btnPrimary,
                  opacity: thresholdSaving ? 0.6 : 1,
                }}
              >
                {thresholdSaving
                  ? t("loading")
                  : t("save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {reorderProductPickerOpen && (
        <div
          role="presentation"
          onMouseDown={closeReorderProductPicker}
          style={reorderModalBackdrop}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Select a product for the reorder list"
            onMouseDown={(event) => event.stopPropagation()}
            style={reorderModalPanel}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <h3 style={{ margin: 0 }}>
                Add Product to Reorder List
              </h3>

              <button
                type="button"
                aria-label="Close product selector"
                onClick={closeReorderProductPicker}
                style={reorderModalClose}
              >
                ×
              </button>
            </div>

            <input
              type="text"
              autoFocus
              placeholder="Search products..."
              value={reorderProductSearch}
              onChange={(event) =>
                setReorderProductSearch(
                  event.target.value
                )
              }
              style={{
                ...input,
                width: "100%",
                marginBottom: 12,
                boxSizing: "border-box",
              }}
            />

            {reorderProductOptionsError && (
              <div
                style={{
                  padding: 10,
                  marginBottom: 12,
                  borderRadius: 8,
                  background: COLORS.panelAlt,
                  color: COLORS.danger,
                }}
              >
                {reorderProductOptionsError}
              </div>
            )}

            <div style={reorderProductPickerList}>
              {reorderProductOptionsLoading ? (
                <div style={reorderProductPickerEmpty}>
                  Loading products...
                </div>
              ) : visibleReorderProductOptions.length === 0 ? (
                <div style={reorderProductPickerEmpty}>
                  No products found.
                </div>
              ) : (
                visibleReorderProductOptions.map((product) => {
                  const existingItem = reorderItems.find(
                    (item) =>
                      item.product_id === product.product_id
                  );

                  return (
                    <button
                      key={product.product_id}
                      type="button"
                      onClick={() =>
                        selectReorderProduct(product)
                      }
                      style={reorderProductPickerRow}
                    >
                      <span
                        style={{
                          minWidth: 0,
                          textAlign: "left",
                        }}
                      >
                        <strong>{product.name}</strong>

                        <span
                          style={{
                            display: "block",
                            marginTop: 3,
                            color: COLORS.textDim,
                            fontSize: 12,
                          }}
                        >
                          Stock: {Number(product.stock || 0)}
                          {product.low_stock_threshold != null
                            ? ` · Minimum: ${Number(
                                product.low_stock_threshold || 0
                              )}`
                            : ""}
                        </span>
                      </span>

                      <span
                        style={{
                          flex: "0 0 auto",
                          color: existingItem
                            ? COLORS.textDim
                            : COLORS.primary,
                          fontSize: 12,
                          fontWeight: "bold",
                        }}
                      >
                        {existingItem
                          ? `On list · Qty ${existingItem.quantity}`
                          : t("add")}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 14,
              }}
            >
              <button
                type="button"
                onClick={closeReorderProductPicker}
                style={btnSecondary}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeReorderProduct && (
        <div
          role="presentation"
          onMouseDown={closeReorderModal}
          style={reorderModalBackdrop}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Add ${activeReorderProduct.name} to reorder list`}
            onMouseDown={(event) => event.stopPropagation()}
            style={reorderModalPanel}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <h3 style={{ margin: 0 }}>
                  {activeReorderProduct.name}
                </h3>

                {activeReorderProduct.stock != null && (
                  <div
                    style={{
                      color: COLORS.textDim,
                      marginTop: 4,
                    }}
                  >
                    Stock: {activeReorderProduct.stock}
                    {activeReorderProduct.threshold != null
                      ? ` / Minimum: ${activeReorderProduct.threshold}`
                      : ""}
                  </div>
                )}
              </div>

              <button
                type="button"
                aria-label="Close reorder form"
                onClick={closeReorderModal}
                disabled={reorderSaving}
                style={reorderModalClose}
              >
                ×
              </button>
            </div>

            {reorderError && (
              <div
                style={{
                  background: COLORS.panelAlt,
                  color: COLORS.danger,
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 12,
                }}
              >
                {reorderError}
              </div>
            )}

            {reorderLoading ? (
              <div style={{ color: COLORS.textDim }}>
                Loading suppliers...
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                  }}
                >
                  <label style={reorderFieldStyle}>
                    <span>Supplier</span>

                    <select
                      value={reorderForm.supplier_id}
                      onChange={(event) =>
                        setReorderForm((previous) => ({
                          ...previous,
                          supplier_id: event.target.value,
                        }))
                      }
                      disabled={reorderSaving}
                      style={{ ...input, width: "100%" }}
                    >
                      <option value="">
                        Unassigned / No supplier
                      </option>

                      {reorderModalSupplierChoices.map((supplier) => (
                        <option
                          key={supplier.supplier_id}
                          value={supplier.supplier_id}
                        >
                          {supplier.is_preferred ? "★ " : ""}
                          {supplier.supplier_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={reorderFieldStyle}>
                    <span>Quantity</span>

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={reorderForm.quantity}
                      onChange={(event) =>
                        setReorderForm((previous) => ({
                          ...previous,
                          quantity: event.target.value,
                        }))
                      }
                      disabled={reorderSaving}
                      style={{ ...input, width: "100%" }}
                    />
                  </label>
                </div>

                <label
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 9,
                    marginTop: 14,
                    padding: 10,
                    border: reorderForm.purchase_priority
                      ? "1px solid #ff8c42"
                      : `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    background: COLORS.panelAlt,
                    cursor: reorderSaving
                      ? "default"
                      : "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reorderForm.purchase_priority}
                    onChange={(event) =>
                      setReorderForm((previous) => ({
                        ...previous,
                        purchase_priority:
                          event.target.checked,
                      }))
                    }
                    disabled={reorderSaving}
                  />

                  <span>
                    <strong>{t("mark_purchase_priority")}</strong>
                    <span
                      style={{
                        display: "block",
                        color: COLORS.textDim,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {t("purchase_priority_help")}
                    </span>
                  </span>
                </label>

                <div
                  style={{
                    marginTop: 12,
                    padding: 10,
                    borderRadius: 8,
                    background: COLORS.panelAlt,
                    color: COLORS.textDim,
                  }}
                >
                  {assignedProductSuppliers.length === 0 &&
                  reorderForm.supplier_id !== ""
                    ? "This supplier will also be assigned to the product as non-preferred."
                    : selectedReorderModalSupplier?.last_cost != null &&
                      Number(selectedReorderModalSupplier.last_cost) > 0
                    ? `Supplier last cost: $${formatMoney(
                        selectedReorderModalSupplier.last_cost
                      )}`
                    : "VENDR will use the product cost fallback when no supplier cost is known."}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    type="button"
                    onClick={saveReorderItem}
                    disabled={reorderSaving}
                    style={{
                      ...btnPrimary,
                      opacity: reorderSaving ? 0.6 : 1,
                      cursor: reorderSaving ? "default" : "pointer",
                    }}
                  >
                    {reorderSaving
                      ? "Saving..."
                      : t("save_to_reorder_list")}
                  </button>

                  <button
                    type="button"
                    onClick={closeReorderModal}
                    disabled={reorderSaving}
                    style={btnSecondary}
                  >
                    {t("cancel")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const reorderHeaderCell = {
  padding: "10px 12px",
  textAlign: "left",
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${COLORS.border}`,
  position: "sticky",
  top: 0,
  zIndex: 1,
  background: COLORS.panelAlt,
};

const reorderBodyCell = {
  padding: "10px 12px",
  borderBottom: `1px solid ${COLORS.border}`,
  verticalAlign: "top",
};

const reorderModalBackdrop = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(0, 0, 0, 0.72)",
};

const reorderModalPanel = {
  width: "min(720px, 100%)",
  maxHeight: "88vh",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: 20,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 10,
  background: COLORS.panel,
  boxShadow: "0 18px 60px rgba(0, 0, 0, 0.5)",
};

const reorderModalClose = {
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: 28,
  lineHeight: 1,
  padding: "0 4px",
};

const reorderFieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const reorderProductPickerList = {
  maxHeight: "52vh",
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 7,
  paddingRight: 3,
};

const reorderProductPickerRow = {
  width: "100%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "10px 12px",
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.panelAlt,
  color: "inherit",
  cursor: "pointer",
};

const reorderProductPickerEmpty = {
  padding: 22,
  textAlign: "center",
  color: COLORS.textDim,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.panelAlt,
};

export default InventoryReport;
