import test from "node:test";
import assert from "node:assert/strict";
import {
  isReviewedWithinRange,
  reviewAgeDays,
} from "./masterReviewUtils.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const nowMs = Date.parse("2026-09-24T12:00:00Z");

test("never-reviewed and invalid products remain due", () => {
  assert.equal(isReviewedWithinRange(null, 90, nowMs), false);
  assert.equal(isReviewedWithinRange("not-a-date", 90, nowMs), false);
  assert.equal(reviewAgeDays(null, nowMs), null);
});

test("the selected range is inclusive at its boundary", () => {
  const exactlyNinetyDays = new Date(nowMs - 90 * DAY_MS).toISOString();
  const olderThanNinetyDays = new Date(nowMs - 91 * DAY_MS).toISOString();

  assert.equal(isReviewedWithinRange(exactlyNinetyDays, 90, nowMs), true);
  assert.equal(isReviewedWithinRange(olderThanNinetyDays, 90, nowMs), false);
});

test("changing range recalculates the same stored timestamp", () => {
  const reviewedSixtyDaysAgo = new Date(nowMs - 60 * DAY_MS).toISOString();

  assert.equal(isReviewedWithinRange(reviewedSixtyDaysAgo, 30, nowMs), false);
  assert.equal(isReviewedWithinRange(reviewedSixtyDaysAgo, 90, nowMs), true);
  assert.equal(reviewAgeDays(reviewedSixtyDaysAgo, nowMs), 60);
});
