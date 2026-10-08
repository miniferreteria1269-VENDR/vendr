export const getHelpModeStorageKey = userId =>
  `vendr_context_help_enabled:${userId ?? "device"}`;

export const parseHelpModePreference = value =>
  value == null ? true : value !== "false";
