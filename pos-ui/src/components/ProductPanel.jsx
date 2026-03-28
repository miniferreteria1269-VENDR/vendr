import { useState, useEffect } from "react";
import axios from "axios";

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
  storeId   // ✅ ADDED (only change to props)
}) {

  // -----------------------------
  // QUICK ITEMS STATE
  // -----------------------------
  const [quickItems, setQuickItems] = useState([]);

  // -----------------------------
  // FETCH QUICK ITEMS
  // -----------------------------
  const fetchQuickItems = async () => {
    try {
      const res = await axios.get(`/quick-items?store_id=${storeId}`);
      setQuickItems(res.data.products);
    } catch (err) {
      console.error("Failed to fetch quick items", err);
    }
  };

  // -----------------------------
  // INITIAL LOAD
  // -----------------------------
  useEffect(() => {
    if (storeId) {
      fetchQuickItems();
    }
  }, [storeId]);   // ✅ ensures reload if store changes

  // -----------------------------
  // DISPLAY LOGIC
  // -----------------------------
  const displayProducts =
    searchTerm.trim() === "" ? quickItems : products;

  return (
    <div style={{
      width: "40%",
      background: COLORS.panel,
      borderRadius: 14,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      color: COLORS.text
    }}>

      {/* SEARCH */}
      <input
        type="text"
        placeholder="Search products..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: 10,
          borderRadius: 8,
          border: `1px solid ${COLORS.border}`,
          background: COLORS.panelAlt,
          color: COLORS.text,
          marginBottom: 12
        }}
      />

      {/* QUICK ITEMS LABEL */}
      {searchTerm.trim() === "" && (
        <div style={{
          marginBottom: 8,
          color: COLORS.textDim,
          fontSize: 13
        }}>
          Quick Items
        </div>
      )}

      {/* PRODUCT LIST */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        gap: 8
      }}>

        {displayProducts.map((product) => (
          <div
            key={product.product_id}
            onClick={() => addItem(product)}
            style={{
              background: COLORS.panelAlt,
              borderRadius: 10,
              padding: 10,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "0.15s",
              border: "1px solid transparent"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border = `1px solid ${COLORS.primary}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border = "1px solid transparent";
            }}
          >

            {/* LEFT SIDE */}
            <div>
              <div style={{ fontWeight: 500 }}>
                {product.name}
              </div>

              <div style={{
                fontSize: 12,
                color: COLORS.textDim
              }}>
                Stock: {product.stock}
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div style={{
              fontWeight: "bold",
              color: COLORS.primary
            }}>
              ${Number(product.price).toFixed(2)}
            </div>

          </div>
        ))}

      </div>

    </div>
  );
}

export default ProductPanel;