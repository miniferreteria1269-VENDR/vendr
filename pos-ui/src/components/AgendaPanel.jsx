import { useEffect, useMemo, useState } from "react";
import apiClient from "../apiClient";
import { useLang } from "../LanguageContext";
import {
  COLORS,
  btnPrimary,
  btnSecondary,
  btnDanger,
  input
} from "../uiStyles";

const getLocalDateValue = date => {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
};

const emptyForm = {
  title: "",
  notes: "",
  scheduled_date: getLocalDateValue(new Date()),
  scheduled_time: "",
  recurrence_type: "none",
  recurrence_weekdays: [],
  recurrence_day_of_month: ""
};

function AgendaPanel({ storeId }) {
  const { t } = useLang();

  const text = (
    key,
    fallback,
    replacements = {}
  ) => {
    const translated = t(key);

    let value =
      !translated || translated === key
        ? fallback
        : translated;

    Object.entries(replacements).forEach(
      ([name, replacement]) => {
        value = value.replaceAll(
          `{${name}}`,
          String(replacement)
        );
      }
    );

    return value;
  };

  const today =
    getLocalDateValue(new Date());

  const [rangeView, setRangeView] =
    useState("today");

  const [startDate, setStartDate] =
    useState(today);

  const [endDate, setEndDate] =
    useState(today);

  const [statusFilter, setStatusFilter] =
    useState("open");

  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [formOpen, setFormOpen] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [submitting, setSubmitting] =
    useState(false);

  const [busyKey, setBusyKey] =
    useState("");

  const invalidDateRange =
    !startDate ||
    !endDate ||
    startDate > endDate;

  const setTodayRange = () => {
    setRangeView("today");
    setStartDate(today);
    setEndDate(today);
  };

  const setWeekRange = () => {
    const now = new Date();

    const day =
      now.getDay() || 7;

    const monday =
      new Date(now);

    monday.setDate(
      now.getDate() - day + 1
    );

    const sunday =
      new Date(monday);

    sunday.setDate(
      monday.getDate() + 6
    );

    setRangeView("week");

    setStartDate(
      getLocalDateValue(monday)
    );

    setEndDate(
      getLocalDateValue(sunday)
    );
  };

  const loadAgenda = async () => {
    if (
      !storeId ||
      invalidDateRange
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await apiClient.get(
          "/agenda-items",
          {
            params: {
              store_id: storeId,
              start_date: startDate,
              end_date: endDate
            }
          }
        );

      setItems(
        response.data.agenda_items ||
        []
      );
    } catch (err) {
      console.error(
        "AGENDA LOAD ERROR:",
        err
      );

      setItems([]);

      setError(
        err.response?.data?.detail ||
        text(
          "agenda_load_failed",
          "Unable to load agenda items."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgenda();
  }, [
    storeId,
    startDate,
    endDate
  ]);

  const visibleItems =
    useMemo(() => {
      if (
        statusFilter === "completed"
      ) {
        return items.filter(
          item => item.is_completed
        );
      }

      if (
        statusFilter === "open"
      ) {
        return items.filter(
          item => !item.is_completed
        );
      }

      return items;
    }, [
      items,
      statusFilter
    ]);

  const completedCount =
    items.filter(
      item => item.is_completed
    ).length;

  const overdueCount =
    items.filter(
      item => item.is_overdue
    ).length;

  const openCreate = () => {
    setEditingItem(null);

    setForm({
      ...emptyForm,
      scheduled_date: today
    });

    setError("");
    setFormOpen(true);
  };

  const openEdit = item => {
    setEditingItem(item);

    setForm({
      title:
        item.title || "",

      notes:
        item.notes || "",

      scheduled_date:
        item.scheduled_date ||
        item.occurrence_date,

      scheduled_time:
        item.scheduled_time
          ? String(
              item.scheduled_time
            ).slice(0, 5)
          : "",

      recurrence_type:
        item.recurrence_type ||
        "none",

      recurrence_weekdays:
        item.recurrence_weekdays ||
        [],

      recurrence_day_of_month:
        item.recurrence_day_of_month ==
        null
          ? ""
          : String(
              item.recurrence_day_of_month
            )
    });

    setError("");
    setFormOpen(true);
  };

  const closeForm = () => {
    if (submitting) return;

    setFormOpen(false);
    setEditingItem(null);
    setForm(emptyForm);
  };

  const updateForm = (
    field,
    value
  ) => {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  };

  const toggleWeekday = day => {
    setForm(previous => {
      const selected =
        previous
          .recurrence_weekdays
          .includes(day);

      return {
        ...previous,

        recurrence_weekdays:
          selected
            ? previous
                .recurrence_weekdays
                .filter(
                  value =>
                    value !== day
                )
            : [
                ...previous
                  .recurrence_weekdays,
                day
              ].sort(
                (a, b) => a - b
              )
      };
    });
  };

  const saveItem = async () => {
    const title =
      form.title.trim();

    if (!title) {
      setError(
        text(
          "agenda_title_required",
          "Agenda item title is required."
        )
      );

      return;
    }

    if (
      form.recurrence_type ===
        "weekly" &&
      form.recurrence_weekdays
        .length === 0
    ) {
      setError(
        text(
          "agenda_weekday_required",
          "Select at least one weekday."
        )
      );

      return;
    }

    if (
      form.recurrence_type ===
        "monthly" &&
      (
        !form.recurrence_day_of_month ||
        Number(
          form.recurrence_day_of_month
        ) < 1 ||
        Number(
          form.recurrence_day_of_month
        ) > 31
      )
    ) {
      setError(
        text(
          "agenda_month_day_required",
          "Enter a day of the month from 1 to 31."
        )
      );

      return;
    }

    const payload = {
      title,

      notes:
        form.notes.trim() ||
        null,

      scheduled_date:
        form.scheduled_date,

      scheduled_time:
        form.scheduled_time ||
        null,

      recurrence_type:
        form.recurrence_type,

      recurrence_weekdays:
        form.recurrence_type ===
        "weekly"
          ? form.recurrence_weekdays
          : null,

      recurrence_day_of_month:
        form.recurrence_type ===
        "monthly"
          ? Number(
              form.recurrence_day_of_month
            )
          : null
    };

    setSubmitting(true);
    setError("");

    try {
      if (editingItem) {
        await apiClient.put(
          `/agenda-items/${editingItem.agenda_item_id}`,
          payload,
          {
            params: {
              store_id: storeId
            }
          }
        );
      } else {
        await apiClient.post(
          "/agenda-items",
          {
            store_id: storeId,
            ...payload
          }
        );
      }

      setFormOpen(false);
      setEditingItem(null);
      setForm(emptyForm);

      await loadAgenda();
    } catch (err) {
      console.error(
        "AGENDA SAVE ERROR:",
        err
      );

      setError(
        err.response?.data?.detail ||
        text(
          "agenda_save_failed",
          "Unable to save agenda item."
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCompleted =
    async item => {
      const key =
        `${item.agenda_item_id}-${item.occurrence_date}`;

      if (busyKey) return;

      setBusyKey(key);
      setError("");

      try {
        if (item.is_completed) {
          await apiClient.delete(
            `/agenda-items/${item.agenda_item_id}/completions/${item.occurrence_date}`,
            {
              params: {
                store_id: storeId
              }
            }
          );
        } else {
          await apiClient.patch(
            `/agenda-items/${item.agenda_item_id}/complete`,
            {
              store_id: storeId,
              occurrence_date:
                item.occurrence_date
            }
          );
        }

        await loadAgenda();
      } catch (err) {
        console.error(
          "AGENDA COMPLETION ERROR:",
          err
        );

        setError(
          err.response?.data?.detail ||
          text(
            "agenda_completion_failed",
            "Unable to change completion status."
          )
        );
      } finally {
        setBusyKey("");
      }
    };

  const deleteItem =
    async item => {
      const recurring =
        item.recurrence_type !==
        "none";

      const message =
        recurring
          ? text(
              "confirm_delete_recurring_agenda",
              "Delete {title} and its complete recurring series?",
              {
                title: item.title
              }
            )
          : text(
              "confirm_delete_agenda",
              "Delete {title}?",
              {
                title: item.title
              }
            );

      if (
        !window.confirm(message) ||
        busyKey
      ) {
        return;
      }

      setBusyKey(
        `delete-${item.agenda_item_id}`
      );

      setError("");

      try {
        await apiClient.delete(
          `/agenda-items/${item.agenda_item_id}`,
          {
            params: {
              store_id: storeId
            }
          }
        );

        await loadAgenda();
      } catch (err) {
        console.error(
          "AGENDA DELETE ERROR:",
          err
        );

        setError(
          err.response?.data?.detail ||
          text(
            "agenda_delete_failed",
            "Unable to delete agenda item."
          )
        );
      } finally {
        setBusyKey("");
      }
    };

  const recurrenceLabel =
    item => {
      if (
        item.recurrence_type ===
        "daily"
      ) {
        return text(
          "daily",
          "Daily"
        );
      }

      if (
        item.recurrence_type ===
        "weekly"
      ) {
        return text(
          "weekly",
          "Weekly"
        );
      }

      if (
        item.recurrence_type ===
        "monthly"
      ) {
        return text(
          "monthly",
          "Monthly"
        );
      }

      return text(
        "one_time",
        "One-time"
      );
    };

  const displayDate = value => {
    if (!value) return "—";

    const parsed =
      new Date(
        `${value}T00:00:00`
      );

    return Number.isNaN(
      parsed.getTime()
    )
      ? value
      : parsed.toLocaleDateString();
  };

  const displayTime = value => {
    if (!value) {
      return text(
        "any_time",
        "Any time"
      );
    }

    const [hours, minutes] =
      String(value).split(":");

    const parsed =
      new Date();

    parsed.setHours(
      Number(hours),
      Number(minutes),
      0,
      0
    );

    return parsed.toLocaleTimeString(
      [],
      {
        hour: "numeric",
        minute: "2-digit"
      }
    );
  };

  return (
    <div style={panelStyle}>
      <div style={toolbarStyle}>
        <div style={buttonRowStyle}>
          <button
            type="button"
            onClick={setTodayRange}
            style={
              rangeView === "today"
                ? btnPrimary
                : btnSecondary
            }
          >
            {text(
              "today",
              "Today"
            )}
          </button>

          <button
            type="button"
            onClick={setWeekRange}
            style={
              rangeView === "week"
                ? btnPrimary
                : btnSecondary
            }
          >
            {text(
              "this_week",
              "This Week"
            )}
          </button>

          <button
            type="button"
            onClick={() =>
              setRangeView("custom")
            }
            style={
              rangeView === "custom"
                ? btnPrimary
                : btnSecondary
            }
          >
            {text(
              "custom_range",
              "Custom"
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={openCreate}
          style={btnPrimary}
        >
          +{" "}
          {text(
            "new_agenda_item",
            "New Item"
          )}
        </button>
      </div>

      {rangeView === "custom" && (
        <div style={dateRowStyle}>
          <input
            type="date"
            value={startDate}
            onChange={event =>
              setStartDate(
                event.target.value
              )
            }
            style={input}
          />

          <input
            type="date"
            value={endDate}
            onChange={event =>
              setEndDate(
                event.target.value
              )
            }
            style={input}
          />
        </div>
      )}

      <div style={summaryRowStyle}>
        <span>
          {text(
            "agenda_occurrences",
            "Items"
          )}
          :{" "}
          <strong>
            {items.length}
          </strong>
        </span>

        <span>
          {text(
            "completed",
            "Completed"
          )}
          :{" "}
          <strong>
            {completedCount}
          </strong>
        </span>

        <span
          style={{
            color: overdueCount
              ? COLORS.danger
              : COLORS.textDim
          }}
        >
          {text(
            "overdue",
            "Overdue"
          )}
          :{" "}
          <strong>
            {overdueCount}
          </strong>
        </span>
      </div>

      <div style={buttonRowStyle}>
        {[
          [
            "open",
            text(
              "open",
              "Open"
            )
          ],
          [
            "all",
            text(
              "all",
              "All"
            )
          ],
                [
            "completed",
            text(
              "completed",
              "Completed"
            )
          ]
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              setStatusFilter(key)
            }
            style={
              statusFilter === key
                ? btnPrimary
                : btnSecondary
            }
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}

      <div style={listStyle}>
        {loading ? (
          <div style={emptyStyle}>
            {text(
              "loading",
              "Loading..."
            )}
          </div>
        ) : visibleItems.length === 0 ? (
          <div style={emptyStyle}>
            {text(
              "no_agenda_items",
              "No agenda items in this view."
            )}
          </div>
        ) : (
          visibleItems.map(item => {
            const key =
              `${item.agenda_item_id}-${item.occurrence_date}`;

            const busy =
              busyKey === key ||
              busyKey ===
                `delete-${item.agenda_item_id}`;

            return (
              <div
                key={key}
                style={{
                  ...itemStyle,

                  opacity:
                    item.is_completed
                      ? 0.62
                      : 1,

                  borderLeft:
                    `4px solid ${
                      item.is_overdue
                        ? COLORS.danger
                        : item.is_completed
                          ? "#3ddc84"
                          : COLORS.primary
                    }`
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleCompleted(item)
                  }
                  disabled={Boolean(
                    busyKey
                  )}
                  aria-label={
                    item.is_completed
                      ? text(
                          "reopen",
                          "Reopen"
                        )
                      : text(
                          "complete",
                          "Complete"
                        )
                  }
                  style={checkButtonStyle}
                >
                  {busy
                    ? "…"
                    : item.is_completed
                      ? "✓"
                      : ""}
                </button>

                <div
                  style={{
                    flex: 1,
                    minWidth: 0
                  }}
                >
                  <div
                    style={itemHeaderStyle}
                  >
                    <strong
                      style={{
                        textDecoration:
                          item.is_completed
                            ? "line-through"
                            : "none"
                      }}
                    >
                      {item.title}
                    </strong>

                    <span
                      style={badgeStyle}
                    >
                      {recurrenceLabel(
                        item
                      )}
                    </span>

                    {item.is_overdue && (
                      <span
                        style={
                          overdueBadgeStyle
                        }
                      >
                        {text(
                          "overdue",
                          "Overdue"
                        )}
                      </span>
                    )}
                  </div>

                  <div
                    style={metadataStyle}
                  >
                    <span>
                      {displayDate(
                        item.occurrence_date
                      )}
                    </span>

                    <span>
                      {displayTime(
                        item.scheduled_time
                      )}
                    </span>
                  </div>

                  {item.notes && (
                    <div
                      style={notesStyle}
                    >
                      {item.notes}
                    </div>
                  )}
                </div>

                <div
                  style={actionsStyle}
                >
                  <button
                    type="button"
                    onClick={() =>
                      openEdit(item)
                    }
                    disabled={Boolean(
                      busyKey
                    )}
                    style={btnSecondary}
                  >
                    {text(
                      "edit",
                      "Edit"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      deleteItem(item)
                    }
                    disabled={Boolean(
                      busyKey
                    )}
                    style={btnDanger}
                  >
                    {text(
                      "delete",
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {formOpen && (
        <div
          role="presentation"
          onMouseDown={closeForm}
          style={backdropStyle}
        >
          <div
            role="dialog"
            aria-modal="true"
            onMouseDown={event =>
              event.stopPropagation()
            }
            style={modalStyle}
          >
            <div
              style={modalHeaderStyle}
            >
              <h3
                style={{
                  margin: 0
                }}
              >
                {editingItem
                  ? text(
                      "edit_agenda_item",
                      "Edit Agenda Item"
                    )
                  : text(
                      "new_agenda_item",
                      "New Agenda Item"
                    )}
              </h3>

              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                style={closeButtonStyle}
              >
                ×
              </button>
            </div>

            <label style={fieldStyle}>
              <span>
                {text(
                  "title",
                  "Title"
                )}{" "}
                *
              </span>

              <input
                maxLength={160}
                value={form.title}
                onChange={event =>
                  updateForm(
                    "title",
                    event.target.value
                  )
                }
                style={{
                  ...input,
                  width: "100%"
                }}
              />
            </label>

            <label style={fieldStyle}>
              <span>
                {text(
                  "notes",
                  "Notes"
                )}
              </span>

              <textarea
                value={form.notes}
                onChange={event =>
                  updateForm(
                    "notes",
                    event.target.value
                  )
                }
                rows={3}
                style={{
                  ...input,
                  width: "100%",
                  resize: "vertical"
                }}
              />
            </label>

            <div
              style={formGridStyle}
            >
              <label
                style={fieldStyle}
              >
                <span>
                  {text(
                    "scheduled_date",
                    "Starting Date"
                  )}{" "}
                  *
                </span>

                <input
                  type="date"
                  value={
                    form.scheduled_date
                  }
                  onChange={event =>
                    updateForm(
                      "scheduled_date",
                      event.target.value
                    )
                  }
                  style={{
                    ...input,
                    width: "100%"
                  }}
                />
              </label>

              <label
                style={fieldStyle}
              >
                <span>
                  {text(
                    "scheduled_time",
                    "Time"
                  )}
                </span>

                <input
                  type="time"
                  value={
                    form.scheduled_time
                  }
                  onChange={event =>
                    updateForm(
                      "scheduled_time",
                      event.target.value
                    )
                  }
                  style={{
                    ...input,
                    width: "100%"
                  }}
                />
              </label>
            </div>

            <label style={fieldStyle}>
              <span>
                {text(
                  "recurrence",
                  "Recurrence"
                )}
              </span>

              <select
                value={
                  form.recurrence_type
                }
                onChange={event =>
                  updateForm(
                    "recurrence_type",
                    event.target.value
                  )
                }
                style={{
                  ...input,
                  width: "100%"
                }}
              >
                <option value="none">
                  {text(
                    "one_time",
                    "One-time"
                  )}
                </option>

                <option value="daily">
                  {text(
                    "daily",
                    "Daily"
                  )}
                </option>

                <option value="weekly">
                  {text(
                    "weekly",
                    "Weekly"
                  )}
                </option>

                <option value="monthly">
                  {text(
                    "monthly",
                    "Monthly"
                  )}
                </option>
              </select>
            </label>

            {form.recurrence_type ===
              "weekly" && (
              <div style={fieldStyle}>
                <span>
                  {text(
                    "weekdays",
                    "Weekdays"
                  )}
                </span>

                <div
                  style={weekdayRowStyle}
                >
                  {[
                    [
                      1,
                      text(
                        "monday_short",
                        "Mon"
                      )
                    ],
                    [
                      2,
                      text(
                        "tuesday_short",
                        "Tue"
                      )
                    ],
                    [
                      3,
                      text(
                        "wednesday_short",
                        "Wed"
                      )
                    ],
                    [
                      4,
                      text(
                        "thursday_short",
                        "Thu"
                      )
                    ],
                    [
                      5,
                      text(
                        "friday_short",
                        "Fri"
                      )
                    ],
                    [
                      6,
                      text(
                        "saturday_short",
                        "Sat"
                      )
                    ],
                    [
                      7,
                      text(
                        "sunday_short",
                        "Sun"
                      )
                    ]
                  ].map(
                    ([day, label]) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() =>
                          toggleWeekday(
                            day
                          )
                        }
                        style={
                          form
                            .recurrence_weekdays
                            .includes(day)
                            ? btnPrimary
                            : btnSecondary
                        }
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {form.recurrence_type ===
              "monthly" && (
              <label
                style={fieldStyle}
              >
                <span>
                  {text(
                    "day_of_month",
                    "Day of Month"
                  )}
                </span>

                <input
                  type="number"
                  min="1"
                  max="31"
                  step="1"
                  value={
                    form
                      .recurrence_day_of_month
                  }
                  onChange={event =>
                    updateForm(
                      "recurrence_day_of_month",
                      event.target.value
                    )
                  }
                  style={{
                    ...input,
                    width: "100%"
                  }}
                />
              </label>
            )}

            {error && (
              <div style={errorStyle}>
                {error}
              </div>
            )}

            <div
              style={modalActionsStyle}
            >
              <button
                type="button"
                onClick={saveItem}
                disabled={submitting}
                style={{
                  ...btnPrimary,
                  opacity:
                    submitting
                      ? 0.6
                      : 1
                }}
              >
                {submitting
                  ? text(
                      "saving",
                      "Saving..."
                    )
                  : text(
                      "save",
                      "Save"
                    )}
              </button>

              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                style={btnSecondary}
              >
                {text(
                  "cancel",
                  "Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const panelStyle = {
  padding: 16,
  flex: 1,
  minHeight: 0,
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  gap: 10
};

const toolbarStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap"
};

const buttonRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const dateRowStyle = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap"
};

const summaryRowStyle = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  padding: "8px 10px",
  background: COLORS.panel,
  borderRadius: 8,
  color: COLORS.textDim
};

const listStyle = {
  flex: 1,
  minHeight: 180,
  overflowY: "auto",
  display: "flex",
  flexDirection: "column",
  gap: 8,
  paddingRight: 3
};

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: 10,
  background: COLORS.panel,
  borderRadius: 9,
  border: `1px solid ${COLORS.border}`
};

const itemHeaderStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap"
};

const metadataStyle = {
  display: "flex",
  gap: 12,
  marginTop: 3,
  color: COLORS.textDim,
  fontSize: 12
};

const notesStyle = {
  marginTop: 5,
  color: COLORS.textDim,
  whiteSpace: "pre-wrap"
};

const badgeStyle = {
  padding: "2px 6px",
  borderRadius: 999,
  background: COLORS.panelAlt,
  color: COLORS.textDim,
  fontSize: 11
};

const overdueBadgeStyle = {
  ...badgeStyle,
  color: COLORS.danger,
  background:
    "rgba(255,92,92,0.12)"
};

const actionsStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
  justifyContent: "flex-end"
};

const checkButtonStyle = {
  width: 30,
  height: 30,
  flex: "0 0 auto",
  borderRadius: 7,
  border:
    `2px solid ${COLORS.primary}`,
  background: "transparent",
  color: "#3ddc84",
  fontWeight: 800,
  cursor: "pointer"
};

const emptyStyle = {
  padding: 24,
  textAlign: "center",
  color: COLORS.textDim,
  background: COLORS.panel,
  borderRadius: 8
};

const errorStyle = {
  padding: 10,
  borderRadius: 8,
  background:
    "rgba(255,92,92,0.12)",
  color: COLORS.danger
};

const backdropStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 1100,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  background:
    "rgba(0,0,0,0.74)"
};

const modalStyle = {
  width: "min(680px, 100%)",
  maxHeight: "90dvh",
  overflowY: "auto",
  boxSizing: "border-box",
  padding: 20,
  border:
    `1px solid ${COLORS.border}`,
  borderRadius: 10,
  background: COLORS.panelAlt,
  boxShadow:
    "0 18px 60px rgba(0,0,0,0.5)"
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginBottom: 14
};

const closeButtonStyle = {
  border: "none",
  background: "transparent",
  color: "inherit",
  fontSize: 28,
  lineHeight: 1,
  cursor: "pointer"
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
  marginBottom: 12
};

const formGridStyle = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(190px, 1fr))",
  gap: 10
};

const weekdayRowStyle = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap"
};

const modalActionsStyle = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  marginTop: 14
};

export default AgendaPanel;
