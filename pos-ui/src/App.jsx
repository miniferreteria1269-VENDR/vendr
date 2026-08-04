import { useEffect, useState } from "react";
import axios from "axios";
import apiClient from "./apiClient";
import { useLang } from "./LanguageContext";
import Login from "./Login";
import Signup from "./Signup";
import SyncStatus from "./components/SyncStatus";

import ProductPanel from "./components/ProductPanel";
import TicketPanel from "./components/TicketPanel";
import HistoryPanel from "./components/HistoryPanel";
import InventoryReport from "./components/InventoryReport";
import ProductDiagnostics from "./components/ProductDiagnostics";
import ProductManagement from "./components/ProductManagement";
import SalesAnalysisPanel from "./components/SalesAnalysisPanel";
import CashPanel from "./components/CashPanel";
import SupplierManagement from "./components/SupplierManagement";
import AgendaPanel from "./components/AgendaPanel";
// Client management navigation and view
import ClientManagement from "./components/ClientManagement";
import ReceiptModal from "./components/ReceiptModal";

import {
  cacheProducts,
  getCachedProducts,
  searchCachedProducts,
  applyLocalSaleToCatalog,
  applyLocalIntakeToCatalog
} from "./offlineCatalog";

import {
  savePendingEvent,
  submitPendingEvent,
  migratePendingSalesToEvents
} from "./offlineEvents";

import {
  syncPendingEvents
} from "./syncPendingEvents";

const API =
  "https://vendr-onkr.onrender.com";

const getOrCreateDeviceId = () => {
  let deviceId =
    localStorage.getItem(
      "vendr_device_id"
    );

  if (!deviceId) {
    deviceId =
      crypto.randomUUID?.() ||
      `device-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;

    localStorage.setItem(
      "vendr_device_id",
      deviceId
    );
  }

  return deviceId;
};

const createIntakeClientEventId = () =>
  crypto.randomUUID?.() ||
  `intake-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

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
  // POS client assignment and fiado state are stored per ticket.
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
  const [intakeSuppliers, setIntakeSuppliers] = useState([]);
  const [saleClients, setSaleClients] = useState([]);
  const [agendaIndicator, setAgendaIndicator] =
    useState("green");

  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("percent");
  const [completedReceipt, setCompletedReceipt] =
    useState(null);

  const storeId = user?.store_id;

  const updateAgendaIndicator = items => {
    const incompleteItems = (items || []).filter(
      item => !item.is_completed
    );

    if (
      incompleteItems.some(
        item => item.is_overdue
      )
    ) {
      setAgendaIndicator("red");
      return;
    }

    if (incompleteItems.length > 0) {
      setAgendaIndicator("yellow");
      return;
    }

    setAgendaIndicator("green");
  };

  // Keep the Agenda navigation indicator current even
  // while the Agenda view itself is closed.
  useEffect(() => {
    if (!storeId) {
      setAgendaIndicator("green");
      return;
    }

    let cancelled = false;

    const loadAgendaIndicator = async () => {
      const now = new Date();

      const localDate = new Date(
        now.getTime() -
        now.getTimezoneOffset() * 60000
      )
        .toISOString()
        .slice(0, 10);

      try {
        const response = await apiClient.get(
          "/agenda-items",
          {
            params: {
              store_id: storeId,
              start_date: localDate,
              end_date: localDate
            }
          }
        );

        if (cancelled) return;

        updateAgendaIndicator(
          response.data.agenda_items || []
        );
      } catch (error) {
        console.warn(
          "Unable to load Agenda status:",
          error
        );
      }
    };

    loadAgendaIndicator();

    return () => {
      cancelled = true;
    };
  }, [storeId, view]);

  const [finalizingIntake, setFinalizingIntake] =
    useState(false);

  const currentTicket = tickets.find(
    ticket => ticket.id === activeTicket
  );

  // -------------------------------------------------
  // INTAKE SUPPLIERS
  // -------------------------------------------------
  useEffect(() => {
    if (!storeId) {
      setIntakeSuppliers([]);
      return;
    }

    const cacheKey =
      `vendr_intake_suppliers_${storeId}`;

    try {
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        setIntakeSuppliers(JSON.parse(cached));
      }
    } catch (error) {
      console.warn(
        "Unable to load cached intake suppliers:",
        error
      );
    }

    if (view !== "pos" || !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const loadIntakeSuppliers = async () => {
      try {
        const response = await apiClient.get("/suppliers");

        const loadedSuppliers = [
          ...(response.data.suppliers || [])
        ].sort((a, b) =>
          String(a.supplier_name || "").localeCompare(
            String(b.supplier_name || ""),
            undefined,
            { sensitivity: "base" }
          )
        );

        if (cancelled) return;

        setIntakeSuppliers(loadedSuppliers);
        localStorage.setItem(
          cacheKey,
          JSON.stringify(loadedSuppliers)
        );
      } catch (error) {
        console.warn(
          "Unable to refresh intake suppliers:",
          error
        );
      }
    };

    loadIntakeSuppliers();

    return () => {
      cancelled = true;
    };
  }, [storeId, view]);

  // -------------------------------------------------
  // SALE CLIENTS
  // -------------------------------------------------
  useEffect(() => {
    if (!storeId) {
      setSaleClients([]);
      return;
    }

    const cacheKey =
      `vendr_sale_clients_${storeId}`;

    try {
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        setSaleClients(JSON.parse(cached));
      }
    } catch (error) {
      console.warn(
        "Unable to load cached sale clients:",
        error
      );
    }

    if (view !== "pos" || !navigator.onLine) {
      return;
    }

    let cancelled = false;

    const loadSaleClients = async () => {
      try {
        const response =
          await apiClient.get("/clients");

        const loadedClients = [
          ...(response.data.clients || [])
        ].sort((a, b) =>
          String(a.client_name || "")
            .localeCompare(
              String(b.client_name || ""),
              undefined,
              { sensitivity: "base" }
            )
        );

        if (cancelled) return;

        setSaleClients(loadedClients);

        localStorage.setItem(
          cacheKey,
          JSON.stringify(loadedClients)
        );
      } catch (error) {
        console.warn(
          "Unable to refresh sale clients:",
          error
        );
      }
    };

    loadSaleClients();

    return () => {
      cancelled = true;
    };
  }, [storeId, view]);

  // -------------------------------------------------
  // AUTHENTICATION
  // -------------------------------------------------

  const handleLogout = () => {
  localStorage.removeItem("user");
  localStorage.removeItem(
    "vendr_access_token"
  );
  localStorage.removeItem("tickets");
  localStorage.removeItem(
    "activeTicket"
  );

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
      const response =
        await apiClient.get(
          "/products",
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
      const response =
        await apiClient.get(
          "/products/search",
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
  let syncInProgress = false;

  const runSync = async () => {
    /*
     * Do not synchronize without a store,
     * without internet, or while another
     * synchronization attempt is running.
     */
    if (
      !storeId ||
      !navigator.onLine ||
      syncInProgress
    ) {
      return;
    }

    syncInProgress = true;

    try {
      /*
       * Move any legacy pendingSales records into
       * the generic pendingEvents queue.
       */
      const migrated =
        await migratePendingSalesToEvents();

      if (migrated > 0) {
        console.log(
          `Migrated ${migrated} legacy pending event(s).`
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

        /*
         * Remove tickets whose events were
         * successfully synchronized.
         */
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
          `${results.failed} pending event(s) remain unsynchronized.`
        );
      }
    } catch (error) {
      /*
       * A failed retry is expected when Render
       * or the network is unavailable. The event
       * remains safely stored for the next attempt.
       */
      if (
        error.code === "ECONNABORTED"
      ) {
        console.warn(
          "PENDING EVENT SYNC TIMED OUT. WILL RETRY."
        );
      } else {
        console.warn(
          "PENDING EVENT SYNC UNAVAILABLE. WILL RETRY:",
          error
        );
      }
    } finally {
      syncInProgress = false;
    }
  };

  /*
   * Attempt synchronization immediately whenever
   * the user/store session is restored.
   */
  runSync();

  /*
   * Retry every 30 seconds. The overlap guard
   * prevents two attempts from running together.
   */
  const retryInterval =
    window.setInterval(
      runSync,
      30000
    );

  /*
   * Retry immediately when the browser detects
   * that internet connectivity has returned.
   */
  window.addEventListener(
    "online",
    runSync
  );

  /*
   * Also retry when the cashier returns to the tab.
   * Browsers often throttle intervals in background
   * tabs, so this avoids waiting for the next cycle.
   */
  const handleVisibilityChange = () => {
    if (
      document.visibilityState ===
      "visible"
    ) {
      runSync();
    }
  };

  document.addEventListener(
    "visibilitychange",
    handleVisibilityChange
  );

  return () => {
    window.clearInterval(
      retryInterval
    );

    window.removeEventListener(
      "online",
      runSync
    );

    document.removeEventListener(
      "visibilitychange",
      handleVisibilityChange
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
      items: [],
      supplier_id: null,
      client_id: null,
      is_credit: false,
      due_date: "",
      credit_limit_warning_acknowledged:
        false
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
              ),
              credit_limit_warning_acknowledged:
                ticket.type === "sale"
                  ? false
                  : ticket
                      .credit_limit_warning_acknowledged
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
              ),
              credit_limit_warning_acknowledged:
                ticket.type === "sale"
                  ? false
                  : ticket
                      .credit_limit_warning_acknowledged
            }
          : ticket
      )
    );
  };

  const setIntakeSupplierId = value => {
    const supplierId =
      value === "" || value == null
        ? null
        : Number(value);

    setTickets(previous =>
      previous.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              supplier_id: supplierId
            }
          : ticket
      )
    );
  };

  const updateSaleCreditField = (
    field,
    value
  ) => {
    setTickets(previous =>
      previous.map(ticket =>
        ticket.id === activeTicket
          ? {
              ...ticket,
              [field]: value,
              credit_limit_warning_acknowledged:
                false
            }
          : ticket
      )
    );
  };

  const resetActiveCreditWarning = () => {
    setTickets(previous =>
      previous.map(ticket =>
        ticket.id === activeTicket &&
        ticket.type === "sale"
          ? {
              ...ticket,
              credit_limit_warning_acknowledged:
                false
            }
          : ticket
      )
    );
  };

  const updateSaleDiscountValue = value => {
    setDiscountValue(value);
    resetActiveCreditWarning();
  };

  const updateSaleDiscountType = value => {
    setDiscountType(value);
    resetActiveCreditWarning();
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
          credit_limit_warning_acknowledged:
            false,
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
        credit_limit_warning_acknowledged:
          false,
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

    const isCredit = Boolean(
      currentTicket.is_credit
    );

    const clientId =
      currentTicket.client_id == null
        ? null
        : Number(currentTicket.client_id);

    const selectedClient =
      saleClients.find(
        client =>
          Number(client.client_id) ===
          clientId
      ) || null;

    if (isCredit && clientId === null) {
      alert(
        t("fiado_client_required")
      );

      return;
    }

    let creditLimitWarningAcknowledged =
      Boolean(
        currentTicket
          .credit_limit_warning_acknowledged
      );

    if (
      isCredit &&
      selectedClient?.credit_limit != null
    ) {
      const currentBalance = Number(
        selectedClient.outstanding_balance || 0
      );

      const creditLimit = Number(
        selectedClient.credit_limit
      );

      const projectedBalance =
        currentBalance + discountedTotal;

      if (
        projectedBalance > creditLimit &&
        !creditLimitWarningAcknowledged
      ) {
        const warningMessage =
          t("credit_limit_warning")
            .replaceAll(
              "{client}",
              selectedClient.client_name
            )
            .replaceAll(
              "{balance}",
              currentBalance.toFixed(2)
            )
            .replaceAll(
              "{projected}",
              projectedBalance.toFixed(2)
            )
            .replaceAll(
              "{limit}",
              creditLimit.toFixed(2)
            );

        if (!window.confirm(warningMessage)) {
          return;
        }

        creditLimitWarningAcknowledged = true;

        setTickets(previous =>
          previous.map(ticket =>
            ticket.id === activeTicket
              ? {
                  ...ticket,
                  credit_limit_warning_acknowledged:
                    true
                }
              : ticket
          )
        );
      }
    }

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
      client_id: clientId,
      is_credit: isCredit,
      due_date:
        isCredit && currentTicket.due_date
          ? currentTicket.due_date
          : null,
      credit_limit_warning_acknowledged:
        creditLimitWarningAcknowledged,
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

    /*
     * Capture the customer-facing sale before the ticket
     * is removed. The original prices are preserved here;
     * the backend receives proportionally discounted prices.
     */
    const receiptSnapshot = {
      storeName:
        user?.store_name || `Store ${storeId}`,
      createdAt: clientCreatedAt,
      clientEventId,
      ticketId: null,
      clientName:
        selectedClient?.client_name || null,
      isCredit,
      dueDate:
        isCredit && currentTicket.due_date
          ? currentTicket.due_date
          : null,
      items: currentTicket.items.map(item => ({
        product_id: item.product_id,
        name: item.name,
        quantity: Number(item.quantity),
        price: Number(item.price)
      })),
      subtotal,
      discountAmount:
        subtotal - discountedTotal,
      total: discountedTotal,
      syncStatus: "pending"
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

        if (isCredit && clientId !== null) {
          setSaleClients(previousClients => {
            const now = new Date();

            const today = new Date(
              now.getTime() -
              now.getTimezoneOffset() * 60000
            )
              .toISOString()
              .slice(0, 10);

            const updatedClients =
              previousClients.map(client =>
                Number(client.client_id) ===
                clientId
                  ? {
                      ...client,
                      outstanding_balance:
                        Number(
                          client
                            .outstanding_balance || 0
                        ) + discountedTotal,
                      has_overdue_balance:
                        Boolean(
                          client
                            .has_overdue_balance
                        ) ||
                        Boolean(
                          currentTicket.due_date &&
                          currentTicket.due_date <
                            today
                        )
                    }
                  : client
              );

            localStorage.setItem(
              `vendr_sale_clients_${storeId}`,
              JSON.stringify(updatedClients)
            );

            return updatedClients;
          });
        }
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

      setCompletedReceipt({
        ...receiptSnapshot,
        ticketId:
          responseData.ticket_id ?? null,
        syncStatus: "synced"
      });

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

      const serverStatus =
        error.response?.status;

      const serverRejectedSale =
        serverStatus >= 400 &&
        serverStatus < 500;

      if (
        saleSavedLocally &&
        !serverRejectedSale
      ) {
        setCompletedReceipt(receiptSnapshot);

        setTickets(previous =>
          previous.filter(
            ticket =>
              ticket.id !== activeTicket
          )
        );

        setActiveTicket(null);
        setDiscountValue(0);
        setDiscountType("percent");

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
  if (finalizingIntake) {
    return;
  }

  if (
    !currentTicket ||
    !Array.isArray(currentTicket.items) ||
    currentTicket.items.length === 0
  ) {
    return;
  }

  if (!storeId) {
    alert(t("intake_failed"));
    return;
  }

  const ticketId = currentTicket.id;

  const items =
    currentTicket.items.map(item => ({
      product_id: item.product_id,
      quantity: Number(item.quantity),
      cost: Number(item.cost),
      price: Number(item.price)
    }));

  const hasInvalidItem =
    items.some(item =>
      !item.product_id ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0 ||
      !Number.isFinite(item.cost) ||
      item.cost < 0 ||
      !Number.isFinite(item.price) ||
      item.price < 0
    );

  if (hasInvalidItem) {
    alert(t("intake_failed"));
    return;
  }

  /*
   * Reuse an event ID already attached to this ticket.
   * Only create one when the ticket has never been
   * finalized before.
   */
  const clientEventId =
    currentTicket.client_event_id ||
    createIntakeClientEventId();

  const deviceId =
    getOrCreateDeviceId();

  const clientCreatedAt =
    currentTicket.client_created_at ||
    new Date().toISOString();

  /*
   * Persist the identity on the visible ticket before
   * performing asynchronous work. If the ticket somehow
   * remains visible, another click reuses the same ID.
   */
  setTickets(previous =>
    previous.map(ticket =>
      String(ticket.id) === String(ticketId)
        ? {
            ...ticket,
            client_event_id: clientEventId,
            client_created_at: clientCreatedAt
          }
        : ticket
    )
  );

  const payload = {
    store_id: storeId,
    items,
    paid: intakePaid,
    supplier_id:
      currentTicket.supplier_id ?? null,
    client_event_id: clientEventId,
    device_id: deviceId,
    client_created_at: clientCreatedAt
  };

  const pendingEvent = {
    client_event_id: clientEventId,
    event_type: "intake",
    store_id: storeId,
    device_id: deviceId,
    client_created_at: clientCreatedAt,
    payload
  };

  setFinalizingIntake(true);

  try {
    const saveResult =
      await savePendingEvent(
        pendingEvent
      );

    if (saveResult.created) {
      await applyLocalIntakeToCatalog(
        storeId,
        items
      );
    }

    /*
     * Remove the exact ticket that was finalized.
     * String normalization avoids number/string mismatch.
     */
    setTickets(previous =>
      previous.filter(
        ticket =>
          String(ticket.id) !==
          String(ticketId)
      )
    );

    setActiveTicket(previousActive =>
      String(previousActive) ===
      String(ticketId)
        ? null
        : previousActive
    );

    setIntakePaid(false);

    let synchronized = false;

    if (navigator.onLine) {
      try {
        await submitPendingEvent(
          pendingEvent
        );

        synchronized = true;
      } catch (syncError) {
        console.warn(
          "INTAKE SAVED PENDING SYNC:",
          syncError
        );
      }
    }

    try {
      await loadProducts();
    } catch (refreshError) {
      console.warn(
        "INTAKE PRODUCT REFRESH ERROR:",
        refreshError
      );
    }

    alert(
      synchronized
        ? t("intake_completed")
        : t("intake_saved_pending")
    );
  } catch (error) {
    console.error(
      "INTAKE LOCAL SAVE ERROR:",
      error
    );

    alert(t("intake_failed"));
  } finally {
    setFinalizingIntake(false);
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

// UI
// -------------------------------------------------

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, sans-serif",

        background: COLORS.bg,
        color: COLORS.text,

        width: "100%",
        maxWidth: "100%",

        height: "100dvh",
        minHeight: "100dvh",

        overflowX: "hidden",
        overflowY: "hidden",

        display: "flex",
        flexDirection: "column",

        minWidth: 0,
        boxSizing: "border-box"
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: 12,

          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,

          width: "100%",
          minWidth: 0,
          flexShrink: 0,
          boxSizing: "border-box",

          borderBottom:
            `1px solid ${COLORS.border}`
        }}
      >
        <div
          style={{
            minWidth: 0,
            overflow: "hidden"
          }}
        >
          <div
            style={{
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {user.store_name ||
              `${t("store")} ${storeId}`}
          </div>

          <SyncStatus
            storeId={storeId}
          />
        </div>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            background:
              COLORS.panelAlt,

            border: "none",
            color: COLORS.text,

            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer",

            flex: "0 0 auto",
            whiteSpace: "nowrap"
          }}
        >
          {t("logout")}
        </button>
      </div>

      {/* NAVIGATION */}
      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,

          overflowX: "auto",
          overflowY: "hidden",

          flexShrink: 0,
          boxSizing: "border-box",

          borderBottom:
            `1px solid ${COLORS.border}`,

          WebkitOverflowScrolling:
            "touch",

          touchAction: "pan-x",
          overscrollBehaviorX:
            "contain",

          scrollbarWidth:
            "thin"
        }}
      >
        <div
          style={{
            display: "flex",

            width: "max-content",
            minWidth: "100%",

            gap: 8,
            padding: "8px 10px",

            boxSizing: "border-box"
          }}
        >
          {[
            "pos",
            "agenda",
            "sales",
            "inventory",
            "suppliers",
            "clients",
            "products",
            "analysis",
            "diagnostics",
            "cash"
          ].map(navView => (
            <button
              key={navView}
              type="button"
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

                padding:
                  "8px 12px",

                cursor:
                  "pointer",

                flex:
                  "0 0 auto",

                whiteSpace:
                  "nowrap"
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                }}
              >
                {navView === "agenda" && (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      flex: "0 0 auto",
                      borderRadius: "50%",
                      background:
                        agendaIndicator === "red"
                          ? "#ff5c5c"
                          : agendaIndicator === "yellow"
                            ? "#f5c542"
                            : "#3ddc84",
                      boxShadow:
                        `0 0 6px ${
                          agendaIndicator === "red"
                            ? "#ff5c5c"
                            : agendaIndicator === "yellow"
                              ? "#f5c542"
                              : "#3ddc84"
                        }`
                    }}
                  />
                )}

                {t(
                  navView === "sales"
                    ? "history"
                    : navView
                ).toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* POS */}
      {view === "pos" && (
        <div
          style={{
            display: "flex",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            gap: 12,
            padding: 12
          }}
        >
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
            intakeSuppliers={intakeSuppliers}
            intakeSupplierId={
              currentTicket?.supplier_id ?? null
            }
            setIntakeSupplierId={setIntakeSupplierId}
            saleClients={saleClients}
            saleClientId={
              currentTicket?.client_id ?? null
            }
            saleIsCredit={Boolean(
              currentTicket?.is_credit
            )}
            saleDueDate={
              currentTicket?.due_date || ""
            }
            updateSaleCreditField={
              updateSaleCreditField
            }
            discountValue={discountValue}
            setDiscountValue={
              updateSaleDiscountValue
            }
            discountType={discountType}
            setDiscountType={
              updateSaleDiscountType
            }
          />
        </div>
      )}

      {/* AGENDA */}
      {view === "agenda" && (
        <AgendaPanel
          storeId={storeId}
          onItemsChanged={
            updateAgendaIndicator
          }
        />
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

      {/* SUPPLIERS */}
      {view === "suppliers" && (
        <SupplierManagement />
      )}  

      {/* CLIENTS */}
      {view === "clients" && (
        <ClientManagement />
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

      <ReceiptModal
        receipt={completedReceipt}
        onClose={() =>
          setCompletedReceipt(null)
        }
      />
    </div>
  );
}

export default App;
