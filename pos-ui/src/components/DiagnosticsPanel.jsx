import { useState } from "react";
import { useLang } from "../LanguageContext";
import ProductDiagnostics from "./ProductDiagnostics";
import MasterReview from "./MasterReview";

function DiagnosticsPanel({ storeId, onProductsChanged }) {
  const { t } = useLang();
  const [section, setSection] = useState("issues");

  return (
    <section className="diagnostics-shell">
      <div className="diagnostics-tabs" role="tablist">
        <button
          type="button"
          className={section === "issues" ? "active" : ""}
          onClick={() => setSection("issues")}
        >
          {t("diagnostic_issues")}
        </button>
        <button
          type="button"
          className={section === "master" ? "active" : ""}
          onClick={() => setSection("master")}
        >
          {t("master_review")}
        </button>
      </div>

      {section === "issues" ? (
        <ProductDiagnostics storeId={storeId} />
      ) : (
        <MasterReview
          storeId={storeId}
          onProductsChanged={onProductsChanged}
        />
      )}
    </section>
  );
}

export default DiagnosticsPanel;
