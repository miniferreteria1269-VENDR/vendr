import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateChange,
  toCurrencyCents
} from "./changeCalculator.js";

test("currency conversion rounds to whole cents", () => {
  assert.equal(toCurrencyCents("5"), 500);
  assert.equal(toCurrencyCents("2.25"), 225);
  assert.equal(toCurrencyCents(""), null);
  assert.equal(toCurrencyCents("not money"), null);
});

test("change is calculated without floating point residue", () => {
  assert.deepEqual(
    calculateChange(2.25, 5),
    {
      isValid: true,
      isEnough: true,
      changeCents: 275,
      amountDueCents: 0
    }
  );
});

test("insufficient cash reports the amount still due", () => {
  assert.deepEqual(
    calculateChange(5, 2.25),
    {
      isValid: true,
      isEnough: false,
      changeCents: 0,
      amountDueCents: 275
    }
  );
});
