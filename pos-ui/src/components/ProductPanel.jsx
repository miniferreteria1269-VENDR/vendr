import { useState, useEffect, useRef } from "react";
import axios from "axios";
import SearchBar from "./SearchBar";

function ProductPanel({
  products,
  searchTerm,
  setSearchTerm,
  addItem,
  createProductFromSearch,
  handleSearchEnter,
  storeId   // ✅ ADD THIS
}) {

  const [quickItems, setQuickItems] = useState([]);

  const pressTimer = useRef(null);
  const longPressTriggered = useRef(false);

  // -----------------------------
  // LOAD QUICK ITEMS (FIXED)
  // -----------------------------

  const loadQuickItems = async () => {
    if (!storeId) return;

    try {
      const res = await axios.get(
        "https://vendr-onkr.onrender.com/quick-items",
        {
          params: { store_id: storeId } // ✅ FIXED
        }
      );

      setQuickItems(res.data.products || []);

    } catch (err) {
      console.error("Quick items error:", err);
    }
  };

  // 🔥 CRITICAL: reload on store change
  useEffect(() => {
    if (!storeId) return;

    setQuickItems([]); // ✅ CLEAR OLD STORE DATA
    loadQuickItems();

  }, [storeId]);

  // -----------------------------
  // Long press logic
  // -----------------------------

  const handlePressStart = (product) => {

    longPressTriggered.current = false;

    pressTimer.current = setTimeout(() => {

      longPressTriggered.current = true;

      const qty = Number(prompt(`Add how many "${product.name}"?`, 1));

      if (!qty || qty <= 0) return;

      for (let i = 0; i < qty; i++) {
        addItem(product);
      }

    }, 600);

  };

  const handlePressEnd = (product) => {

    clearTimeout(pressTimer.current);

    if (!longPressTriggered.current) {
      addItem(product);
    }

  };

  // -----------------------------
  // Search filtering
  // -----------------------------

  const filteredProducts = products
    .filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

  return (

    <div style={{ flex: 2, padding: 20 }}>

      <h2>Products</h2>

      <SearchBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearchEnter={handleSearchEnter}
      />

      {/* QUICK PRODUCTS */}

      {quickItems.length > 0 && (

        <div style={{ marginBottom: 20 }}>

          <h4>Quick Products</h4>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 8
            }}
          >

            {quickItems.map(p => (

              <button
                key={p.product_id}
                onMouseDown={() => handlePressStart(p)}
                onMouseUp={() => handlePressEnd(p)}
                onTouchStart={() => handlePressStart(p)}
                onTouchEnd={() => handlePressEnd(p)}
                style={{
                  padding: 10,
                  background: "#eee",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  cursor: "pointer",
                  textAlign: "left"
                }}
              >

                <div style={{ fontWeight: "bold" }}>
                  {p.name}
                </div>

                <div style={{ fontSize: 14 }}>
                  ${Number(p.price).toFixed(2)}
                </div>

                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Stock: {p.stock}
                </div>

              </button>

            ))}

          </div>

        </div>

      )}

      {/* SEARCH RESULTS */}

      {searchTerm !== "" && filteredProducts.map(p => (

        <div
          key={p.product_id}
          style={{
            border: "1px solid #ccc",
            padding: 10,
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between"
          }}
        >

          <div>
            <b>{p.name}</b><br />
            Stock: {p.stock}
          </div>

          <button onClick={() => addItem(p)}>
            Add
          </button>

        </div>

      ))}

      {/* CREATE PRODUCT */}

      {filteredProducts.length === 0 && searchTerm !== "" && (

        <button
          onClick={createProductFromSearch}
          style={{
            padding: "10px",
            width: "100%",
            background: "#2e7d32",
            color: "white",
            border: "none"
          }}
        >
          Create "{searchTerm}"
        </button>

      )}

    </div>

  );

}

export default ProductPanel;