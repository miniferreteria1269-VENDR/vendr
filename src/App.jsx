import { useState, useEffect } from "react";
import axios from "axios";

import ProductPanel from "./components/ProductPanel";
import TicketPanel from "./components/TicketPanel";
import SalesHistoryPanel from "./components/SalesHistoryPanel";
import InventoryReport from "./components/InventoryReport";
import ProductManagement from "./components/ProductManagement";
import SalesAnalysisPanel from "./components/SalesAnalysisPanel";
function App() {

  const storeId = 1;

  const [view, setView] = useState("pos");

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

  const currentTicket = tickets.find(t => t.id === activeTicket);

  useEffect(() => {
    localStorage.setItem("tickets", JSON.stringify(tickets));
  }, [tickets]);

  useEffect(() => {
    if (activeTicket !== null) {
      localStorage.setItem("activeTicket", activeTicket);
    }
  }, [activeTicket]);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {

    const res = await axios.get("http://127.0.0.1:8000/products", {
      params: { store_id: storeId }
    });

    const sortedProducts = (res.data.products || []).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );

    setProducts(sortedProducts);

  };

  useEffect(() => {

    const delay = setTimeout(() => {

      if (searchTerm.trim() === "") {
        loadProducts();
        return;
      }

      searchProducts(searchTerm);

    }, 300);

    return () => clearTimeout(delay);

  }, [searchTerm]);

  const searchProducts = async (term) => {

    const res = await axios.get(
      "http://127.0.0.1:8000/products/search",
      {
        params: {
          store_id: storeId,
          name: term
        }
      }
    );

    setProducts(res.data.products);

  };

  const handleSearchEnter = (e) => {

    if (e.key !== "Enter") return;
    if (!currentTicket) return;

    if (products.length > 0) {
      addItem(products[0]);
    } else {
      createProductFromSearch();
    }

  };

  const createTicket = (type) => {

    const ticket = {
      id: Date.now(),
      type,
      label: "",
      items: []
    };

    const updated = [...tickets, ticket];

    setTickets(updated);
    setActiveTicket(ticket.id);

  };

  const addItem = (product) => {

    if (!currentTicket) return;

    const updatedTickets = tickets.map(ticket => {

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

    setTickets(updatedTickets);
    setSearchTerm("");

  };

  const createProductFromSearch = () => {

    if (!currentTicket || searchTerm.trim() === "") return;

    const tempProduct = {
      product_id: "new_" + Date.now(),
      name: searchTerm,
      cost: 0,
      price: 0
    };

    addItem(tempProduct);
    setSearchTerm("");

  };

  const updateItemField = (index, field, value) => {

    const updatedTickets = tickets.map(ticket => {

      if (ticket.id !== activeTicket) return ticket;

      const updatedItems = ticket.items.map((item, i) => {

        if (i !== index) return item;

        return {
          ...item,
          [field]: value
        };

      });

      return {
        ...ticket,
        items: updatedItems
      };

    });

    setTickets(updatedTickets);

  };

  const removeItem = (index) => {

    const updatedTickets = tickets.map(ticket => {

      if (ticket.id !== activeTicket) return ticket;

      return {
        ...ticket,
        items: ticket.items.filter((_, i) => i !== index)
      };

    });

    setTickets(updatedTickets);

  };

  const cancelTicket = () => {

    const remaining = tickets.filter(
      t => t.id !== activeTicket
    );

    setTickets(remaining);

    if (remaining.length > 0) {
      setActiveTicket(remaining[0].id);
    } else {
      setActiveTicket(null);
    }

  };

  const renameTicket = (ticketId) => {

    const newLabel = prompt("Ticket label:");

    if (!newLabel) return;

    const updated = tickets.map(ticket => {

      if (ticket.id !== ticketId) return ticket;

      return {
        ...ticket,
        label: newLabel
      };

    });

    setTickets(updated);

  };

  const finalizeSale = async () => {

    if (!currentTicket || currentTicket.items.length === 0) return;

    await axios.post(
      "http://127.0.0.1:8000/sale-ticket",
      {
        store_id: storeId,
        items: currentTicket.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity
        }))
      }
    );

    cancelTicket();
    loadProducts();

  };

  const finalizeIntake = async () => {

    if (!currentTicket || currentTicket.items.length === 0) return;

    await axios.post(
      "http://127.0.0.1:8000/intake-ticket",
      {
        store_id: storeId,
        items: currentTicket.items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          cost: i.cost,
          price: i.price
        }))
      }
    );

    cancelTicket();
    loadProducts();

  };

  return (

    <div style={{ fontFamily: "Arial", height: "100vh" }}>

      {/* NAVIGATION */}

      <div style={{ padding: 10 }}>

        <button onClick={() => setView("pos")}>
          POS
        </button>

        <button
          onClick={() => setView("sales")}
          style={{ marginLeft: 10 }}
        >
          Sales History
        </button>

        <button
          onClick={() => setView("inventory")}
          style={{ marginLeft: 10 }}
        >
          Inventory
        </button>

        <button
          onClick={() => setView("products")}
          style={{ marginLeft: 10 }}
        >
          Product Management
        </button>
        <button
          onClick={() => setView("analysis")}
          style={{ marginLeft: 10 }}
        >
          Sales Analysis
        </button>



      </div>

      <div style={{ padding: 10 }}>
        Current View: {view}
      </div>

      {/* POS VIEW */}

      {view === "pos" && (

        <div style={{ display: "flex", height: "100%" }}>

          <ProductPanel
            products={products}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            addItem={addItem}
            createProductFromSearch={createProductFromSearch}
            handleSearchEnter={handleSearchEnter}
          />

          <TicketPanel
            tickets={tickets}
            activeTicket={activeTicket}
            setActiveTicket={setActiveTicket}
            currentTicket={currentTicket}
            createTicket={createTicket}
            removeItem={removeItem}
            updateItemField={updateItemField}
            finalizeSale={finalizeSale}
            finalizeIntake={finalizeIntake}
            cancelTicket={cancelTicket}
            renameTicket={renameTicket}
          />

        </div>

      )}

      {/* SALES HISTORY */}

      {view === "sales" && (
        <SalesHistoryPanel storeId={storeId} />
      )}

      {/* INVENTORY REPORT */}

      {view === "inventory" && (
        <InventoryReport storeId={storeId} />
      )}

      {/* PRODUCT MANAGEMENT */}

      {view === "products" && (
        <ProductManagement storeId={storeId} />
      )}
      {view === "analysis" && (
        <SalesAnalysisPanel storeId={storeId} />
      )}
    </div>

  );

}

export default App;