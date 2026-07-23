import { offlineDb } from "./offlineDb";

const isTruthyFlag = value =>
  value === 1 ||
  value === true ||
  value === "1" ||
  value === "true";

export const cacheProducts = async (
  storeId,
  products
) => {
  if (!storeId || !Array.isArray(products)) {
    return;
  }

  const cachedProducts = products.map(product => ({
    ...product,
    store_id: storeId,
    is_active:
      product.is_active === undefined
        ? 1
        : product.is_active
  }));

  await offlineDb.transaction(
    "rw",
    offlineDb.products,
    async () => {
      await offlineDb.products
        .where("store_id")
        .equals(storeId)
        .delete();

      await offlineDb.products.bulkPut(
        cachedProducts
      );
    }
  );
};

export const getCachedProducts = async storeId => {
  if (!storeId) {
    return [];
  }

  return offlineDb.products
    .where("store_id")
    .equals(storeId)
    .filter(product =>
      product.is_active === undefined ||
      isTruthyFlag(product.is_active)
    )
    .sortBy("name");
};

export const searchCachedProducts = async (
  storeId,
  term
) => {
  const products =
    await getCachedProducts(storeId);

  const normalizedTerm =
    String(term || "")
      .trim()
      .toLowerCase();

  if (!normalizedTerm) {
    return products;
  }

  return products.filter(product =>
    String(product.name || "")
      .toLowerCase()
      .includes(normalizedTerm)
  );
};

export const applyLocalSaleToCatalog = async (
  storeId,
  items
) => {
  if (!storeId || !Array.isArray(items)) {
    return;
  }

  await offlineDb.transaction(
    "rw",
    offlineDb.products,
    async () => {
      for (const item of items) {
        const key = [
          storeId,
          item.product_id
        ];

        const product =
          await offlineDb.products.get(key);

        if (
          !product ||
          !isTruthyFlag(product.tracks_stock)
        ) {
          continue;
        }

        await offlineDb.products.update(
          key,
          {
            stock:
              Number(product.stock || 0) -
              Number(item.quantity || 0)
          }
        );
      }
    }
  );
};

export const applyLocalReturnToCatalog = async (
  storeId,
  items
) => {
  if (!storeId || !Array.isArray(items)) {
    return;
  }

  await offlineDb.transaction(
    "rw",
    offlineDb.products,
    async () => {
      for (const item of items) {
        const key = [
          storeId,
          item.product_id
        ];

        const product =
          await offlineDb.products.get(key);

        if (
          !product ||
          !isTruthyFlag(product.tracks_stock)
        ) {
          continue;
        }

        await offlineDb.products.update(
          key,
          {
            stock:
              Number(product.stock || 0) +
              Number(item.quantity || 0)
          }
        );
      }
    }
  );
};

export const applyLocalIntakeToCatalog = async (
  storeId,
  items
) => {
  if (!storeId || !Array.isArray(items)) {
    return;
  }

  await offlineDb.transaction(
    "rw",
    offlineDb.products,
    async () => {
      for (const item of items) {
        const key = [
          storeId,
          item.product_id
        ];

        const product =
          await offlineDb.products.get(key);

        if (!product) {
          continue;
        }

        const updates = {
          cost: Number(item.cost || 0),
          price: Number(item.price || 0)
        };

        if (isTruthyFlag(product.tracks_stock)) {
          updates.stock =
            Number(product.stock || 0) +
            Number(item.quantity || 0);
        }

        await offlineDb.products.update(
          key,
          updates
        );
      }
    }
  );
};

export const applyLocalStockAdjustmentToCatalog =
  async (
    storeId,
    productId,
    quantity,
    direction
  ) => {
    const numericQuantity =
      Number(quantity);

    if (
      !storeId ||
      !productId ||
      !Number.isFinite(numericQuantity) ||
      numericQuantity <= 0 ||
      !["positive", "negative"].includes(direction)
    ) {
      return;
    }

    const key = [
      storeId,
      productId
    ];

    await offlineDb.transaction(
      "rw",
      offlineDb.products,
      async () => {
        const product =
          await offlineDb.products.get(key);

        if (
          !product ||
          !isTruthyFlag(product.tracks_stock)
        ) {
          return;
        }

        const stockDelta =
          direction === "positive"
            ? numericQuantity
            : -numericQuantity;

        await offlineDb.products.update(
          key,
          {
            stock:
              Number(product.stock || 0) +
              stockDelta
          }
        );
      }
    );
  };
