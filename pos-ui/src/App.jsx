import { useState, useEffect } from "react";
import axios from "axios";
import Login from "./Login";
import Signup from "./Signup";
import ProductPanel from "./components/ProductPanel";
import TicketPanel from "./components/TicketPanel";
import SalesHistoryPanel from "./components/SalesHistoryPanel";
import InventoryReport from "./components/InventoryReport";
import ProductManagement from "./components/ProductManagement";
import SalesAnalysisPanel from "./components/SalesAnalysisPanel";
import CashPanel from "./components/CashPanel";

const API = "https://vendr-onkr.onrender.com";

function App() {

  const [user, setUser] = useState(null);
  const [view, setView] = useState("pos");
  const [authMode, setAuthMode] = useState("login");

  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem("tickets");
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTicket, setActiveTicket] = useState(() => {
    const saved = localStorage.getItem("activeTicket");
    return saved ? Number(saved) : null;
  });

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [intakePaid, setIntakePaid] = useState(false);

  // 🔥 DISCOUNT STATE
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("percent");

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("tickets");
    localStorage.removeItem("activeTicket");
    setUser(null);
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const storeId = user?.store_id;
  const currentTicket = tickets.find(t => t.id === activeTicket);

  useEffect(() => {
    localStorage.setItem("tickets", JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    if (activeTicket !== null) {
      localStorage.setItem("activeTicket", activeTicket);
    }
  }, [activeTicket]);

  // -----------------------------
  // LOAD PRODUCTS
  // -----------------------------
  const loadProducts = async () => {
    if (!storeId) return;

    try {
      const res = await axios.get(`${API}/products`, {
        params: { store_id: storeId }
      });

      const data = res.data.products ?? res.data;

      const sorted = data.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );

      setProducts(sorted);

    } catch (err) {
      console.error("Load products error:", err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [storeId]);

  // -----------------------------
  // SEARCH
  // -----------------------------
  useEffect(() => {
    const delay = setTimeout(() => {
      if (!storeId) return;

      if (searchTerm.trim() === "") {
        loadProducts();
      } else {
        searchProducts(searchTerm);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  const searchProducts = async (term) => {
    try {
      const res = await axios.get(`${API}/products/search`, {
        params: { store_id: storeId, name: term }
      });

      const data = res.data.products ?? res.data;
      setProducts(data);

    } catch (err) {
      console.error("Search error:", err);
    }
  };

  // -----------------------------
  // TICKETS
  // -----------------------------
  const createTicket = (type) => {
    const ticket = {
      id: Date.now(),
      type,
      label: "",
      items: []
    };
  
    setTickets(prev => [...prev, ticket]);
    setActiveTicket(ticket.id);
  };


  // ✅ MOVE THIS OUTSIDE
  const removeItem = (index) => {
    setTickets(prev =>
      prev.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              items: ticket.items.filter((_, i) => i !== index)
            }
          : ticket
      )
    );
  };


  const addItem = (product) => {
    if (!currentTicket) return;

    const fullProduct = products.find(
      p => p.product_id === product.product_id
    ) || product;

    const updated = tickets.map(ticket => {
      if (ticket.id !== activeTicket) return ticket;

      const existing = ticket.items.find(
        i => i.product_id === fullProduct.product_id
      );

      if (existing) {
        return {
          ...ticket,
          items: ticket.items.map(i =>
            i.product_id === fullProduct.product_id
              ? { ...i, quantity: i.quantity + 1 }
              : i
          )
        };
      }

      return {
        ...ticket,
        items: [
          ...ticket.items,
          {
            product_id: fullProduct.product_id,
            name: fullProduct.name,
            quantity: 1,
            cost: fullProduct.cost ?? 0,
            price: fullProduct.price
          }
        ]
      };
    });

    setTickets(updated);
    setSearchTerm("");
  };
  // -----------------------------
  // 🔥 FINALIZE SALE (FIXED)
  // -----------------------------
  const finalizeSale = async () => {
    if (!currentTicket || currentTicket.items.length === 0) return;

    try {

      // 🔥 CALCULATE SUBTOTAL
      const subtotal = currentTicket.items.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      // 🔥 CALCULATE DISCOUNT
      let discountAmount = 0;

      if (discountType === "percent") {
        discountAmount = subtotal * (discountValue / 100);
      } else {
        discountAmount = discountValue;
      }

      // 🔥 CONVERT TO RATIO
      const discountRatio =
        subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;

      // 🔥 APPLY DISCOUNT PER ITEM
      const discountedItems = currentTicket.items.map(i => ({
        product_id: i.product_id,
        quantity: i.quantity,
        price: i.price * discountRatio
      }));

      await axios.post(`${API}/sale-ticket`, {
        store_id: storeId,
        items: discountedItems
      });

      setTickets(prev => prev.filter(t => t.id !== activeTicket));
      setActiveTicket(null);

      // 🔥 RESET DISCOUNT
      setDiscountValue(0);
      setDiscountType("percent");

      loadProducts();

    } catch (err) {
      console.error("Sale error:", err);
      alert("Sale failed");
    }
  };

  // -----------------------------
  // FINALIZE INTAKE
  // -----------------------------
  const finalizeIntake = async () => {
    if (!currentTicket || currentTicket.items.length === 0) return;

    try {
      await axios.post(`${API}/intake-ticket`, {
        store_id: storeId,
        paid: intakePaid,
        items: currentTicket.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          cost: i.cost,
          price: i.price
        }))
      });

      setTickets(prev => prev.filter(t => t.id !== activeTicket));
      setActiveTicket(null);
      loadProducts();

    } catch (err) {
      console.error("Intake error:", err);
      alert("Intake failed");
    }
  };

  // -----------------------------
  // LOGIN UI
  // -----------------------------
  if (!user) {
    return authMode === "login" ? (
      <Login onLogin={setUser} switchToSignup={() => setAuthMode("signup")} />
    ) : (
      <Signup onSignup={setUser} switchToLogin={() => setAuthMode("login")} />
    );
  }

  if (!storeId) return <div>Loading...</div>;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{ fontFamily: "Arial", height: "100vh" }}>

      <div style={{ padding: 10, display: "flex", justifyContent: "space-between" }}>
        <div>{user.store_name || `Store ${storeId}`}</div>
        <button onClick={handleLogout}>Logout</button>
      </div>

      <div style={{ padding: 10 }}>
        <button onClick={() => setView("pos")}>POS</button>
        <button onClick={() => setView("sales")}>Sales</button>
        <button onClick={() => setView("inventory")}>Inventory</button>
        <button onClick={() => setView("products")}>Products</button>
        <button onClick={() => setView("analysis")}>Analysis</button>
        <button onClick={() => setView("cash")}>Cash</button>
      </div>

      {view === "pos" && (
        <div style={{ display: "flex", height: "100%" }}>
          <ProductPanel
            products={products}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            addItem={addItem}
            storeId={storeId}
          />

          <TicketPanel
            tickets={tickets}
            activeTicket={activeTicket}
            setActiveTicket={setActiveTicket}
            currentTicket={currentTicket}
            createTicket={createTicket}
            removeItem={removeItem}
            updateItemField={updateItemField}
            cancelTicket={cancelTicket}
            renameTicket={renameTicket}
            finalizeSale={finalizeSale}
            finalizeIntake={finalizeIntake}
            intakePaid={intakePaid}
            setIntakePaid={setIntakePaid}

            // 🔥 PASS DISCOUNT
            discountValue={discountValue}
            setDiscountValue={setDiscountValue}
            discountType={discountType}
            setDiscountType={setDiscountType}
          />
        </div>
      )}

      {view === "sales" && <SalesHistoryPanel storeId={storeId} />}
      {view === "inventory" && <InventoryReport storeId={storeId} />}
      {view === "products" && <ProductManagement storeId={storeId} />}
      {view === "analysis" && <SalesAnalysisPanel storeId={storeId} />}
      {view === "cash" && <CashPanel storeId={storeId} products={products} />}

    </div>
  );
}

export default App;