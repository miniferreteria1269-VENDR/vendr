import { useState, useEffect } from "react";
import axios from "axios";
import ProductImporter from "./ProductImporter";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";

// ==============================
// MAIN PANEL
// ==============================
function ProductManagement({ storeId }) {

  const [pmView, setPmView] = useState("menu");

  return (
    <div style={{ padding: 16 }}>

      <h2 style={{ marginBottom: 12 }}>Product Management</h2>

      {/* NAV */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
        flexWrap: "wrap"
      }}>
        {[
          ["create", "Create"],
          ["price", "Price"],
          ["edit", "Edit"],
          ["loss", "Loss"],
          ["archive", "Archive"],
          ["import", "Import"]
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPmView(key)}
            style={pmView === key ? btnPrimary : btnSecondary}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={card}>
        {pmView === "menu" && <div>Select a tool above</div>}
        {pmView === "create" && <CreateProduct storeId={storeId} goBack={() => setPmView("menu")} />}
        {pmView === "price" && <PriceChange storeId={storeId} />}
        {pmView === "edit" && <EditDetails storeId={storeId} />}
        {pmView === "loss" && <LogLoss storeId={storeId} />}
        {pmView === "archive" && <ArchiveProduct storeId={storeId} />}
        {pmView === "import" && <ProductImporter storeId={storeId} />}
      </div>

    </div>
  );
}

// ==============================
// SHARED RESULT CARD STYLE
// ==============================
const resultCard = (onClick) => ({
  background: COLORS.panelAlt,
  padding: 10,
  borderRadius: 8,
  marginBottom: 6,
  cursor: "pointer",
  border: "1px solid transparent"
});

// ==============================
// CREATE PRODUCT
// ==============================
function CreateProduct({ storeId, goBack }) {

  const [name, setName] = useState("");
  const [initialStock, setInitialStock] = useState(0);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [tracksStock, setTracksStock] = useState(true);
  const [threshold, setThreshold] = useState(0);
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {

    if (name.length < 2) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      try {
        const res = await axios.get(
          "https://vendr-onkr.onrender.com/products/search",
          {
            params: { store_id: storeId, name }
          }
        );
        setSuggestions(res.data.products.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(delay);

  }, [name, storeId]);

  const createProduct = async () => {

    if (!name.trim()) {
      alert("Product name required");
      return;
    }

    await axios.post(
      "https://vendr-onkr.onrender.com/create-product",
      null,
      {
        params: {
          store_id: storeId,
          name,
          initial_stock: initialStock,
          cost,
          price,
          tracks_stock: tracksStock,
          low_stock_threshold: threshold
        }
      }
    );

    alert("Product created");
    goBack();

  };

  return (
    <div style={{ maxWidth: 400 }}>

      <h3>Create Product</h3>

      <label>Name</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 6 }}
        placeholder="Product name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* ✅ SUGGESTIONS */}
      {suggestions.map(p => (
        <div key={p.product_id} style={resultCard()}>
          {p.name}
        </div>
      ))}

      <label>Initial Stock</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={initialStock}
        onChange={(e) => setInitialStock(Number(e.target.value))}
      />

      <label>Cost</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={cost}
        onChange={(e) => setCost(Number(e.target.value))}
      />

      <label>Price</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
      />

      <label>Low Stock Threshold</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
      />

      {/* TRACKS STOCK */}
      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={tracksStock}
            onChange={(e) => setTracksStock(e.target.checked)}
          />
          {" "}Tracks Stock
        </label>
      </div>

      <button style={btnPrimary} onClick={createProduct}>
        Create Product
      </button>

      <button
        style={{ ...btnSecondary, marginLeft: 8 }}
        onClick={goBack}
      >
        Cancel
      </button>

    </div>
  );
}

// ==============================
// PRICE CHANGE
// ==============================
function PriceChange({ storeId }) {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);

  const searchProducts = async (term) => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/products/search",
      { params: { store_id: storeId, name: term } }
    );
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await axios.post(
      "https://vendr-onkr.onrender.com/price-change",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          cost,
          price
        }
      }
    );
    alert("Updated");
    setSelected(null);
  };

  return (
    <div style={{ maxWidth: 400 }}>

      <h3>Price Change</h3>

      {!selected && (
        <>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            placeholder="Search product..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.length > 1) searchProducts(e.target.value);
            }}
          />

          {products.map(p => (
            <div key={p.product_id}
              onClick={() => {
                setSelected(p);
                setCost(p.cost || 0);
                setPrice(p.price || 0);
              }}
              style={resultCard()}
            >
              {p.name}
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <div style={{ marginBottom: 10 }}>
            <strong>{selected.name}</strong>
          </div>

          <label>Cost</label>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            type="number"
            value={cost}
            onChange={e => setCost(Number(e.target.value))}
          />

          <label>Price</label>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            type="number"
            value={price}
            onChange={e => setPrice(Number(e.target.value))}
          />

          <button style={btnPrimary} onClick={submit}>
            Save
          </button>

          <button
            style={{ ...btnSecondary, marginLeft: 8 }}
            onClick={() => setSelected(null)}
          >
            Cancel
          </button>
        </>
      )}

    </div>
  );
}

// ==============================
// ==============================
// LOG LOSS
// ==============================
function LogLoss({ storeId }) {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notes, setNotes] = useState("");
  const [quantity, setQuantity] = useState(1);

  const searchProducts = async (term) => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/products/search",
      { params: { store_id: storeId, name: term } }
    );
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await axios.post(
      "https://vendr-onkr.onrender.com/loss",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          quantity,
          notes
        }
      }
    );
    alert("Loss recorded");
    setSelected(null);
    setNotes("");
    setQuantity(1);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>Log Loss</h3>

      {!selected && (
        <>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            placeholder="Search product..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.length > 1) searchProducts(e.target.value);
            }}
          />

          {products.map(p => (
            <div
              key={p.product_id}
              onClick={() => setSelected(p)}
              style={resultCard()}
            >
              {p.name} (Stock: {p.stock})
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <div style={{ marginBottom: 10 }}>
            <strong>{selected.name}</strong>
          </div>

          <label>Quantity</label>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            type="number"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
          />

          <label>Notes</label>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />

          <button style={btnPrimary} onClick={submit}>
            Submit
          </button>

          <button
            style={{ ...btnSecondary, marginLeft: 8 }}
            onClick={() => setSelected(null)}
          >
            Cancel
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// EDIT DETAILS + ARCHIVE SAME PATTERN
// ==============================
function EditDetails({ storeId }) {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(0);
  const [tracksStock, setTracksStock] = useState(true);

  const searchProducts = async (term) => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/products/search",
      { params: { store_id: storeId, name: term, include_inactive: true } }
    );
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await axios.post(
      "https://vendr-onkr.onrender.com/edit-product",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          name,
          low_stock_threshold: threshold,
          tracks_stock: tracksStock
        }
      }
    );

    alert("Updated");
    setSelected(null);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>Edit Product</h3>

      {!selected && (
        <>
          <input style={input}
            value={search}
            onChange={(e)=>{
              setSearch(e.target.value);
              if (e.target.value.length > 1) searchProducts(e.target.value);
            }}
          />

          {products.map(p => (
            <div key={p.product_id}
              onClick={()=>{
                setSelected(p);
                setName(p.name);
                setThreshold(p.low_stock_threshold || 0);
                setTracksStock(p.tracks_stock);
              }}
              style={resultCard()}
            >
              {p.name}
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <label>Name</label>
          <input style={input} value={name}
            onChange={e=>setName(e.target.value)}
          />

          <label>Low Stock Threshold</label>
          <input style={input} value={threshold}
            onChange={e=>setThreshold(Number(e.target.value))}
          />

          <label>
            <input type="checkbox"
              checked={tracksStock}
              onChange={e=>setTracksStock(e.target.checked)}
            />
            Tracks Stock
          </label>

          <div style={{ marginTop: 10 }}>
            <button style={btnPrimary} onClick={submit}>Save</button>

            <button
              style={{ ...btnSecondary, marginLeft: 8 }}
              onClick={()=>setSelected(null)}
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ArchiveProduct({ storeId }) {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);

  const searchProducts = async (term) => {
    const res = await axios.get(
      "https://vendr-onkr.onrender.com/products/search",
      { params: { store_id: storeId, name: term, include_inactive: true } }
    );
    setProducts(res.data.products || []);
  };

  const archive = async (p) => {
    await axios.post(
      "https://vendr-onkr.onrender.com/archive-product",
      null,
      {
        params: {
          store_id: storeId,
          product_id: p.product_id
        }
      }
    );

    alert("Updated");
    setProducts(prev => prev.filter(x => x.product_id !== p.product_id));
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>Archive Product</h3>

      <input
        style={{ ...input, width: "100%", marginBottom: 10 }}
        placeholder="Search product..."
        value={search}
        onChange={(e)=>{
          setSearch(e.target.value);

          if (e.target.value.length > 1) {
            searchProducts(e.target.value);
          } else {
            setProducts([]);
          }
        }}
      />

      {Array.isArray(products) && products.map(p => (
        <div
          key={p.product_id || Math.random()}
          style={resultCard()}
        >
          <div style={{
            display:"flex",
            justifyContent:"space-between",
            alignItems:"center"
          }}>

            <span>{p.name || "Unnamed Product"}</span>

            <button
              style={btnDanger}
              onClick={()=>archive(p)}
            >
              {p.is_active === false ? "Restore" : "Archive"}
            </button>

          </div>
        </div>
      ))}

    </div>
  );
}

// ==============================
export default ProductManagement;