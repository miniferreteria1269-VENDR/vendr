import {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import apiClient from "../apiClient";
import {
  searchCachedProducts,
  applyLocalStockAdjustmentToCatalog
} from "../offlineCatalog";
import {
  savePendingEvent,
  submitPendingEvent,
  discardPendingEvent
} from "../offlineEvents";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  btnDanger,
  input
} from "../uiStyles";

const createClientEventId = prefix =>
  crypto.randomUUID?.() ||
  `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem(
    "vendr_device_id"
  );

  if (!deviceId) {
    deviceId = createClientEventId(
      "device"
    );

    localStorage.setItem(
      "vendr_device_id",
      deviceId
    );
  }

  return deviceId;
};

const isTrackedProduct = product => {
  const value = product?.tracks_stock;

  return (
    value === 1 ||
    value === true ||
    value === "1" ||
    value === "true"
  );
};

const isActiveProduct = product => {
  const value = product?.is_active;

  return !(
    value === 0 ||
    value === false ||
    value === "0" ||
    value === "false"
  );
};

const formatDateTime = value => {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
};

const statusLabels = {
  created: "Created",
  dispatched: "Awaiting receipt",
  received: "Received",
  received_with_discrepancy:
    "Received with discrepancy",
  cancelled: "Cancelled"
};

const statusColors = {
  created: COLORS.textDim,
  dispatched: "#f5c542",
  received: "#3ddc84",
  received_with_discrepancy:
    "#ff9f43",
  cancelled: COLORS.danger
};

const panelStyle = {
  ...card,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column"
};

const scrollAreaStyle = {
  minHeight: 0,
  overflowY: "auto",
  WebkitOverflowScrolling: "touch"
};

const rowStyle = {
  padding: 10,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.panelAlt
};

const labelStyle = {
  display: "block",
  color: COLORS.textDim,
  fontSize: 12,
  marginBottom: 4
};

function TransferPanel({
  storeId,
  storeName,
  onProductsChanged
}) {
  const [view, setView] = useState(
    "incoming"
  );

  const [stores, setStores] = useState(
    []
  );

  const [tickets, setTickets] = useState(
    []
  );

  const [selectedTransferId, setSelectedTransferId] =
    useState(null);

  const [selectedTransfer, setSelectedTransfer] =
    useState(null);

  const [loading, setLoading] = useState(
    false
  );

  const [error, setError] = useState("");

  const storesCacheKey =
    `vendr_transfer_stores:${storeId}`;

  const loadStores = useCallback(
    async () => {
      if (!storeId) return;

      try {
        const response = await apiClient.get(
          "/transfer-stores"
        );

        const nextStores =
          response.data.stores || [];

        setStores(nextStores);

        localStorage.setItem(
          storesCacheKey,
          JSON.stringify(nextStores)
        );
      } catch (loadError) {
        console.warn(
          "TRANSFER STORES LOAD ERROR:",
          loadError
        );

        try {
          const cached = JSON.parse(
            localStorage.getItem(
              storesCacheKey
            ) || "[]"
          );

          setStores(
            Array.isArray(cached)
              ? cached
              : []
          );
        } catch {
          setStores([]);
        }
      }
    },
    [storeId, storesCacheKey]
  );

  const loadTickets = useCallback(
    async scope => {
      if (
        !storeId ||
        scope === "create"
      ) {
        return;
      }

      if (!navigator.onLine) {
        setTickets([]);
        setError(
          "Transfer history requires an internet connection."
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await apiClient.get(
          "/transfer-tickets",
          {
            params: {
              scope
            }
          }
        );

        setTickets(
          response.data.tickets || []
        );
      } catch (loadError) {
        console.error(
          "TRANSFER TICKETS LOAD ERROR:",
          loadError
        );

        setTickets([]);
        setError(
          loadError.response?.data?.detail ||
          "Unable to load transfer tickets."
        );
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  const openTicket = async transferId => {
    if (!navigator.onLine) {
      setError(
        "Transfer details require an internet connection."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get(
        `/transfer-tickets/${transferId}`
      );

      setSelectedTransfer(
        response.data.transfer
      );

      setSelectedTransferId(
        transferId
      );
    } catch (loadError) {
      console.error(
        "TRANSFER DETAIL LOAD ERROR:",
        loadError
      );

      setError(
        loadError.response?.data?.detail ||
        "Unable to load transfer details."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  useEffect(() => {
    setSelectedTransferId(null);
    setSelectedTransfer(null);

    loadTickets(view);
  }, [view, loadTickets]);

  const refreshCurrentView = async () => {
    if (selectedTransferId) {
      await openTicket(
        selectedTransferId
      );
    }

    await loadTickets(view);
  };

  return (
    <div
      style={{
        padding: 12,
        minHeight: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        color: COLORS.text
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>
            Stock Transfers
          </h2>

          <div
            style={{
              color: COLORS.textDim,
              marginTop: 4
            }}
          >
            {storeName ||
              `Store ${storeId}`}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap"
          }}
        >
          {[
            ["incoming", "Incoming"],
            ["sent", "Sent"],
            ["create", "New Transfer"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              style={
                view === key
                  ? btnPrimary
                  : btnSecondary
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          style={{
            color: COLORS.danger,
            marginBottom: 10
          }}
        >
          {typeof error === "string"
            ? error
            : JSON.stringify(error)}
        </div>
      )}

      <div
        style={{
          flex: 1,
          minHeight: 0
        }}
      >
        {view === "create" ? (
          <CreateTransferTicket
            storeId={storeId}
            stores={stores}
            onCompleted={
              async synchronized => {
                if (
                  synchronized &&
                  onProductsChanged
                ) {
                  await onProductsChanged();
                }

                setView("sent");
              }
            }
          />
        ) : selectedTransfer ? (
          <TransferDetail
            transfer={selectedTransfer}
            storeId={storeId}
            onBack={() => {
              setSelectedTransferId(null);
              setSelectedTransfer(null);
            }}
            onReceived={
              async () => {
                if (onProductsChanged) {
                  await onProductsChanged();
                }

                await refreshCurrentView();
              }
            }
          />
        ) : (
          <TransferTicketList
            tickets={tickets}
            loading={loading}
            emptyLabel={
              view === "incoming"
                ? "No incoming transfers."
                : "No sent transfers."
            }
            onOpen={openTicket}
          />
        )}
      </div>
    </div>
  );
}

function CreateTransferTicket({
  storeId,
  stores,
  onCompleted
}) {
  const [destinationStoreId, setDestinationStoreId] =
    useState("");

  const [search, setSearch] = useState("");
  const [results, setResults] = useState(
    []
  );
  const [items, setItems] = useState([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  const searchProducts = async value => {
    setSearch(value);

    const term = String(
      value || ""
    ).trim();

    if (term.length < 2) {
      setResults([]);
      return;
    }

    try {
      const products =
        await searchCachedProducts(
          storeId,
          term
        );

      setResults(
        products.filter(
          product =>
            isTrackedProduct(product) &&
            isActiveProduct(product)
        )
      );
    } catch (searchError) {
      console.error(
        "TRANSFER PRODUCT SEARCH ERROR:",
        searchError
      );

      setResults([]);
    }
  };

  const addProduct = product => {
    if (
      items.some(
        item =>
          item.product_id ===
          product.product_id
      )
    ) {
      setError(
        "That product is already on the transfer."
      );
      return;
    }

    const stock = Number(
      product.stock || 0
    );

    if (stock <= 0) {
      setError(
        "This product has no stock available to transfer."
      );
      return;
    }

    setItems(current => [
      ...current,
      {
        product_id:
          product.product_id,
        name:
          product.name,
        stock,
        quantity: 1
      }
    ]);

    setSearch("");
    setResults([]);
    setError("");
  };

  const updateQuantity = (
    productId,
    value
  ) => {
    setItems(current =>
      current.map(item =>
        item.product_id === productId
          ? {
              ...item,
              quantity: value
            }
          : item
      )
    );
  };

  const removeProduct = productId => {
    setItems(current =>
      current.filter(
        item =>
          item.product_id !==
          productId
      )
    );
  };

  const resetForm = () => {
    setDestinationStoreId("");
    setSearch("");
    setResults([]);
    setItems([]);
    setNote("");
    setError("");
  };

  const submit = async () => {
    if (submitting) return;

    if (!destinationStoreId) {
      setError(
        "Select the destination store."
      );
      return;
    }

    if (items.length === 0) {
      setError(
        "Add at least one product."
      );
      return;
    }

    const invalidItem = items.find(
      item => {
        const quantity = Number(
          item.quantity
        );

        return (
          !Number.isInteger(quantity) ||
          quantity <= 0 ||
          quantity > Number(item.stock)
        );
      }
    );

    if (invalidItem) {
      setError(
        `Check the transfer quantity for ${invalidItem.name}. It must be a whole number between 1 and ${invalidItem.stock}.`
      );
      return;
    }

    const clientEventId =
      createClientEventId(
        "transfer"
      );

    const deviceId =
      getOrCreateDeviceId();

    const clientCreatedAt =
      new Date().toISOString();

    const payload = {
      store_id: storeId,
      destination_store_id:
        Number(destinationStoreId),
      items: items.map(item => ({
        product_id: item.product_id,
        quantity: Number(
          item.quantity
        )
      })),
      note: note.trim() || null,
      client_event_id:
        clientEventId,
      device_id: deviceId,
      client_created_at:
        clientCreatedAt
    };

    const pendingEvent = {
      client_event_id:
        clientEventId,
      event_type:
        "transfer_dispatch",
      store_id: storeId,
      device_id: deviceId,
      client_created_at:
        clientCreatedAt,
      payload
    };

    setSubmitting(true);
    setError("");

    const locallyApplied = [];

    try {
      const saved =
        await savePendingEvent(
          pendingEvent
        );

      if (saved.created) {
        try {
          for (const item of items) {
            await applyLocalStockAdjustmentToCatalog(
              storeId,
              item.product_id,
              Number(item.quantity),
              "negative"
            );

            locallyApplied.push(item);
          }
        } catch (localError) {
          // Restore any lines changed before the local
          // operation failed, then remove the queue row.
          for (
            let index =
              locallyApplied.length - 1;
            index >= 0;
            index -= 1
          ) {
            const item =
              locallyApplied[index];

            await applyLocalStockAdjustmentToCatalog(
              storeId,
              item.product_id,
              Number(item.quantity),
              "positive"
            );
          }

          await discardPendingEvent(
            clientEventId
          );

          throw localError;
        }
      }

      let synchronized = false;

      if (navigator.onLine) {
        try {
          await submitPendingEvent(
            pendingEvent
          );

          synchronized = true;
        } catch (syncError) {
          console.warn(
            "TRANSFER SAVED PENDING SYNC:",
            syncError
          );
        }
      }

      resetForm();

      alert(
        synchronized
          ? "Transfer dispatched."
          : (
              "Transfer saved. It will be "
              + "dispatched when synchronization "
              + "is available."
            )
      );

      if (onCompleted) {
        await onCompleted(
          synchronized
        );
      }
    } catch (submitError) {
      console.error(
        "TRANSFER LOCAL SAVE ERROR:",
        submitError
      );

      setError(
        "Unable to save the transfer."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={panelStyle}>
      <div style={scrollAreaStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 12,
            marginBottom: 14
          }}
        >
          <label>
            <span style={labelStyle}>
              Destination store
            </span>

            <select
              value={destinationStoreId}
              onChange={event =>
                setDestinationStoreId(
                  event.target.value
                )
              }
              disabled={submitting}
              style={{
                ...input,
                width: "100%"
              }}
            >
              <option value="">
                Select destination…
              </option>

              {stores.map(store => (
                <option
                  key={store.store_id}
                  value={store.store_id}
                >
                  {store.store_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span style={labelStyle}>
              General note
            </span>

            <input
              value={note}
              onChange={event =>
                setNote(
                  event.target.value
                )
              }
              placeholder="Optional"
              disabled={submitting}
              style={{
                ...input,
                width: "100%"
              }}
            />
          </label>
        </div>

        <label>
          <span style={labelStyle}>
            Add products
          </span>

          <input
            value={search}
            onChange={event =>
              searchProducts(
                event.target.value
              )
            }
            placeholder="Search local products"
            disabled={submitting}
            style={{
              ...input,
              width: "100%"
            }}
          />
        </label>

        {results.length > 0 && (
          <div
            style={{
              display: "grid",
              gap: 6,
              marginTop: 6,
              marginBottom: 14,
              maxHeight: 180,
              overflowY: "auto"
            }}
          >
            {results.map(product => (
              <button
                key={product.product_id}
                type="button"
                onClick={() =>
                  addProduct(product)
                }
                style={{
                  ...rowStyle,
                  color: COLORS.text,
                  textAlign: "left",
                  cursor: "pointer"
                }}
              >
                <strong>
                  {product.name}
                </strong>

                <div
                  style={{
                    color:
                      COLORS.textDim,
                    marginTop: 3
                  }}
                >
                  Stock: {Number(
                    product.stock || 0
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: 14,
            marginBottom: 8,
            fontWeight: 700
          }}
        >
          Transfer items
        </div>

        {items.length === 0 ? (
          <div
            style={{
              color: COLORS.textDim,
              padding: "18px 0"
            }}
          >
            No products added.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 8
            }}
          >
            {items.map(item => (
              <div
                key={item.product_id}
                style={{
                  ...rowStyle,
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(180px, 1fr) 100px auto",
                  alignItems: "end",
                  gap: 10
                }}
              >
                <div>
                  <strong>
                    {item.name}
                  </strong>

                  <div
                    style={{
                      color:
                        COLORS.textDim,
                      marginTop: 3
                    }}
                  >
                    Available: {item.stock}
                  </div>
                </div>

                <label>
                  <span style={labelStyle}>
                    Quantity
                  </span>

                  <input
                    type="number"
                    min="1"
                    max={item.stock}
                    step="1"
                    value={item.quantity}
                    onChange={event =>
                      updateQuantity(
                        item.product_id,
                        event.target.value
                      )
                    }
                    disabled={submitting}
                    style={{
                      ...input,
                      width: "100%"
                    }}
                  />
                </label>

                <button
                  type="button"
                  onClick={() =>
                    removeProduct(
                      item.product_id
                    )
                  }
                  disabled={submitting}
                  style={btnDanger}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div
            style={{
              color: COLORS.danger,
              marginTop: 12
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          flexWrap: "wrap",
          paddingTop: 12,
          marginTop: 12,
          borderTop:
            `1px solid ${COLORS.border}`
        }}
      >
        <button
          type="button"
          onClick={resetForm}
          disabled={submitting}
          style={btnSecondary}
        >
          Clear
        </button>

        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          style={{
            ...btnPrimary,
            opacity:
              submitting ? 0.6 : 1
          }}
        >
          {submitting
            ? "Saving…"
            : "Dispatch Transfer"}
        </button>
      </div>
    </div>
  );
}

function TransferTicketList({
  tickets,
  loading,
  emptyLabel,
  onOpen
}) {
  if (loading) {
    return (
      <div style={panelStyle}>
        Loading transfers…
      </div>
    );
  }

  return (
    <div style={panelStyle}>
      <div style={scrollAreaStyle}>
        {tickets.length === 0 ? (
          <div
            style={{
              color: COLORS.textDim
            }}
          >
            {emptyLabel}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gap: 8
            }}
          >
            {tickets.map(ticket => (
              <button
                key={ticket.transfer_id}
                type="button"
                onClick={() =>
                  onOpen(
                    ticket.transfer_id
                  )
                }
                style={{
                  ...rowStyle,
                  color: COLORS.text,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(110px, .7fr) minmax(220px, 2fr) minmax(130px, 1fr) auto",
                  gap: 12,
                  alignItems: "center"
                }}
              >
                <div>
                  <strong>
                    TR-{String(
                      ticket.transfer_number
                    ).padStart(5, "0")}
                  </strong>

                  <div
                    style={{
                      color:
                        COLORS.textDim,
                      marginTop: 3,
                      fontSize: 12
                    }}
                  >
                    {formatDateTime(
                      ticket.dispatched_at ||
                      ticket.created_at
                    )}
                  </div>
                </div>

                <div>
                  {
                    ticket.origin_store
                      .store_name
                  }
                  {" → "}
                  {
                    ticket
                      .destination_store
                      .store_name
                  }
                </div>

                <div
                  style={{
                    color: COLORS.textDim
                  }}
                >
                  {ticket.item_count} items ·{" "}
                  {ticket.units_sent} units
                </div>

                <strong
                  style={{
                    color:
                      statusColors[
                        ticket
                          .transfer_status
                      ] ||
                      COLORS.text
                  }}
                >
                  {statusLabels[
                    ticket.transfer_status
                  ] ||
                    ticket.transfer_status}
                </strong>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TransferDetail({
  transfer,
  storeId,
  onBack,
  onReceived
}) {
  const canReceive =
    transfer.can_receive &&
    Number(storeId) ===
      Number(
        transfer.destination_store
          .store_id
      );

  const [receiptItems, setReceiptItems] =
    useState(() =>
      Object.fromEntries(
        transfer.items.map(item => [
          item.transfer_item_id,
          {
            destination_product:
              item.destination_product ||
              item
                .suggested_destination_product ||
              null,
            quantity_received:
              item.quantity_received ??
              item.quantity_sent
          }
        ])
      )
    );

  const [activeItemId, setActiveItemId] =
    useState(null);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState(
    []
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");

  const totals = useMemo(
    () => ({
      sent: transfer.items.reduce(
        (sum, item) =>
          sum + item.quantity_sent,
        0
      ),
      received: transfer.items.reduce(
        (sum, item) =>
          sum +
          Number(
            item.quantity_received || 0
          ),
        0
      )
    }),
    [transfer.items]
  );

  const searchDestinationProducts =
    async (transferItemId, value) => {
      setActiveItemId(
        transferItemId
      );
      setSearch(value);

      const term = String(
        value || ""
      ).trim();

      if (term.length < 2) {
        setResults([]);
        return;
      }

      try {
        const products =
          await searchCachedProducts(
            storeId,
            term
          );

        setResults(
          products.filter(
            product =>
              isTrackedProduct(product) &&
              isActiveProduct(product)
          )
        );
      } catch (searchError) {
        console.error(
          "TRANSFER MAPPING SEARCH ERROR:",
          searchError
        );

        setResults([]);
      }
    };

  const chooseDestinationProduct = product => {
    setReceiptItems(current => ({
      ...current,
      [activeItemId]: {
        ...current[activeItemId],
        destination_product: {
          product_id:
            product.product_id,
          product_name:
            product.name,
          stock:
            product.stock
        }
      }
    }));

    setSearch("");
    setResults([]);
    setActiveItemId(null);
    setError("");
  };

  const updateReceivedQuantity = (
    transferItemId,
    value
  ) => {
    setReceiptItems(current => ({
      ...current,
      [transferItemId]: {
        ...current[transferItemId],
        quantity_received: value
      }
    }));
  };

  const submitReceipt = async () => {
    if (submitting) return;

    if (!navigator.onLine) {
      setError(
        "Receiving confirmation requires an internet connection."
      );
      return;
    }

    const selectedProductIds =
      transfer.items.map(
        item =>
          receiptItems[
            item.transfer_item_id
          ]?.destination_product
            ?.product_id
      );

    if (
      selectedProductIds.some(
        value => !value
      )
    ) {
      setError(
        "Select a local product for every line."
      );
      return;
    }

    if (
      new Set(selectedProductIds).size !==
      selectedProductIds.length
    ) {
      setError(
        "Each line must use a different local product."
      );
      return;
    }

    const invalidItem =
      transfer.items.find(item => {
        const quantity = Number(
          receiptItems[
            item.transfer_item_id
          ]?.quantity_received
        );

        return (
          !Number.isInteger(quantity) ||
          quantity < 0 ||
          quantity >
            item.quantity_sent
        );
      });

    if (invalidItem) {
      setError(
        "Received quantities must be whole numbers between zero and the quantity sent."
      );
      return;
    }

    const clientEventId =
      createClientEventId(
        "transfer-receipt"
      );

    const deviceId =
      getOrCreateDeviceId();

    const clientCreatedAt =
      new Date().toISOString();

    const payload = {
      store_id: storeId,
      items: transfer.items.map(
        item => ({
          transfer_item_id:
            item.transfer_item_id,
          destination_product_id:
            receiptItems[
              item.transfer_item_id
            ].destination_product
              .product_id,
          quantity_received: Number(
            receiptItems[
              item.transfer_item_id
            ].quantity_received
          )
        })
      ),
      note: note.trim() || null,
      client_event_id:
        clientEventId,
      device_id: deviceId,
      client_created_at:
        clientCreatedAt
    };

    setSubmitting(true);
    setError("");

    try {
      const response = await apiClient.post(
        `/transfer-tickets/${transfer.transfer_id}/receive`,
        payload
      );

      if (
        response.data.status !==
          "accepted" &&
        response.data.status !==
          "already_processed"
      ) {
        throw new Error(
          "Unexpected transfer receipt status"
        );
      }

      alert(
        response.data.transfer_status ===
          "received_with_discrepancy"
          ? (
              "Transfer received with a "
              + "quantity discrepancy."
            )
          : "Transfer received."
      );

      if (onReceived) {
        await onReceived();
      }
    } catch (submitError) {
      console.error(
        "TRANSFER RECEIPT ERROR:",
        submitError
      );

      setError(
        submitError.response?.data?.detail ||
        "Unable to confirm receipt."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={panelStyle}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
          paddingBottom: 12,
          borderBottom:
            `1px solid ${COLORS.border}`
        }}
      >
        <div>
          <button
            type="button"
            onClick={onBack}
            style={{
              ...btnSecondary,
              marginBottom: 10
            }}
          >
            Back
          </button>

          <h3 style={{ margin: 0 }}>
            TR-{String(
              transfer.transfer_number
            ).padStart(5, "0")}
          </h3>

          <div
            style={{
              color: COLORS.textDim,
              marginTop: 5
            }}
          >
            {
              transfer.origin_store
                .store_name
            }
            {" → "}
            {
              transfer.destination_store
                .store_name
            }
          </div>
        </div>

        <strong
          style={{
            color:
              statusColors[
                transfer.transfer_status
              ] || COLORS.text
          }}
        >
          {statusLabels[
            transfer.transfer_status
          ] ||
            transfer.transfer_status}
        </strong>
      </div>

      <div
        style={{
          ...scrollAreaStyle,
          paddingTop: 12
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 8,
            marginBottom: 12
          }}
        >
          <div style={rowStyle}>
            <span style={labelStyle}>
              Dispatched
            </span>
            {formatDateTime(
              transfer.dispatched_at
            )}
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>
              Items / units
            </span>
            {transfer.items.length} /{" "}
            {totals.sent}
          </div>

          {transfer.received_at && (
            <div style={rowStyle}>
              <span style={labelStyle}>
                Received
              </span>
              {formatDateTime(
                transfer.received_at
              )}
            </div>
          )}

          {transfer.received_at && (
            <div style={rowStyle}>
              <span style={labelStyle}>
                Units received
              </span>
              {totals.received}
            </div>
          )}
        </div>

        {transfer.note && (
          <div
            style={{
              ...rowStyle,
              marginBottom: 12
            }}
          >
            <span style={labelStyle}>
              Transfer note
            </span>
            {transfer.note}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gap: 10
          }}
        >
          {transfer.items.map(item => {
            const receiptItem =
              receiptItems[
                item.transfer_item_id
              ];

            const selectedProduct =
              receiptItem
                ?.destination_product;

            return (
              <div
                key={item.transfer_item_id}
                style={rowStyle}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(180px, 1fr) 100px",
                    gap: 10,
                    marginBottom:
                      canReceive ? 10 : 0
                  }}
                >
                  <div>
                    <span style={labelStyle}>
                      Sent product
                    </span>

                    <strong>
                      {
                        item.origin_product
                          .product_name
                      }
                    </strong>
                  </div>

                  <div>
                    <span style={labelStyle}>
                      Sent
                    </span>
                    {item.quantity_sent}
                  </div>
                </div>

                {canReceive ? (
                  <>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(200px, 1fr) 110px",
                        gap: 10,
                        alignItems: "end"
                      }}
                    >
                      <div>
                        <span style={labelStyle}>
                          Destination product
                        </span>

                        {selectedProduct && (
                          <div
                            style={{
                              marginBottom: 6,
                              color:
                                COLORS.primary
                            }}
                          >
                            <strong>
                              {
                                selectedProduct
                                  .product_name
                              }
                            </strong>

                            {item
                              .suggested_destination_product
                              ?.source ===
                              "confirmed_mapping" &&
                              selectedProduct
                                .product_id ===
                                item
                                  .suggested_destination_product
                                  .product_id && (
                                <span
                                  style={{
                                    color:
                                      COLORS.textDim,
                                    marginLeft: 6,
                                    fontSize: 12
                                  }}
                                >
                                  Previous match
                                </span>
                              )}
                          </div>
                        )}

                        <input
                          value={
                            activeItemId ===
                            item.transfer_item_id
                              ? search
                              : ""
                          }
                          onFocus={() =>
                            setActiveItemId(
                              item.transfer_item_id
                            )
                          }
                          onChange={event =>
                            searchDestinationProducts(
                              item.transfer_item_id,
                              event.target.value
                            )
                          }
                          placeholder={
                            selectedProduct
                              ? "Search to change"
                              : "Search local products"
                          }
                          disabled={submitting}
                          style={{
                            ...input,
                            width: "100%"
                          }}
                        />
                      </div>

                      <label>
                        <span style={labelStyle}>
                          Received
                        </span>

                        <input
                          type="number"
                          min="0"
                          max={
                            item.quantity_sent
                          }
                          step="1"
                          value={
                            receiptItem
                              ?.quantity_received
                          }
                          onChange={event =>
                            updateReceivedQuantity(
                              item.transfer_item_id,
                              event.target.value
                            )
                          }
                          disabled={submitting}
                          style={{
                            ...input,
                            width: "100%"
                          }}
                        />
                      </label>
                    </div>

                    {activeItemId ===
                      item.transfer_item_id &&
                      results.length > 0 && (
                        <div
                          style={{
                            display: "grid",
                            gap: 5,
                            maxHeight: 150,
                            overflowY: "auto",
                            marginTop: 6
                          }}
                        >
                          {results.map(
                            product => (
                              <button
                                key={
                                  product.product_id
                                }
                                type="button"
                                onClick={() =>
                                  chooseDestinationProduct(
                                    product
                                  )
                                }
                                style={{
                                  ...btnSecondary,
                                  textAlign:
                                    "left"
                                }}
                              >
                                {product.name} ·
                                Stock:{" "}
                                {Number(
                                  product.stock ||
                                  0
                                )}
                              </button>
                            )
                          )}
                        </div>
                      )}
                  </>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(180px, 1fr) 100px",
                      gap: 10,
                      marginTop: 8
                    }}
                  >
                    <div>
                      <span style={labelStyle}>
                        Destination product
                      </span>
                      {item
                        .destination_product
                        ?.product_name ||
                        "Awaiting mapping"}
                    </div>

                    <div>
                      <span style={labelStyle}>
                        Received
                      </span>
                      {item.quantity_received ??
                        "—"}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {canReceive && (
          <label
            style={{
              display: "block",
              marginTop: 12
            }}
          >
            <span style={labelStyle}>
              Receiving note
            </span>

            <input
              value={note}
              onChange={event =>
                setNote(
                  event.target.value
                )
              }
              placeholder="Optional"
              disabled={submitting}
              style={{
                ...input,
                width: "100%"
              }}
            />
          </label>
        )}

        {error && (
          <div
            style={{
              color: COLORS.danger,
              marginTop: 12
            }}
          >
            {typeof error === "string"
              ? error
              : JSON.stringify(error)}
          </div>
        )}
      </div>

      {canReceive && (
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            paddingTop: 12,
            marginTop: 12,
            borderTop:
              `1px solid ${COLORS.border}`
          }}
        >
          <button
            type="button"
            onClick={submitReceipt}
            disabled={submitting}
            style={{
              ...btnPrimary,
              opacity:
                submitting ? 0.6 : 1
            }}
          >
            {submitting
              ? "Confirming…"
              : "Confirm Receipt"}
          </button>
        </div>
      )}
    </div>
  );
}

export default TransferPanel;
