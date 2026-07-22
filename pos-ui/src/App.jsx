import { useEffect, useState } from "react";
import axios from "axios";

import { useLang } from "./LanguageContext";
import Login from "./Login";
import Signup from "./Signup";

import ProductPanel from "./components/ProductPanel";
import TicketPanel from "./components/TicketPanel";
import HistoryPanel from "./components/HistoryPanel";
import InventoryReport from "./components/InventoryReport";
import ProductDiagnostics from "./components/ProductDiagnostics";
import ProductManagement from "./components/ProductManagement";
import SalesAnalysisPanel from "./components/SalesAnalysisPanel";
import CashPanel from "./components/CashPanel";
import {
  cacheProducts,
  getCachedProducts,
  searchCachedProducts,
  applyLocalSaleToCatalog
} from "./offlineCatalog";

import {
  savePendingEvent,
  submitPendingEvent,
  migratePendingSalesToEvents
} from "./offlineEvents";

import {
  syncPendingEvents
} from "./syncPendingEvents";



const API = "https://vendr-onkr.onrender.com";

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("vendr_device_id");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("vendr_device_id", deviceId);
  }

  return deviceId;
};

// Global color system
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

    try {
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Unable to load saved tickets:", error);
      return [];
    }
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

  const storeId = user?.store_id;

  const currentTicket = tickets.find(
    ticket => ticket.id === activeTicket
  );

  // -------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("tickets");
    localStorage.removeItem("activeTicket");

    setUser(null);
    setTickets([]);
    setActiveTicket(null);
  };

  useEffect(() => {
    const stored = localStorage.getItem("user");

    if (!stored) return;

    try {
      setUser(JSON.parse(stored));
    } catch (error) {
      console.error("Unable to load saved user:", error);
      localStorage.removeItem("user");
    }
  }, []);

  // -------------------------------------------------
  // LOCAL TICKET PERSISTENCE
  // -------------------------------------------------

  useEffect(() => {
    localStorage.setItem(
      "tickets",
      JSON.stringify(tickets)
    );
  }, [tickets]);

  useEffect(() => {
    if (activeTicket !== null) {
      localStorage.setItem(
        "activeTicket",
        String(activeTicket)
      );
    } else {
      localStorage.removeItem("activeTicket");
    }
  }, [activeTicket]);

  // -------------------------------------------------
  // PRODUCTS
  // -------------------------------------------------

  const loadProducts = async () => {
    if (!storeId) return;

    try {
      const response = await axios.get(
        `${API}/products`,
        {
          params: {
            store_id: storeId
          }
        }
      );

      const data =
        response.data.products ??
        response.data ??
        [];

      const sorted = [...data].sort(
        (a, b) =>
          a.name.localeCompare(
            b.name,
            undefined,
            {
              sensitivity: "base"
            }
          )
      );

      setProducts(sorted);

      await cacheProducts(
        storeId,
        sorted
      );
    } catch (error) {
      console.error(
        "PRODUCT LOAD ERROR:",
        error
      );

      try {
        const cached =
          await getCachedProducts(
            storeId
          );

        setProducts(cached);
      } catch (cacheError) {
        console.error(
          "CACHED PRODUCT LOAD ERROR:",
          cacheError
        );
      }
    }
  };

  const searchProducts = async term => {
    if (!storeId) return;

    try {
      const response = await axios.get(
        `${API}/products/search`,
        {
          params: {
            store_id: storeId,
            name: term
          }
       }
      );

      const data =
        response.data.products ??
        response.data ??
        [];

      setProducts(data);
    } catch (error) {
      console.error(
        "PRODUCT SEARCH ERROR:",
        error
      );

      try {
        const cachedResults =
          await searchCachedProducts(
            storeId,
            term
          );

        setProducts(cachedResults);
      } catch (cacheError) {
        console.error(
          "CACHED PRODUCT SEARCH ERROR:",
          cacheError
        );
      }
    }
  };
  useEffect(() => {
    loadProducts();
  }, [storeId]);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (!storeId) return;

      if (!searchTerm.trim()) {
        loadProducts();
      } else {
        searchProducts(searchTerm);
      }
    }, 300);

    return () => {
      clearTimeout(delay);
    };
  }, [searchTerm, storeId]);

  // -------------------------------------------------
  // PENDING-SALE SYNCHRONIZATION
  // -------------------------------------------------

  useEffect(() => {
    const runSync = async () => {
      if (!navigator.onLine || !storeId) {
        return;
      }

      try {
        // Move any legacy pendingSales records into
        // the new generic pendingEvents queue.
        const migrated =
          await migratePendingSalesToEvents();

        if (migrated > 0) {
          console.log(
            `Migrated ${migrated} legacy pending sale(s).`
          );
        }

        const results =
          await syncPendingEvents();

        if (results.synced > 0) {
          console.log(
            `Synced ${results.synced} pending event(s).`
          );

          const syncedIds = new Set(
            results.syncedClientEventIds
          );

          // At this stage, every generic event being synced
          // is still a sale, so matching open sale tickets
          // can be safely removed.
          setTickets(previousTickets => {
            const remainingTickets =
              previousTickets.filter(
                ticket =>
                  !ticket.client_event_id ||
                 !syncedIds.has(
                    ticket.client_event_id
                  )
              );

            setActiveTicket(
              previousActiveTicket => {
                const activeStillExists =
                  remainingTickets.some(
                    ticket =>
                      ticket.id ===
                      previousActiveTicket
                  );

                if (activeStillExists) {
                  return previousActiveTicket;
                }

                return remainingTickets.length > 0
                  ? remainingTickets[0].id
                  : null;
              }
            );

            return remainingTickets;
          });

          await loadProducts();
        }

        if (results.failed > 0) {
          console.warn(
            `${results.failed} pending event(s) could not be synchronized.`
          );
        }
      } catch (error) {
        console.error(
          "PENDING EVENTS SYNC ERROR:",
          error
        );
      }
    };

    runSync();

    window.addEventListener(
      "online",
      runSync
    );

    return () => {
      window.removeEventListener(
        "online",
        runSync
      );
    };
  }, [storeId]);

  // -------------------------------------------------
  // TICKETS
  // -------------------------------------------------

  const createTicket = type => {
    const ticket = {
      id: Date.now(),
      type,
      label: "",
      items: []
    };

    setTickets(previous => [
      ...previous,
      ticket
    ]);

    setActiveTicket(ticket.id);
  };

  const removeItem = index => {
    setTickets(previous =>
      previous.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              items: ticket.items.filter(
                (_, itemIndex) =>
                  itemIndex !== index
              )
            }
          : ticket
      )
    );
  };

  const updateItemField = (
    index,
    field,
    value
  ) => {
    setTickets(previous =>
      previous.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              items: ticket.items.map(
                (item, itemIndex) =>
                  itemIndex === index
                    ? {
                        ...item,
                        [field]: value
                      }
                    : item
              )
            }
          : ticket
      )
    );
  };

  const cancelTicket = () => {
    const remaining = tickets.filter(
      ticket =>
        ticket.id !== activeTicket
    );

    setTickets(remaining);

    setActiveTicket(
      remaining.length
        ? remaining[0].id
        : null
    );
  };

  const renameTicket = ticketId => {
    const newLabel = prompt(
      t("ticket_name_prompt")
    );

    if (!newLabel) return;

    setTickets(previous =>
      previous.map(ticket =>
        ticket.id === ticketId
          ? {
              ...ticket,
              label: newLabel
            }
          : ticket
      )
    );
  };

  const addItem = product => {
    if (!currentTicket) return;

    const fullProduct =
      products.find(
        item =>
          item.product_id ===
          product.product_id
      ) || product;

    const updated = tickets.map(ticket => {
      if (ticket.id !== activeTicket) {
        return ticket;
      }

      const existing =
        ticket.items.find(
          item =>
            item.product_id ===
            fullProduct.product_id
        );

      if (existing) {
        return {
          ...ticket,
          items: ticket.items.map(item =>
            item.product_id ===
            fullProduct.product_id
              ? {
                  ...item,
                  quantity:
                    item.quantity + 1
                }
              : item
          )
        };
      }

      return {
        ...ticket,
        items: [
          ...ticket.items,
          {
            product_id:
              fullProduct.product_id,
            name: fullProduct.name,
            quantity: 1,
            cost:
              fullProduct.cost ?? 0,
            price: fullProduct.price
          }
        ]
      };
    });

    setTickets(updated);
    setSearchTerm("");
  };

  // -------------------------------------------------
  // FINALIZE SALE
  // -------------------------------------------------

  const finalizeSale = async () => {
    if (
      !currentTicket ||
      currentTicket.items.length === 0
    ) {
      return;
    }

    const subtotal =
      currentTicket.items.reduce(
        (sum, item) =>
          sum +
          Number(item.price) *
            Number(item.quantity),
        0
      );

    const numericDiscount =
      Number(discountValue) || 0;

    const discountAmount =
      discountType === "percent"
        ? subtotal *
          (numericDiscount / 100)
        : numericDiscount;

    const discountedTotal = Math.max(
      subtotal - discountAmount,
      0
    );

    const ratio =
      subtotal > 0
        ? discountedTotal / subtotal
        : 1;

    const items =
      currentTicket.items.map(item => ({
        product_id: item.product_id,
        quantity: Number(item.quantity),
        price:
          Number(item.price) * ratio
      }));

    const clientEventId =
      currentTicket.client_event_id ||
      crypto.randomUUID();

    const clientCreatedAt =
      currentTicket.client_created_at ||
      new Date().toISOString();

    const salePayload = {
      store_id: storeId,
      items,
      client_event_id: clientEventId,
      device_id: getOrCreateDeviceId(),
      client_created_at: clientCreatedAt
    };

    const pendingEvent = {
      client_event_id: clientEventId,
      event_type: "sale",
      store_id: storeId,
      device_id:
        salePayload.device_id,
      client_created_at:
        clientCreatedAt,
      payload: salePayload
    };

    // Preserve the transaction identity before
    // performing local or network operations.
    setTickets(previous =>
      previous.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              client_event_id:
                clientEventId,
              client_created_at:
                clientCreatedAt
            }
          : ticket
      )
    );

    let saleSavedLocally = false;

    try {
      const saveResult =
        await savePendingEvent(
          pendingEvent
        );

      saleSavedLocally = true;

      /*
       * Apply the local inventory change only when
       * this event was newly inserted.
       *
       * If the same ticket is retried or double-clicked,
       * saveResult.created is false and stock must not
       * be reduced locally a second time.
       */
      if (saveResult.created) {
        await applyLocalSaleToCatalog(
          storeId,
          items
        );

        setProducts(previousProducts =>
          previousProducts.map(product => {
            const soldItem = items.find(
              item =>
                item.product_id ===
                product.product_id
            );

            if (
              !soldItem ||
              product.tracks_stock !== 1
            ) {
              return product;
            }

            return {
              ...product,
              stock:
                Number(product.stock || 0) -
                Number(
                  soldItem.quantity || 0
                )
            };
          })
        );
      }

      const responseData =
        await submitPendingEvent(
          pendingEvent
        );

      if (
        responseData.status !==
          "accepted" &&
        responseData.status !==
          "already_processed"
      ) {
        throw new Error(
          `Unexpected sale status: ${responseData.status}`
        );
      }

      setTickets(previous =>
        previous.filter(
          ticket =>
            ticket.id !== activeTicket
        )
      );

      setActiveTicket(null);
      setDiscountValue(0);
      setDiscountType("percent");

      await loadProducts();

    } catch (error) {
      console.error(
        "SALE ERROR:",
        error
      );

      if (saleSavedLocally) {
        alert(
          t("sale_saved_pending")
        );
      } else {
        alert(
          t("sale_save_failed")
        );
      }
    }
  };

  
  // -------------------------------------------------
  // FINALIZE INTAKE
  // -------------------------------------------------

  const finalizeIntake = async () => {
    if (
      !currentTicket ||
      currentTicket.items.length === 0
    ) {
      return;
    }

    try {
      const items =
        currentTicket.items.map(item => ({
          product_id:
            item.product_id,
          quantity:
            Number(item.quantity),
          cost:
            Number(item.cost),
          price:
            Number(item.price)
        }));

      await axios.post(
        `${API}/intake-ticket`,
        {
          store_id: storeId,
          items,
          paid: intakePaid
        }
      );

      setTickets(previous =>
        previous.filter(
          ticket =>
            ticket.id !==
            activeTicket
        )
      );

      setActiveTicket(null);
      setIntakePaid(false);

      await loadProducts();
    } catch (error) {
      console.error(
        "INTAKE ERROR:",
        error
      );

      alert(t("intake_failed"));
    }
  };

  // -------------------------------------------------
  // AUTHENTICATION VIEW
  // -------------------------------------------------

  if (!user) {
    return authMode === "login" ? (
      <Login
        onLogin={setUser}
        switchToSignup={() =>
          setAuthMode("signup")
        }
      />
    ) : (
      <Signup
        onSignup={setUser}
        switchToLogin={() =>
          setAuthMode("login")
        }
      />
    );
  }

  if (!storeId) {
    return (
      <div
        style={{
          color: COLORS.text
        }}
      >
        {t("loading")}
      </div>
    );
  }

  // -------------------------------------------------
  // UI
  // -------------------------------------------------

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, sans-serif",
        background: COLORS.bg,
        color: COLORS.text,
        width: "100vw",
        height: "100dvh",
        minHeight: "100dvh",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: 12,
          display: "flex",
          justifyContent:
            "space-between",
          borderBottom:
            `1px solid ${COLORS.border}`
        }}
      >
        <div>
          {user.store_name ||
            `${t("store")} ${storeId}`}
        </div>

        <button
          onClick={handleLogout}
          style={{
            background:
              COLORS.panelAlt,
            border: "none",
            color: COLORS.text,
            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          {t("logout")}
        </button>
      </div>

      {/* NAVIGATION */}
      <div
        style={{
          padding: 10,
          display: "flex",
          gap: 8,
          borderBottom:
            `1px solid ${COLORS.border}`
        }}
      >
        {[
          "pos",
          "sales",
          "inventory",
          "products",
          "analysis",
          "diagnostics",
          "cash"
        ].map(navView => (
          <button
            key={navView}
            onClick={() =>
              setView(navView)
            }
            style={{
              background:
                view === navView
                  ? COLORS.primary
                  : COLORS.panelAlt,
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            {t(
              navView === "sales"
                ? "history"
                : navView
            ).toUpperCase()}
          </button>
        ))}
      </div>

      {/* POS */}
      {view === "pos" && (
        <div
          style={{
            display: "flex",
            flex: 1,
            overflow: "hidden",
            gap: 12,
            padding: 12
          }}
        >
          <ProductPanel
            products={products}
            searchTerm={searchTerm}
            setSearchTerm={
              setSearchTerm
            }
            addItem={addItem}
            storeId={storeId}
          />

          <TicketPanel
            tickets={tickets}
            activeTicket={
              activeTicket
            }
            setActiveTicket={
              setActiveTicket
            }
            currentTicket={
              currentTicket
            }
            createTicket={
              createTicket
            }
            removeItem={removeItem}
            updateItemField={
              updateItemField
            }
            cancelTicket={
              cancelTicket
            }
            renameTicket={
              renameTicket
            }
            finalizeSale={
              finalizeSale
            }
            finalizeIntake={
              finalizeIntake
            }
            intakePaid={intakePaid}
            setIntakePaid={
              setIntakePaid
            }
            discountValue={
              discountValue
            }
            setDiscountValue={
              setDiscountValue
            }
            discountType={
              discountType
            }
            setDiscountType={
              setDiscountType
            }
          />
        </div>
      )}

      {/* HISTORY */}
      {view === "sales" && (
        <HistoryPanel
          storeId={storeId}
        />
      )}

      {/* INVENTORY */}
      {view === "inventory" && (
        <InventoryReport
          storeId={storeId}
        />
      )}

      {/* DIAGNOSTICS */}
      {view === "diagnostics" && (
        <ProductDiagnostics
          storeId={storeId}
        />
      )}

      {/* PRODUCT MANAGEMENT */}
      {view === "products" && (
        <ProductManagement
          storeId={storeId}
        />
      )}

      {/* ANALYSIS */}
      {view === "analysis" && (
        <SalesAnalysisPanel
          storeId={storeId}
        />
      )}

      {/* CASH */}
      {view === "cash" && (
        <CashPanel
          storeId={storeId}
          products={products}
        />
      )}
    </div>
  );
}

export default App;
