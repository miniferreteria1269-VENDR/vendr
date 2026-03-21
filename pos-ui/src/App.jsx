
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

  // -----------------------------
  // STATE (ALL HOOKS FIRST)
  // -----------------------------

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
  const handleLogout = () => {
    localStorage.removeItem("user");

    // optional cleanup (recommended)
    localStorage.removeItem("tickets");
    localStorage.removeItem("activeTicket");

    setUser(null);
  };


  // -----------------------------
  // LOAD USER FROM STORAGE
  // -----------------------------

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  // -----------------------------
  // SAFE DERIVED VALUES
  // -----------------------------

  const storeId = user?.store_id;
  const currentTicket = tickets.find(t => t.id === activeTicket);

  // -----------------------------
  // LOCAL STORAGE SYNC
  // -----------------------------

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

      const sorted = (res.data.products || []).sort((a, b) =>
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
        params: {
          store_id: storeId,
          name: term
        }
      });

      setProducts(res.data.products);

    } catch (err) {
      console.error("Search error:", err);
    }
  };

  // -----------------------------
  // TICKET ACTIONS
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

  const addItem = (product) => {
    if (!currentTicket) return;

    const updated = tickets.map(ticket => {
      if (ticket.id !== activeTicket) return ticket;

      const existing = ticket.items.find(
        i => i.product_id === product.product_id
      );

      if (existing) {
        return {
          ...ticket,
          items: ticket.items.map(i =>
            i.product_id === product.product_id
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
            product_id: product.product_id,
            name: product.name,
            quantity: 1,
            cost: product.cost || 0,
            price: product.price
          }
        ]
      };
    });

    setTickets(updated);
    setSearchTerm("");
  };

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

  const updateItemField = (index, field, value) => {
    setTickets(prev =>
      prev.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              items: ticket.items.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
              )
            }
          : ticket
      )
    );
  };

  const renameTicket = (ticketId) => {
    console.log("RENAME CLICKED", ticketId);

    const newLabel = prompt("Ticket label:");
    if (!newLabel) return;

    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId ? { ...t, label: newLabel } : t
      )
    );
  };

  const cancelTicket = () => {
    const remaining = tickets.filter(t => t.id !== activeTicket);

    setTickets(remaining);

    if (remaining.length > 0) {
      setActiveTicket(remaining[0].id);
    } else {
      setActiveTicket(null);
    }
  };

  const finalizeSale = async () => {
    if (!currentTicket || currentTicket.items.length === 0) return;

    try {
      await axios.post(`${API}/sale-ticket`, {
        store_id: storeId,
        
        items: currentTicket.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity
        }))
      });

      setTickets(prev => prev.filter(t => t.id !== activeTicket));
      setActiveTicket(null);
      loadProducts();

    } catch (err) {
      console.error("Sale error:", err);
      alert("Sale failed");
    }
  }; // ✅ CLOSE finalizeSale properly


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
  // LOGIN GATES (AFTER HOOKS)
  // -----------------------------

  if (!user) {
    return (
      <div>
        {authMode === "login" ? (
          <Login
            onLogin={setUser}
            switchToSignup={() => setAuthMode("signup")}
          />
        ) : (
          <Signup
            onSignup={setUser}
            switchToLogin={() => setAuthMode("login")}
          />
        )}
      </div>
  
    );
  }
  if (!storeId) {
    return <div>Loading...</div>;
  }

  // -----------------------------
  // UI
  // -----------------------------

  return (
    <div style={{ fontFamily: "Arial", height: "100vh" }}>

      {/* HEADER */}
      <div style={{
        padding: 10,
        fontWeight: "bold",
        fontSize: 18,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          {user.store_name || `Store ${storeId}`}
        </div>

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>      

      {/* NAV */}
      <div style={{ padding: 10 }}>
        <button onClick={() => setView("pos")}>POS</button>
        <button onClick={() => setView("sales")}>Sales</button>
        <button onClick={() => setView("inventory")}>Inventory</button>
        <button onClick={() => setView("products")}>Products</button>
        <button onClick={() => setView("analysis")}>Analysis</button>
        <button onClick={() => setView("cash")}>Cash</button>
      </div>

      {/* VIEWS */}
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
          />
        </div>
      )}

      {view === "sales" && <SalesHistoryPanel storeId={storeId} />}
      {view === "inventory" && <InventoryReport storeId={storeId} />}
      {view === "products" && <ProductManagement storeId={storeId} />}
      {view === "analysis" && <SalesAnalysisPanel storeId={storeId} />}
      {view === "cash" && <CashPanel storeId={storeId} />}
    </div>
  );
}

export default App;