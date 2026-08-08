import * as XLSX from "xlsx";

const safeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const safeFilenamePart = value =>
  String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9À-ɏ_-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Store";

const getLocalDate = () => {
  const now = new Date();
  const localDate = new Date(
    now.getTime() - now.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 10);
};

const formatCreatedAt = value => {
  if (!value) return "";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
};

const applyNumberFormat = (
  worksheet,
  column,
  firstRow,
  lastRow,
  format
) => {
  for (let row = firstRow; row <= lastRow; row += 1) {
    const cell = worksheet[`${column}${row}`];
    if (cell) cell.z = format;
  }
};

const writeWorkbook = ({
  worksheet,
  sheetName,
  fileName
}) => {
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    sheetName
  );

  XLSX.writeFile(
    workbook,
    fileName,
    {
      bookType: "xlsx",
      compression: true
    }
  );
};

export const exportInventoryToExcel = ({
  products,
  totals,
  storeId,
  labels
}) => {
  const rows = products.map(product => {
    const quantity = safeNumber(product.quantity);
    const cost = safeNumber(product.cost);
    const price = safeNumber(product.price);
    const totalCost = safeNumber(
      product.investment ?? cost * quantity
    );
    const totalValue = price * quantity;

    return [
      product.name || "",
      quantity,
      cost,
      price,
      totalCost,
      totalValue,
      totalValue - totalCost
    ];
  });

  const totalCost = safeNumber(totals?.cost);
  const totalValue = safeNumber(totals?.price);

  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      labels.product,
      labels.quantity,
      labels.cost,
      labels.price,
      labels.totalCost,
      labels.totalValue,
      labels.profit
    ],
    ...rows,
    [],
    [
      labels.total,
      "",
      "",
      "",
      totalCost,
      totalValue,
      totalValue - totalCost
    ]
  ]);

  worksheet["!cols"] = [
    { wch: 42 },
    { wch: 11 },
    { wch: 13 },
    { wch: 13 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 }
  ];

  worksheet["!autofilter"] = {
    ref: `A1:G${Math.max(rows.length + 1, 1)}`
  };

  if (rows.length > 0) {
    applyNumberFormat(
      worksheet,
      "C",
      2,
      rows.length + 1,
      "$0.00"
    );

    applyNumberFormat(
      worksheet,
      "D",
      2,
      rows.length + 1,
      "$0.00#"
    );

    for (const column of ["E", "F", "G"]) {
      applyNumberFormat(
        worksheet,
        column,
        2,
        rows.length + 1,
        "$0.00"
      );
    }
  }

  const totalRow = rows.length + 3;

  for (const column of ["E", "F", "G"]) {
    applyNumberFormat(
      worksheet,
      column,
      totalRow,
      totalRow,
      "$0.00"
    );
  }

  writeWorkbook({
    worksheet,
    sheetName: labels.inventorySheet,
    fileName:
      `VENDR_Inventory_Store_${safeFilenamePart(storeId)}` +
      `_${getLocalDate()}.xlsx`
  });
};

export const exportProductMasterToExcel = ({
  products,
  storeId,
  labels
}) => {
  const rows = products.map(product => {
    const tracksStock = Boolean(
      Number(product.tracks_stock)
    );

    return [
      product.product_id,
      product.name || "",
      product.location_code || "",
      tracksStock
        ? safeNumber(product.stock)
        : "",
      tracksStock
        ? safeNumber(product.low_stock_threshold)
        : "",
      safeNumber(product.cost),
      safeNumber(product.price),
      tracksStock ? labels.yes : labels.no,
      product.is_active
        ? labels.active
        : labels.archived,
      formatCreatedAt(product.created_at)
    ];
  });

  const worksheet = XLSX.utils.aoa_to_sheet([
    [
      labels.productId,
      labels.product,
      labels.location,
      labels.stock,
      labels.lowStock,
      labels.cost,
      labels.price,
      labels.tracksStock,
      labels.status,
      labels.createdAt
    ],
    ...rows
  ]);

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 42 },
    { wch: 16 },
    { wch: 11 },
    { wch: 13 },
    { wch: 13 },
    { wch: 13 },
    { wch: 16 },
    { wch: 13 },
    { wch: 22 }
  ];

  worksheet["!autofilter"] = {
    ref: `A1:J${Math.max(rows.length + 1, 1)}`
  };

  if (rows.length > 0) {
    applyNumberFormat(
      worksheet,
      "F",
      2,
      rows.length + 1,
      "$0.00"
    );

    applyNumberFormat(
      worksheet,
      "G",
      2,
      rows.length + 1,
      "$0.00#"
    );
  }

  writeWorkbook({
    worksheet,
    sheetName: labels.productMasterSheet,
    fileName:
      `VENDR_Product_Master_Store_${safeFilenamePart(storeId)}` +
      `_${getLocalDate()}.xlsx`
  });
};
