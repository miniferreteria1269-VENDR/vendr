import test from "node:test";
import assert from "node:assert/strict";
import {
  buildComboLine,
  calculateComboCostRange,
  comboSelectionSignature,
  getSaleStockMovements,
  replaceComboLineConfiguration
} from "./comboSales.js";

const combo = {
  version: 3,
  slots: [
    {
      slot_id: 1,
      label: "Burger",
      selection_type: "fixed",
      quantity: 1,
      options: [{ product_id: 10, product_name: "Burger", cost: 2, tracks_stock: false }]
    },
    {
      slot_id: 2,
      label: "Drink",
      selection_type: "choose_one",
      quantity: 1,
      options: [{ product_id: 20, product_name: "Cola", cost: 0.5, tracks_stock: true }]
    }
  ]
};

test("builds a versioned combo sale line", () => {
  const line = buildComboLine(combo, [{ slot_id: 2, product_id: 20 }]);
  assert.equal(line.combo_version, 3);
  assert.equal(line.cost, 2.5);
  assert.equal(comboSelectionSignature(line.combo_selections), "1:10|2:20");
});

test("combo stock movements use selected tracked components", () => {
  const line = buildComboLine(combo, [{ slot_id: 2, product_id: 20 }]);
  assert.deepEqual(
    getSaleStockMovements([{ ...line, product_id: 99, quantity: 2 }]),
    [{ product_id: 20, quantity: 2 }]
  );
});

test("calculates the minimum and maximum combo cost", () => {
  assert.deepEqual(
    calculateComboCostRange([
      { quantity: 2, options: [{ cost: 3 }] },
      { quantity: 1, options: [{ cost: 1 }, { cost: 2.5 }] }
    ]),
    { minimum: 7, maximum: 8.5 }
  );
});

test("combines duplicate tracked components across a ticket", () => {
  const line = buildComboLine(combo, [{ slot_id: 2, product_id: 20 }]);
  assert.deepEqual(
    getSaleStockMovements([
      { ...line, product_id: 99, quantity: 2 },
      { product_id: 20, quantity: 3 }
    ]),
    [{ product_id: 20, quantity: 5 }]
  );
});

test("reconfigures a combo line without changing sale fields", () => {
  const original = {
    product_id: 99,
    name: "Lunch combo",
    quantity: 3,
    price: 8.5,
    combo_version: 2,
    combo_selections: [{ slot_id: 2, product_id: 20 }]
  };
  const editableCombo = {
    ...combo,
    slots: combo.slots.map(slot =>
      slot.slot_id === 2
        ? {
            ...slot,
            options: [
              ...slot.options,
              {
                product_id: 21,
                product_name: "Water",
                cost: 0.35,
                tracks_stock: true
              }
            ]
          }
        : slot
    )
  };
  const replacement = buildComboLine(
    editableCombo,
    [{ slot_id: 2, product_id: 21 }]
  );
  const updated = replaceComboLineConfiguration(original, replacement);

  assert.equal(updated.product_id, 99);
  assert.equal(updated.quantity, 3);
  assert.equal(updated.price, 8.5);
  assert.equal(updated.combo_selections[1].product_id, 21);
});
