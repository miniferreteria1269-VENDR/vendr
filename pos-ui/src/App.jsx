import { useState, useEffect } from "react";
import { useLang } from "./LanguageContext";
import axios from "axios";
import Login from "./Login";
import Signup from "./Signup";
import ProductPanel from "./components/ProductPanel";
import TicketPanel from "./components/TicketPanel";
import HistoryPanel from "./components/HistoryPanel";
import InventoryReport from "./components/InventoryReport";
import ProductDiagnostics from "./components/ProductDiagnostics";
import ProductManagement from "./components/ProductManagement";
import SalesAnalysisPanel from "./components/SalesAnalysisPanel";
import {
  savePendingSale,
  submitPendingSale
} from "./offlineSales";
import CashPanel from "./components/CashPanel";

const API = "https://vendr-onkr.onrender.com";
const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("vendr_device_id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("vendr_device_id", deviceId);
  }

  return deviceId;
};

// 🎨 GLOBAL COLOR SYSTEM (Halo + Toast hybrid)
const COLORS = {
  bg: "#0f1115",
  panel: "#1a1d24",
  panelAlt: "#222733",
  border: "#2f3542",

  text: "#e6edf3",
  textDim: "#9da7b3",

  primary: "#3aa0ff",
  primaryDark: "#1f6feb",

  danger: "#ff5c5c"
};

function App() {

  const { t } = useLang();

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
    } else {
      localStorage.removeItem("activeTicket");
    }
  }, [activeTicket]);

  // -----------------------------
  // PRODUCTS
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
      console.error(err);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [storeId]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (!storeId) return;

      if (!searchTerm.trim()) loadProducts();
      else searchProducts(searchTerm);
    }, 300);

    return () => clearTimeout(delay);
  }, [searchTerm]);

  const searchProducts = async (term) => {
    try {
      const res = await axios.get(`${API}/products/search`, {
        params: { store_id: storeId, name: term }
      });

      setProducts(res.data.products ?? res.data);

    } catch (err) {
      console.error(err);
    }
  };

  // -----------------------------
  // TICKETS (UNCHANGED)
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

  const removeItem = (index) => {
    setTickets(prev =>
      prev.map(ticket =>
        ticket.id === activeTicket
          ? { ...ticket, items: ticket.items.filter((_, i) => i !== index) }
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

  const cancelTicket = () => {
    const remaining = tickets.filter(t => t.id !== activeTicket);
    setTickets(remaining);
    setActiveTicket(remaining.length ? remaining[0].id : null);
  };

  const renameTicket = (ticketId) => {
    const newLabel = prompt(t("ticket_name_prompt"));
    if (!newLabel) return;

    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId ? { ...t, label: newLabel } : t
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

  const finalizeSale = async () => {
    if (!currentTicket || currentTicket.items.length === 0) return;

    const subtotal = currentTicket.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const discountAmount =
      discountType === "percent"
        ? subtotal * (discountValue / 100)
        : discountValue;

    const ratio =
      subtotal > 0
        ? (subtotal - discountAmount) / subtotal
        : 1;

    const items = currentTicket.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price * ratio
    }));

    const clientEventId =
      currentTicket.client_event_id || crypto.randomUUID();

    const clientCreatedAt =
      currentTicket.client_created_at || new Date().toISOString();

    const salePayload = {
      store_id: storeId,
      items,
      client_event_id: clientEventId,
      device_id: getOrCreateDeviceId(),
      client_created_at: clientCreatedAt
    };

    // Preserve the same transaction identity before sending.
    setTickets(prev =>
      prev.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              client_event_id: clientEventId,
              client_created_at: clientCreatedAt
            }
          : ticket
      )
    );

    try {
      await savePendingSale(salePayload);

      const responseData = await submitPendingSale(salePayload);

      if (
        responseData.status !== "accepted" &&
        responseData.status !== "already_processed"
      ) {
        throw new Error(
          `Unexpected sale status: ${responseData.status}`
        );
      }

      setTickets(prev =>
        prev.filter(ticket => ticket.id !== activeTicket)
      );

      setActiveTicket(null);
      setDiscountValue(0);
      setDiscountType("percent");

      loadProducts();

    } catch (err) {
      console.error("SALE ERROR:", err);
      alert(t("sale_failed"));
    }
  };
  
  const finalizeIntake = async () => {
   if (!currentTicket || currentTicket.items.length === 0) return;

    try {
      const items = currentTicket.items.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        cost: item.cost,
        price: item.price
      }));

      await axios.post(`${API}/intake-ticket`, {
        store_id: storeId,
        items,
        paid: intakePaid
      });

      setTickets(prev =>
        prev.filter(ticket => ticket.id !== activeTicket)
      );

      setActiveTicket(null);
      setIntakePaid(false);

      loadProducts();

    } catch (err) {
      console.error("INTAKE ERROR:", err);
      alert(t("intake_failed"));
    }
  };
  // -----------------------------
  // AUTH
  // -----------------------------
  if (!user) {
    return authMode === "login"
      ? <Login onLogin={setUser} switchToSignup={() => setAuthMode("signup")} />
      : <Signup onSignup={setUser} switchToLogin={() => setAuthMode("login")} />;
  }

  if (!storeId) return <div style={{ color: COLORS.text }}>{t("loading")}</div>;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div style={{
      fontFamily: "system-ui, -apple-system, sans-serif",
      background: COLORS.bg,
      color: COLORS.text,
      width: "100vw",
      height: "100dvh",
      minHeight: "100dvh",
      overflow: "hidden",
      display: "flex",
      flexDirection: "column"
    }}>

      {/* HEADER */}
      <div style={{
        padding: 12,
        display: "flex",
        justifyContent: "space-between",
        borderBottom: `1px solid ${COLORS.border}`
      }}>
        <div>{user.store_name || `${t("store")} ${storeId}`}</div>
        <button
          onClick={handleLogout}
          style={{
            background: COLORS.panelAlt,
            border: "none",
            color: COLORS.text,
            padding: "6px 10px",
            borderRadius: 6
          }}
        >
          {t("logout")}
        </button>
      </div>

      {/* NAV */}
      <div style={{
        padding: 10,
        display: "flex",
        gap: 8,
        borderBottom: `1px solid ${COLORS.border}`
      }}>
        {["pos", "sales", "inventory", "products", "analysis", "diagnostics", "cash"].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              background: view === v ? COLORS.primary : COLORS.panelAlt,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            {t(v === "sales" ? "history" : v).toUpperCase()}
          </button>
        ))}
      </div>

      {view === "pos" && (
        <div style={{
          display: "flex",
          flex: 1,
          overflow: "hidden",
          gap: 12,
          padding: 12
        }}>
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
            discountValue={discountValue}
            setDiscountValue={setDiscountValue}
            discountType={discountType}
            setDiscountType={setDiscountType}
          />
        </div>
      )}

      {view === "sales" && (
        <HistoryPanel storeId={storeId} />
      )}
      {view === "inventory" && <InventoryReport storeId={storeId} />}
      {view === "diagnostics" && (
        <ProductDiagnostics storeId={storeId} />
      )}
      {view === "products" && <ProductManagement storeId={storeId} />}
      {view === "analysis" && <SalesAnalysisPanel storeId={storeId} />}
      {view === "cash" && <CashPanel storeId={storeId} products={products} />}

    </div>
  );
}

export default App;
