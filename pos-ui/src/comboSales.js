export const comboSelectionSignature = selections =>
  [...(selections || [])]
    .map(selection =>
      `${Number(selection.slot_id)}:${Number(selection.product_id)}`
    )
    .sort()
    .join("|");

export const buildComboLine = (combo, selections) => {
  const selectedBySlot = new Map(
    (selections || []).map(selection => [
      Number(selection.slot_id),
      Number(selection.product_id)
    ])
  );

  const components = (combo.slots || []).map(slot => {
    const productId = slot.selection_type === "fixed"
      ? Number(slot.options?.[0]?.product_id)
      : selectedBySlot.get(Number(slot.slot_id));
    const option = (slot.options || []).find(
      candidate => Number(candidate.product_id) === productId
    );

    if (!option) {
      throw new Error(`A selection is required for ${slot.label}.`);
    }

    return {
      slot_id: Number(slot.slot_id),
      slot_label: slot.label,
      selection_type: slot.selection_type,
      product_id: productId,
      name: option.product_name,
      quantity_per_combo: Number(slot.quantity),
      cost: Number(option.cost || 0),
      tracks_stock: Boolean(option.tracks_stock)
    };
  });

  return {
    combo_version: Number(combo.version),
    combo_selections: components.map(component => ({
      slot_id: component.slot_id,
      product_id: component.product_id
    })),
    combo_components: components,
    cost: components.reduce(
      (sum, component) =>
        sum + component.cost * component.quantity_per_combo,
      0
    )
  };
};

export const replaceComboLineConfiguration = (line, comboData) => ({
  ...line,
  ...comboData,
  quantity: line.quantity,
  price: line.price
});

export const calculateComboCostRange = slots =>
  (slots || []).reduce(
    (range, slot) => {
      const quantity = Number(slot.quantity || 0);
      const optionCosts = (slot.options || [])
        .map(option => Number(option.cost || 0) * quantity);

      if (optionCosts.length === 0) return range;

      return {
        minimum: range.minimum + Math.min(...optionCosts),
        maximum: range.maximum + Math.max(...optionCosts)
      };
    },
    { minimum: 0, maximum: 0 }
  );

export const getSaleStockMovements = items => {
  const movements = new Map();

  const add = (productId, quantity) => {
    const id = Number(productId);
    movements.set(id, (movements.get(id) || 0) + Number(quantity || 0));
  };

  for (const item of items || []) {
    if (item.combo_version && Array.isArray(item.combo_components)) {
      for (const component of item.combo_components) {
        if (component.tracks_stock) {
          add(
            component.product_id,
            Number(item.quantity) * Number(component.quantity_per_combo)
          );
        }
      }
    } else {
      add(item.product_id, item.quantity);
    }
  }

  return [...movements].map(([product_id, quantity]) => ({
    product_id,
    quantity
  }));
};
