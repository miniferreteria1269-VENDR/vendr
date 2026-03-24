// UPDATED STYLED VERSION

import { useState, useEffect } from "react";
import axios from "axios";
import ProductImporter from "./ProductImporter";
import {
  COLORS,
  card,
  btnPrimary,
  btnSecondary,
  input
} from "../uiStyles";

function ProductManagement({ storeId }) {

  const [pmView, setPmView] = useState("menu");

  return (
    <div style={{ padding: 16 }}>

      <h2 style={{ marginBottom: 12 }}>Product Management</h2>

      {/* NAV */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {[
          ["create", "Create"],
          ["price", "Price"],
          ["edit", "Edit"],
          ["loss", "Loss"],
          ["archive", "Archive"],
          ["import", "Import"]
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setPmView(key)}
            style={pmView === key ? btnPrimary : btnSecondary}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={card}>
        {pmView === "menu" && <div>Select a tool above</div>}
        {pmView === "create" && <CreateProduct storeId={storeId} goBack={() => setPmView("menu")} />}
        {pmView === "price" && <PriceChange storeId={storeId} />}
        {pmView === "edit" && <EditDetails storeId={storeId} />}
        {pmView === "loss" && <LogLoss storeId={storeId} />}
        {pmView === "archive" && <ArchiveProduct storeId={storeId} />}
        {pmView === "import" && <ProductImporter storeId={storeId} />}
      </div>

    </div>
  );
}