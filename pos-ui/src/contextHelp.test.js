import test from "node:test";
import assert from "node:assert/strict";

import {
  getHelpModeStorageKey,
  parseHelpModePreference
} from "./contextHelpPreferences.js";
import {
  contextHelpContent,
  getContextHelpContent
} from "./contextHelpContent.js";

test("help mode is enabled when a user has no saved preference", () => {
  assert.equal(parseHelpModePreference(null), true);
  assert.equal(parseHelpModePreference(undefined), true);
});

test("saved help mode preference is restored", () => {
  assert.equal(parseHelpModePreference("true"), true);
  assert.equal(parseHelpModePreference("false"), false);
});

test("help mode preference is scoped to the authenticated user", () => {
  assert.equal(
    getHelpModeStorageKey(17),
    "vendr_context_help_enabled:17"
  );
  assert.notEqual(
    getHelpModeStorageKey(17),
    getHelpModeStorageKey(18)
  );
});

test("every contextual help topic has Spanish and English content", () => {
  for (const [topic, translations] of Object.entries(contextHelpContent)) {
    assert.ok(translations.es?.title, `${topic} is missing a Spanish title`);
    assert.ok(translations.en?.title, `${topic} is missing an English title`);
    assert.ok(translations.es?.body?.length, `${topic} is missing Spanish body text`);
    assert.ok(translations.en?.body?.length, `${topic} is missing English body text`);
  }
});

test("content lookup follows the selected language and falls back safely", () => {
  assert.match(
    getContextHelpContent("tracksStock", "es").title,
    /existencias/i
  );
  assert.match(
    getContextHelpContent("tracksStock", "en").title,
    /tracking stock/i
  );
  assert.equal(getContextHelpContent("missing-topic", "es"), null);
});
