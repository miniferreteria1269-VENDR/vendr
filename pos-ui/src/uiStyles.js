export const COLORS = {
  bg: "#0f1115",
  panel: "#1a1d24",
  panelAlt: "#222733",
  border: "#2f3542",

  text: "#e6edf3",
  textDim: "#9da7b3",

  primary: "#3aa0ff",
  primaryDark: "#1f6feb",

  danger: "#ff5c5c"
};

export const card = {
  background: COLORS.panel,
  borderRadius: 14,
  padding: 16,
  color: COLORS.text
};

export const input = {
  background: COLORS.panelAlt,
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  padding: 8,
  color: COLORS.text
};

export const btnPrimary = {
  background: COLORS.primary,
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

export const btnSecondary = {
  background: COLORS.panelAlt,
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};

export const btnDanger = {
  background: COLORS.danger,
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  color: "white",
  cursor: "pointer"
};