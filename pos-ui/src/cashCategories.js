import apiClient from "./apiClient";

const storageKey = (storeId, type) =>
  `vendr_cash_categories:${storeId}:${type}`;

const normalizeList = categories =>
  [...(categories || [])]
    .filter(category => category?.active !== false)
    .sort((left, right) =>
      String(left.label || "").localeCompare(
        String(right.label || ""),
        undefined,
        { sensitivity: "base" }
      )
    );

export const getCachedCashCategories = (
  storeId,
  type
) => {
  if (!storeId || !type) return [];

  try {
    const raw = localStorage.getItem(
      storageKey(storeId, type)
    );

    return raw
      ? normalizeList(JSON.parse(raw))
      : [];
  } catch (error) {
    console.warn(
      "CUSTOM CASH CATEGORY CACHE READ ERROR:",
      error
    );
    return [];
  }
};

export const cacheCashCategories = (
  storeId,
  type,
  categories
) => {
  if (!storeId || !type) return;

  localStorage.setItem(
    storageKey(storeId, type),
    JSON.stringify(normalizeList(categories))
  );
};

export const loadCashCategories = async (
  storeId,
  type
) => {
  const cached = getCachedCashCategories(
    storeId,
    type
  );

  try {
    const response = await apiClient.get(
      "/cash-categories",
      {
        params: {
          store_id: storeId,
          type
        }
      }
    );

    const categories = normalizeList(
      response.data.categories
    );

    cacheCashCategories(
      storeId,
      type,
      categories
    );

    return categories;
  } catch (error) {
    if (cached.length > 0) {
      return cached;
    }

    throw error;
  }
};

export const createCashCategory = async ({
  storeId,
  type,
  label,
  countsAsOperatingExpense
}) => {
  const response = await apiClient.post(
    "/cash-categories",
    {
      store_id: storeId,
      type,
      label,
      counts_as_operating_expense:
        type === "expense"
          ? Boolean(countsAsOperatingExpense)
          : null
    }
  );

  const category = response.data.category;
  const existing = getCachedCashCategories(
    storeId,
    type
  );
  const next = normalizeList([
    ...existing.filter(
      item => item.id !== category.id
    ),
    category
  ]);

  cacheCashCategories(storeId, type, next);

  return category;
};
