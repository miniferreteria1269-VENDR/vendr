import { useState } from "react";
import apiClient from "../apiClient";

function ProductImporter({ storeId }) {
  const [file, setFile] =
    useState(null);

  const [result, setResult] =
    useState(null);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");

  const uploadFile = async () => {
    if (!file) {
      alert("Select a file first");
      return;
    }

    if (!storeId) {
      setError(
        "Unable to determine the current store."
      );
      return;
    }

    const formData =
      new FormData();

    formData.append(
      "file",
      file
    );

    setUploading(true);
    setResult(null);
    setError("");

    try {
      const response =
        await apiClient.post(
          "/import-products",
          formData,
          {
            params: {
              store_id: storeId
            },

            /*
             * Large product imports may take
             * longer than the normal API timeout.
             */
            timeout: 120000
          }
        );

      setResult(
        response.data
      );
    } catch (requestError) {
      console.error(
        "PRODUCT IMPORT ERROR:",
        requestError
      );

      const detail =
        requestError.response
          ?.data?.detail ||
        requestError.message ||
        "Unable to import products.";

      setError(
        String(detail)
      );
    } finally {
      setUploading(false);
    }
  };

  const rejectedRows =
    result?.rejected || [];

  return (
    <div
      style={{
        maxWidth: 500
      }}
    >
      <h3>
        Import Products
      </h3>

      <a
        href="/vendr_import_template.xlsx"
        download
      >
        Download Import Template
      </a>

      <div
        style={{
          marginTop: 20
        }}
      >
        <input
          type="file"
          accept=".xlsx,.csv"
          disabled={uploading}
          onChange={event => {
            setFile(
              event.target.files?.[0] ||
              null
            );

            setResult(null);
            setError("");
          }}
        />
      </div>

      <button
        type="button"
        onClick(null);
            setError("");
={uploadFile}
        disabled={
          uploading ||
          !file
        }
        style={{
          marginTop: 10,
          opacity:
            uploading || !file
              ? 0.6
              : 1,
          cursor:
            uploading || !file
              ? "not-allowed"
              : "pointer"
        }}
      >
        {uploading
          ? "Importing..."
          : "Upload File"}
      </button>

      {error && (
        <div
          style={{
            marginTop: 16,
            color: "#ff6b6b"
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 20
          }}
        >
          <div>
            Products Created:{" "}
            {result.created || 0}
          </div>

          {rejectedRows.length > 0 && (
            <div
              style={{
                marginTop: 10
              }}
            >
              <b>
                Rejected Rows
              </b>

              {rejectedRows.map(
                (rejected, index) => (
                  <div
                    key={
                      `${rejected.row}-${index}`
                    }
                  >
                    Row {rejected.row}:{" "}
                    {rejected.error}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductImporter;
