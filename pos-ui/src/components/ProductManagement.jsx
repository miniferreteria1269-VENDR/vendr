import { useState, useEffect } from "react";
import axios from "axios";
import ProductImporter from "./ProductImporter";
function ProductManagement({ storeId }) {

  const [pmView, setPmView] = useState("menu");

  return (

    <div style={{ padding: 20 }}>

      <h2>Product Management</h2>

      {/* TOOL BUTTONS */}

      <div style={{ marginBottom: 20 }}>

        <button onClick={() => setPmView("create")}>
          Create Product
        </button>

        <button
          onClick={() => setPmView("price")}
          style={{ marginLeft: 10 }}
        >
          Price Change
        </button>

        <button
          onClick={() => setPmView("edit")}
          style={{ marginLeft: 10 }}
        >
          Edit Details
        </button>

        <button
          onClick={() => setPmView("loss")}
          style={{ marginLeft: 10 }}
        >
          Log Loss
        </button>

        <button
          onClick={() => setPmView("archive")}
          style={{ marginLeft: 10 }}
        >
          Archive
        </button>

        <button
          onClick={() => setPmView("import")}
          style={{ marginLeft: 10 }}
        >
          Import Products
        </button>

      </div>

      {/* VIEW AREA */}

      {pmView === "menu" && (
        <p>Select a tool above.</p>
      )}

      {pmView === "create" && (
        <CreateProduct
          storeId={storeId}
          goBack={() => setPmView("menu")}
        />
      )}

      {pmView === "price" && (
        <PriceChange storeId={storeId} />
      )}

      {pmView === "edit" && (
        <EditDetails storeId={storeId} />
      )}

      {pmView === "loss" && (
        <LogLoss storeId={storeId} />
      )}

      {pmView === "archive" && (
        <ArchiveProduct storeId={storeId} />
      )}

      {pmView === "import" && (
        <ProductImporter storeId={storeId} />
      )}

    </div>

  );

}


function CreateProduct({ storeId, goBack }) {

  const [name, setName] = useState("");
  const [initialStock, setInitialStock] = useState(0);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);
  const [tracksStock, setTracksStock] = useState(true);
  const [threshold, setThreshold] = useState(0);

  const [suggestions, setSuggestions] = useState([]);

  // SEARCH SIMILAR PRODUCTS
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
            params: {
              store_id: storeId,
              name: name
            }
          }
        );

        setSuggestions(res.data.products.slice(0,5));

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
          name: name,
          initial_stock: initialStock,
          cost: cost,
          price: price,
          tracks_stock: tracksStock,
          low_stock_threshold: threshold
        }
      }
    );

    alert("Product created");
    goBack();

    setName("");
    setInitialStock(0);
    setCost(0);
    setPrice(0);
    setThreshold(0);
    setSuggestions([]);

  };


  return (

    <div style={{ maxWidth: 400 }}>

      <h3>Create Product</h3>

      {/* NAME */}

      <div style={{ marginBottom: 10 }}>

        <div>Name</div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: "100%" }}
        />

        {suggestions.length > 0 && (

          <div
            style={{
              border: "1px solid #ccc",
              background: "#f9f9f9",
              padding: 8,
              marginTop: 5
            }}
          >

            <div style={{ fontSize: 12, marginBottom: 5 }}>
              Similar products:
            </div>

            {suggestions.map(p => (

              <div
                key={p.product_id}
                style={{
                  fontSize: 13,
                  padding: "2px 0"
                }}
              >
                {p.name}
              </div>

            ))}

          </div>

        )}

      </div>

      {/* INITIAL STOCK */}

      <div style={{ marginBottom: 10 }}>

        <div>Initial Stock</div>

        <input
          type="number"
          value={initialStock}
          onChange={(e) => setInitialStock(Number(e.target.value))}
        />

      </div>

      {/* COST */}

      <div style={{ marginBottom: 10 }}>

        <div>Cost</div>

        <input
          type="number"
          step="0.01"
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
        />

      </div>

      {/* PRICE */}

      <div style={{ marginBottom: 10 }}>

        <div>Price</div>

        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
        />

      </div>

      {/* LOW STOCK */}

      <div style={{ marginBottom: 10 }}>

        <div>Low Stock Threshold</div>

        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
        />

      </div>

      {/* TRACKS STOCK */}

      <div style={{ marginBottom: 10 }}>

        <label>

          <input
            type="checkbox"
            checked={tracksStock}
            onChange={(e) => setTracksStock(e.target.checked)}
          />

          Tracks Stock

        </label>

      </div>

      <button onClick={createProduct}>
        Create Product
      </button>

    </div>

  );

}




function PriceChange({ storeId }) {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [cost, setCost] = useState(0);
  const [price, setPrice] = useState(0);

  const searchProducts = async (term) => {

    const res = await axios.get(
      "https://vendr-onkr.onrender.com/products/search",
      {
        params: {
          store_id: storeId,
          name: term
        }
      }
    );

    setProducts(res.data.products || []);

  };

  const selectProduct = (p) => {

    setSelected(p);
    setCost(p.cost || 0);
    setPrice(p.price || 0);

  };

  const submitPriceChange = async () => {

    if (!selected) return;

    await axios.post(
      "https://vendr-onkr.onrender.com/price-change",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          cost: cost,
          price: price
        }
      }
    );

    alert("Price updated");

    setSelected(null);
    setSearch("");
    setProducts([]);

  };

  return (

    <div style={{ maxWidth: 400 }}>

      <h3>Price Change</h3>

      {/* SEARCH */}

      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          if (val.length > 1) searchProducts(val);
        }}
        style={{ width: "100%", marginBottom: 10 }}
      />

      {/* SEARCH RESULTS */}

      {!selected && products.map(p => (

        <div
          key={p.product_id}
          onClick={() => selectProduct(p)}
          style={{
            padding: 8,
            border: "1px solid #ccc",
            marginBottom: 5,
            cursor: "pointer"
          }}
        >
          {p.name}
        </div>

      ))}

      {/* SELECTED PRODUCT */}

      {selected && (

        <div>

          <div style={{ marginBottom: 10 }}>
            <b>{selected.name}</b>
          </div>

          <div style={{ marginBottom: 10 }}>
            Cost
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            Price
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>

          <button onClick={submitPriceChange}>
            Save Price Change
          </button>

        </div>

      )}

    </div>

  );

}

function LogLoss({ storeId }) {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const searchProducts = async (term) => {

    const res = await axios.get(
      "https://vendr-onkr.onrender.com/products/search",
      {
        params: {
          store_id: storeId,
          name: term
        }
      }
    );

    setProducts(res.data.products || []);

  };

  const selectProduct = (p) => {
    setSelected(p);
  };

  const submitLoss = async () => {

    if (!selected) return;

    await axios.post(
      "https://vendr-onkr.onrender.com/loss",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          quantity: quantity
        }
      }
    );

    alert("Loss recorded");

    setSelected(null);
    setSearch("");
    setProducts([]);
    setQuantity(1);

  };

  return (

    <div style={{ maxWidth: 400 }}>

      <h3>Log Loss</h3>

      {/* SEARCH */}

      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          if (val.length > 1) searchProducts(val);
        }}
        style={{ width: "100%", marginBottom: 10 }}
      />

      {/* SEARCH RESULTS */}

      {!selected && products.map(p => (

        <div
          key={p.product_id}
          onClick={() => selectProduct(p)}
          style={{
            padding: 8,
            border: "1px solid #ccc",
            marginBottom: 5,
            cursor: "pointer"
          }}
        >
          {p.name} (Stock: {p.stock})
        </div>

      ))}

      {/* SELECTED PRODUCT */}

      {selected && (

        <div>

          <div style={{ marginBottom: 10 }}>
            <b>{selected.name}</b>
          </div>

          <div style={{ marginBottom: 10 }}>
            Quantity Lost
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </div>

          <button onClick={submitLoss}>
            Record Loss
          </button>

        </div>

      )}

    </div>

  );

}


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
      {
        params: {
          store_id: storeId,
          name: term
        }
      }
    );

    setProducts(res.data.products || []);

  };

  const selectProduct = (p) => {

    setSelected(p);
    setName(p.name);
    setThreshold(p.low_stock_threshold || 0);
    setTracksStock(p.tracks_stock ?? true);

  };

  const saveChanges = async () => {

    if (!selected) return;

    await axios.post(
      "https://vendr-onkr.onrender.com/edit-product",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          name: name,
          low_stock_threshold: threshold,
          tracks_stock: tracksStock
        }
      }
    );

    alert("Product updated");

    setSelected(null);
    setSearch("");
    setProducts([]);

  };

  return (

    <div style={{ maxWidth: 400 }}>

      <h3>Edit Product Details</h3>

      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          if (val.length > 1) searchProducts(val);
        }}
        style={{ width: "100%", marginBottom: 10 }}
      />

      {!selected && products.map(p => (

        <div
          key={p.product_id}
          onClick={() => selectProduct(p)}
          style={{
            padding: 8,
            border: "1px solid #ccc",
            marginBottom: 5,
            cursor: "pointer"
          }}
        >
          {p.name}
        </div>

      ))}

      {selected && (

        <div>

          <div style={{ marginBottom: 10 }}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            Low Stock Threshold
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
            />
          </div>

          <div style={{ marginBottom: 10 }}>
            <label>
              <input
                type="checkbox"
                checked={tracksStock}
                onChange={(e) => setTracksStock(e.target.checked)}
              />
              Tracks Stock
            </label>
          </div>

          <button onClick={saveChanges}>
            Save Changes
          </button>

        </div>

      )}

    </div>

  );

}

function ArchiveProduct({ storeId }) {

  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);

  const searchProducts = async (term) => {

    const res = await axios.get(
      "https://vendr-onkr.onrender.com/products/search",
      {
        params: {
          store_id: storeId,
          name: term,
          include_inactive: true
        }
      }
    );

    setProducts(res.data.products || []);

  };

  const selectProduct = (p) => {
    setSelected(p);
  };

  const toggleArchive = async (active) => {

    await axios.post(
      "https://vendr-onkr.onrender.com/archive-product",
      null,
      {
        params: {
          store_id: storeId,
          product_id: selected.product_id,
          is_active: active
        }
      }
    );

    alert(active ? "Product reactivated" : "Product archived");

    setSelected(null);
    setSearch("");
    setProducts([]);

  };

  return (

    <div style={{ maxWidth: 400 }}>

      <h3>Archive / Reactivate Product</h3>

      <input
        placeholder="Search product..."
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          if (val.length > 1) searchProducts(val);
        }}
        style={{ width: "100%", marginBottom: 10 }}
      />

      {!selected && products.map(p => (

        <div
          key={p.product_id}
          onClick={() => selectProduct(p)}
          style={{
            padding: 8,
            border: "1px solid #ccc",
            marginBottom: 5,
            cursor: "pointer"
          }}
        >
          <div
            key={p.product_id}
            onClick={() => selectProduct(p)}
            style={{
              padding: 8,
              border: "1px solid #ccc",
              marginBottom: 5,
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between",
              color: p.is_active ? "inherit" : "#888"
            }}
           >

            <span>{p.name}</span>

            {!p.is_active && (
              <span style={{ fontSize: 12 }}>
                Archived
              </span>
            )}

          </div>
        </div>

      ))}

      {selected && (

        <div>

          <div style={{ marginBottom: 10 }}>
            <b>{selected.name}</b>
          </div>

          <button onClick={() => toggleArchive(false)}>
            Archive Product
          </button>

          <button
            onClick={() => toggleArchive(true)}
            style={{ marginLeft: 10 }}
          >
            Reactivate
          </button>

        </div>

      )}

    </div>

  );

}

function ImportProducts({ storeId }) {

  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);

  const handleFile = async (e) => {

    const uploaded = e.target.files[0];
    if (!uploaded) return;

    setFile(uploaded);

    const text = await uploaded.text();

    const lines = text.split("\n");

    const parsed = lines.map(line =>
      line.split(",")
    );

    setRows(parsed);

  };

  return (

    <div style={{ maxWidth: 800 }}>

      <h3>Import Products</h3>

      <input
        type="file"
        accept=".csv"
        onChange={handleFile}
      />

      {rows.length > 0 && (

        <div style={{ marginTop: 20 }}>

          <h4>Preview</h4>

          <table
            style={{
              borderCollapse: "collapse",
              width: "100%"
            }}
          >

            <tbody>

              {rows.slice(0,10).map((row, i) => (

                <tr key={i}>

                  {row.map((cell, j) => (

                    <td
                      key={j}
                      style={{
                        border: "1px solid #ccc",
                        padding: 5
                      }}
                    >
                      {cell}
                    </td>

                  ))}

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

}
export default ProductManagement;