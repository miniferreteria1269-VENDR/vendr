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
import { useLang } from "../LanguageContext";

const translateTemplate = (
  t,
  key,
  values = {}
) => {
  let text = t(key);

  Object.entries(values).forEach(
    ([name, value]) => {
      text = text.replace(
        `{${name}}`,
        String(value)
      );
    }
  );

  return text;
};

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

const statusTranslationKeys = {
  created: "transfer_status_created",
  dispatched:
    "transfer_status_dispatched",
  received: "transfer_status_received",
  received_with_discrepancy:
    "transfer_status_discrepancy",
  cancelled:
    "transfer_status_cancelled"
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
  onProductsChanged,
  onTransferStatusChanged
}) {
  const { t } = useLang();

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
          t(
            "transfer_history_requires_connection"
          )
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
          t("transfer_tickets_load_failed")
        );
      } finally {
        setLoading(false);
      }
    },
    [storeId, t]
  );

  const openTicket = async transferId => {
    if (!navigator.onLine) {
      setError(
        t(
          "transfer_details_requires_connection"
        )
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
        t("transfer_details_load_failed")
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
            {t("stock_transfers")}
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
            ["incoming", t("incoming")],
            ["sent", t("sent")],
            ["create", t("new_transfer")]
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

                if (
                  onTransferStatusChanged
                ) {
                  await onTransferStatusChanged();
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

                if (
                  onTransferStatusChanged
                ) {
                  await onTransferStatusChanged();
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
                ? t("no_incoming_transfers")
                : t("no_sent_transfers")
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
  const { t } = useLang();

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
        t("transfer_product_already_added")
      );
      return;
    }

    const stock = Number(
      product.stock || 0
    );

    if (stock <= 0) {
      setError(
        t("transfer_product_no_stock")
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
        t("select_destination_store")
      );
      return;
    }

    if (items.length === 0) {
      setError(
        t("transfer_add_one_product")
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
        translateTemplate(
          t,
          "transfer_quantity_invalid",
          {
            product: invalidItem.name,
            stock: invalidItem.stock
          }
        )
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
          ? t("transfer_dispatched")
          : t("transfer_saved_pending")
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
        t("transfer_save_failed")
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
              {t("destination_store")}
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
                {t("select_destination")}
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
              {t("general_note")}
            </span>

            <input
              value={note}
              onChange={event =>
                setNote(
                  event.target.value
                )
              }
              placeholder={t("optional")}
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
            {t("add_products")}
          </span>

          <input
            value={search}
            onChange={event =>
              searchProducts(
                event.target.value
              )
            }
            placeholder={t(
              "search_local_products"
            )}
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
                  {t("stock")}: {Number(
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
          {t("transfer_items")}
        </div>

        {items.length === 0 ? (
          <div
            style={{
              color: COLORS.textDim,
              padding: "18px 0"
            }}
          >
            {t("no_products_added")}
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
                    {t("available")}:{" "}
                    {item.stock}
                  </div>
                </div>

                <label>
                  <span style={labelStyle}>
                    {t("quantity")}
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
                  {t("remove")}
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
          {t("clear")}
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
            ? t("saving")
            : t("dispatch_transfer")}
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
  const { t } = useLang();

  if (loading) {
    return (
      <div style={panelStyle}>
        {t("loading_transfers")}
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
                  {ticket.item_count}{" "}
                  {t("items")} ·{" "}
                  {ticket.units_sent}{" "}
                  {t("units")}
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
                  {statusTranslationKeys[
                    ticket.transfer_status
                  ]
                    ? t(
                        statusTranslationKeys[
                          ticket
                            .transfer_status
                        ]
                      )
                    : ticket.transfer_status}
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
  const { t } = useLang();

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
        t(
          "transfer_receipt_requires_connection"
        )
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
        t(
          "select_local_product_every_line"
        )
      );
      return;
    }

    if (
      new Set(selectedProductIds).size !==
      selectedProductIds.length
    ) {
      setError(
        t(
          "transfer_unique_local_products"
        )
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
        t(
          "received_quantity_invalid"
        )
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
          ? t(
              "transfer_received_discrepancy"
            )
          : t("transfer_received")
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
        t("transfer_receipt_failed")
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
            {t("back")}
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
          {statusTranslationKeys[
            transfer.transfer_status
          ]
            ? t(
                statusTranslationKeys[
                  transfer.transfer_status
                ]
              )
            : transfer.transfer_status}
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
              {t("dispatched")}
            </span>
            {formatDateTime(
              transfer.dispatched_at
            )}
          </div>

          <div style={rowStyle}>
            <span style={labelStyle}>
              {t("items_units")}
            </span>
            {transfer.items.length} /{" "}
            {totals.sent}
          </div>

          {transfer.received_at && (
            <div style={rowStyle}>
              <span style={labelStyle}>
                {t("received")}
              </span>
              {formatDateTime(
                transfer.received_at
              )}
            </div>
          )}

          {transfer.received_at && (
            <div style={rowStyle}>
              <span style={labelStyle}>
                {t("units_received")}
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
              {t("transfer_note")}
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
                      {t("sent_product")}
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
                      {t("sent")}
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
                          {t(
                            "destination_product"
                          )}
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
                                  {t(
                                    "previous_match"
                                  )}
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
                              ? t(
                                  "search_to_change"
                                )
                              : t(
                                  "search_local_products"
                                )
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
                          {t("received")}
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
                        {t(
                          "destination_product"
                        )}
                      </span>
                      {item
                        .destination_product
                        ?.product_name ||
                        t("awaiting_mapping")}
                    </div>

                    <div>
                      <span style={labelStyle}>
                        {t("received")}
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
              {t("receiving_note")}
            </span>

            <input
              value={note}
              onChange={event =>
                setNote(
                  event.target.value
                )
              }
              placeholder={t("optional")}
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
              ? t("confirming")
              : t("confirm_receipt")}
          </button>
        </div>
      )}
    </div>
  );
}

export default TransferPanel;
