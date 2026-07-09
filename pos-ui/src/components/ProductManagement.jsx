import { useState, useEffect } from "react";
import { useLang } from "../LanguageContext";
import axios from "axios";
import ProductImporter from "./ProductImporter";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  btnDanger,
  input
} from "../uiStyles";

// ==============================
// MAIN PANEL
// ==============================
function ProductManagement({ storeId }) {

  const { t } = useLang();

  const [pmView, setPmView] = useState("menu");

  return (
    <div style={{ padding: 16 }}>

      <h2 style={{ marginBottom: 12 }}>{t("product_management")}</h2>

      {/* NAV */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
        flexWrap: "wrap"
      }}>
        {[
          ["create", "create"],
          ["price", "price"],
          ["edit", "edit"],
          ["loss", "loss"],
          ["adjustment", "adjustment"],
          ["transfer", "transfer"],
          ["archive", "archive"],
          ["import", "import"]
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPmView(key)}
            style={pmView === key ? btnPrimary : btnSecondary}
          >
            {t(label)}
          </button>
        ))}
      </div>

      <div style={card}>
        {pmView === "menu" && <div>{t("select_tool")}</div>}
        {pmView === "create" && <CreateProduct storeId={storeId} goBack={() => setPmView("menu")} />}
        {pmView === "price" && <PriceChange storeId={storeId} />}
        {pmView === "edit" && <EditDetails storeId={storeId} />}
        {pmView === "loss" && <LogLoss storeId={storeId} />}
        {pmView === "adjustment" && <StockAdjustment storeId={storeId} />}
        {pmView === "transfer" && <StockTransfer storeId={storeId} />}
        {pmView === "archive" && <ArchiveProduct storeId={storeId} />}
        {pmView === "import" && <ProductImporter storeId={storeId} />}
      </div>

    </div>
  );
}

// ==============================
const resultCard = () => ({
  background: COLORS.panelAlt,
  padding: 10,
  borderRadius: 8,
  marginBottom: 6,
  cursor: "pointer",
  border: "1px solid transparent"
});

function CreateProduct({ storeId, goBack }) {

  const { t } = useLang();

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
      alert(t("product_name_required"));
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
          tracks_stock: tracksStock, // ✅ FIXED (was broken)
          low_stock_threshold: threshold
        }
      }
    );

    alert(t("product_created"));
    goBack();

  };

  return (
    <div style={{ maxWidth: 400 }}>

      <h3>{t("create_product")}</h3>

      <label>{t("name")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 6 }}
        placeholder={t("product_name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {suggestions.map(p => (
        <div key={p.product_id} style={resultCard()}>
          {p.name}
        </div>
      ))}

      <label>{t("initial_stock")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={initialStock}
        onChange={(e) => setInitialStock(Number(e.target.value))}
      />

      <label>{t("cost")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={cost}
        onChange={(e) => setCost(Number(e.target.value))}
      />

      <label>{t("price")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={price}
        onChange={(e) => setPrice(Number(e.target.value))}
      />

      <label>{t("low_stock")}</label>
      <input
        style={{ ...input, width: "100%", marginBottom: 8 }}
        type="number"
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
      />

      <div style={{ marginTop: 10, marginBottom: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={tracksStock}
            onChange={(e) => setTracksStock(e.target.checked)}
          />
          {" "}{t("tracks_stock")}
        </label>
      </div>

      <button style={btnPrimary} onClick={createProduct}>
        {t("create_product")}
      </button>

      <button
        style={{ ...btnSecondary, marginLeft: 8 }}
        onClick={goBack}
      >
        {t("cancel")}
      </button>

    </div>
  );
}

// ==============================
// PRICE CHANGE
// ==============================
function PriceChange({ storeId }) {

  const { t } = useLang();

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
    alert(t("updated"));
    setSelected(null);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("price_change")}</h3>

      {!selected && (
        <>
          <input
            style={{ ...input, width: "100%", marginBottom: 10 }}
            placeholder={t("search_product")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (e.target.value.length > 1) searchProducts(e.target.value);
            }}
          />

          {products.map(p => (
            <div key={p.product_id} onClick={()=>{
              setSelected(p);
              setCost(p.cost || 0);
              setPrice(p.price || 0);
            }} style={resultCard()}>
              {p.name}
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <strong>{selected.name}</strong>

          <label>{t("cost")}</label>
          <input style={input} type="number" value={cost}
            onChange={e=>setCost(Number(e.target.value))}/>

          <label>{t("price")}</label>
          <input style={input} type="number" value={price}
            onChange={e=>setPrice(Number(e.target.value))}/>

          <button style={btnPrimary}>{t("save")}</button>
          <button style={btnSecondary} onClick={()=>setSelected(null)}>
            {t("cancel")}
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// LOG LOSS
// ==============================
function LogLoss({ storeId }) {

  const { t } = useLang();

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
    await axios.post("https://vendr-onkr.onrender.com/loss", null, {
      params: { store_id: storeId, product_id: selected.product_id, quantity, notes }
    });
    alert(t("loss_recorded"));
    setSelected(null);
    setNotes("");
    setQuantity(1);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("log_loss")}</h3>

      {!selected && (
        <>
          <input style={input} placeholder={t("search_product")}
            value={search}
            onChange={(e)=>{
              setSearch(e.target.value);
              if(e.target.value.length>1) searchProducts(e.target.value);
            }}
          />

          {products.map(p=>(
            <div key={p.product_id} onClick={()=>setSelected(p)} style={resultCard()}>
              {p.name} ({t("stock")}: {p.stock})
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <strong>{selected.name}</strong>

          <label>{t("quantity")}</label>
          <input style={input} type="number" value={quantity}
            onChange={e=>setQuantity(Number(e.target.value))}/>

          <label>{t("notes")}</label>
          <input style={input} value={notes}
            onChange={e=>setNotes(e.target.value)}/>

          <button
            style={btnPrimary}
            onClick={submit}
          >
            {t("submit")}
          </button>
          <button style={btnSecondary} onClick={()=>setSelected(null)}>
            {t("cancel")}
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// EDIT DETAILS
// ==============================
function EditDetails({ storeId }) {

  const { t } = useLang();

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
    await axios.post("https://vendr-onkr.onrender.com/edit-product", null, {
      params: { store_id: storeId, product_id: selected.product_id, name, low_stock_threshold: threshold, tracks_stock: tracksStock ? 1 : 0 }
    });
    alert(t("updated"));
    setSelected(null);
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("edit_product")}</h3>

      {!selected && (
        <>
          <input style={input} value={search}
            onChange={(e)=>{
              setSearch(e.target.value);
              if(e.target.value.length>1) searchProducts(e.target.value);
            }}/>

          {products.map(p=>(
            <div key={p.product_id} onClick={()=>{
              setSelected(p);
              setName(p.name);
              setThreshold(p.low_stock_threshold||0);
              setTracksStock(p.tracks_stock);
            }} style={resultCard()}>
              {p.name}
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <label>{t("name")}</label>
          <input style={input} value={name} onChange={e=>setName(e.target.value)}/>

          <label>{t("low_stock")}</label>
          <input style={input} value={threshold}
            onChange={e=>setThreshold(Number(e.target.value))}/>

          <label>
            <input type="checkbox" checked={tracksStock}
              onChange={e=>setTracksStock(e.target.checked)}/>
            {" "}{t("tracks_stock")}
          </label>

          <button style={btnPrimary} onClick={submit}>
            {t("save")}
          </button>
          <button style={btnSecondary} onClick={()=>setSelected(null)}>
            {t("cancel")}
          </button>
        </>
      )}
    </div>
  );
}

// ==============================
// ARCHIVE
// ==============================
function ArchiveProduct({ storeId }) {

  const { t } = useLang();

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
    await axios.post("https://vendr-onkr.onrender.com/archive-product", null, {
      params: { store_id: storeId, product_id: p.product_id, is_active: !p.is_active }
    });

    alert(t("updated"));

    setProducts(prev =>
      prev.map(x =>
        x.product_id === p.product_id
          ? { ...x, is_active: !x.is_active }
          : x
      )
    );
  };

  return (
    <div style={{ maxWidth: 400 }}>
      <h3>{t("archive_product")}</h3>

      <input
        style={{ ...input, width: "100%", marginBottom: 10 }}
        placeholder={t("search_product")}
        value={search}
        onChange={(e)=>{
          setSearch(e.target.value);
          if(e.target.value.length>1) searchProducts(e.target.value);
          else setProducts([]);
        }}
      />

      {products.map(p=>(
        <div key={p.product_id} style={resultCard()}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span>{p.name}</span>
            <button style={btnDanger} onClick={()=>archive(p)}>
              {p.is_active===false ? t("restore") : t("archive")}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
function StockAdjustment({ storeId }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [direction, setDirection] = useState("positive");
  const [note, setNote] = useState("");

  const searchProducts = async (term) => {
    const res = await axios.get("https://vendr-onkr.onrender.com/products/search", {
      params: { store_id: storeId, name: term }
    });
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await axios.post("https://vendr-onkr.onrender.com/stock-adjustment", {
      store_id: storeId,
      product_id: selected.product_id,
      quantity,
      direction,
      reason: "",
      note
    });

    alert("Stock adjustment recorded.");
    setSelected(null);
    setQuantity(1);
    setDirection("positive");
    setNote("");
  };

  return (
    <div style={card}>
      <h3>Stock Adjustment</h3>

      {!selected && (
        <>
          <input
            placeholder={t("search")}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (e.target.value.length > 1) searchProducts(e.target.value);
              else setProducts([]);
            }}
            style={input}
          />

          {products.map(p => (
            <div key={p.product_id} onClick={() => setSelected(p)} style={resultCard()}>
              {p.name} ({t("stock")}: {p.stock})
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <p><strong>{selected.name}</strong></p>

          <select value={direction} onChange={e => setDirection(e.target.value)} style={input}>
            <option value="positive">Adjustment +</option>
            <option value="negative">Adjustment -</option>
          </select>

          <input type="number" value={quantity} min="1" onChange={e => setQuantity(Number(e.target.value))} style={input} />
          <input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} style={input} />

          <button onClick={submit} style={btnPrimary}>Submit</button>
          <button onClick={() => setSelected(null)} style={btnSecondary}>Cancel</button>
        </>
      )}
    </div>
  );
}

function StockTransfer({ storeId }) {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [direction, setDirection] = useState("out");
  const [note, setNote] = useState("");

  const searchProducts = async (term) => {
    const res = await axios.get("https://vendr-onkr.onrender.com/products/search", {
      params: { store_id: storeId, name: term }
    });
    setProducts(res.data.products || []);
  };

  const submit = async () => {
    await axios.post("https://vendr-onkr.onrender.com/stock-transfer", {
      store_id: storeId,
      product_id: selected.product_id,
      quantity,
      direction,
      note
    });

    alert("Stock transfer recorded.");
    setSelected(null);
    setQuantity(1);
    setDirection("out");
    setNote("");
  };

  return (
    <div style={card}>
      <h3>Stock Transfer</h3>

      {!selected && (
        <>
          <input
            placeholder={t("search")}
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (e.target.value.length > 1) searchProducts(e.target.value);
              else setProducts([]);
            }}
            style={input}
          />

          {products.map(p => (
            <div key={p.product_id} onClick={() => setSelected(p)} style={resultCard()}>
              {p.name} ({t("stock")}: {p.stock})
            </div>
          ))}
        </>
      )}

      {selected && (
        <>
          <p><strong>{selected.name}</strong></p>

          <select value={direction} onChange={e => setDirection(e.target.value)} style={input}>
            <option value="out">Transfer Out</option>
            <option value="in">Transfer In</option>
          </select>

          <input type="number" value={quantity} min="1" onChange={e => setQuantity(Number(e.target.value))} style={input} />
          <input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} style={input} />

          <button onClick={submit} style={btnPrimary}>Submit</button>
          <button onClick={() => setSelected(null)} style={btnSecondary}>Cancel</button>
        </>
      )}
    </div>
  );
}
export default ProductManagement;
