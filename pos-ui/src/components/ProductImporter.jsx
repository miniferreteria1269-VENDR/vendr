import { useState } from "react";
import apiClient from "../apiClient";

function ProductImporter({
  storeId
}) {
  const [
    file,
    setFile
  ] = useState(null);

  const [
    result,
    setResult
  ] = useState(null);

  const [
    uploading,
    setUploading
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage
  ] = useState("");

  const uploadFile = async () => {
    if (!file) {
      setErrorMessage(
        "Select a file first."
      );

      return;
    }

    if (!storeId) {
      setErrorMessage(
        "Unable to determine the current store."
      );

      return;
    }

    const token =
      localStorage.getItem(
        "vendr_access_token"
      );

    if (!token) {
      setErrorMessage(
        "Your authentication session is missing. Log out and log in again."
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
    setErrorMessage("");

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
             * Explicitly include the token here.
             * apiClient also has an interceptor,
             * but this guarantees that the import
             * request carries the current token.
             */
            headers: {
              Authorization:
                `Bearer ${token}`
            },

            /*
             * A large product import may take
             * longer than ordinary API requests.
             */
            timeout: 120000
          }
        );

      setResult(
        response.data
      );
    } catch (error) {
      console.error(
        "PRODUCT IMPORT ERROR:",
        error
      );

      const detail =
        error.response
          ?.data?.detail ||
        error.message ||
        "Unable to import products.";

      if (
        typeof detail ===
        "string"
      ) {
        setErrorMessage(
          detail
        );
      } else {
        setErrorMessage(
          JSON.stringify(detail)
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange =
    event => {
      const selectedFile =
        event.target.files?.[0] ||
        null;

      setFile(selectedFile);
      setResult(null);
      setErrorMessage("");
    };

  const rejectedRows =
    Array.isArray(
      result?.rejected
    )
      ? result.rejected
      : [];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 600,
        boxSizing: "border-box"
      }}
    >
      <h3
        style={{
          marginTop: 0
        }}
      >
        Import Products
      </h3>

      <p
        style={{
          marginTop: 0,
          color: "#9da7b3"
        }}
      >
        Download the template, enter your
        products, and upload the completed
        XLSX or CSV file.
      </p>

      <a
        href="/vendr_import_template.xlsx"
        download
        style={{
          color: "#3aa0ff"
        }}
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
          onChange={
            handleFileChange
          }
        />
      </div>

      {file && (
        <div
          style={{
            marginTop: 10,
            color: "#9da7b3",
            fontSize: 13
          }}
        >
          Selected: {file.name}
        </div>
      )}

      <button
        type="button"
        onClick={uploadFile}
        disabled={
          uploading ||
          !file
        }
        style={{
          marginTop: 14,
          padding: "9px 14px",
          border: "none",
          borderRadius: 7,
          background:
            "#3aa0ff",
          color: "white",
          fontWeight: "bold",
          cursor:
            uploading || !file
              ? "not-allowed"
              : "pointer",
          opacity:
            uploading || !file
              ? 0.6
              : 1
        }}
      >
        {uploading
          ? "Importing..."
          : "Upload File"}
      </button>

      {uploading && (
        <div
          style={{
            marginTop: 12,
            color: "#9da7b3"
          }}
        >
          Importing products. Large files
          may take a moment. Do not close
          this window.
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginTop: 16,
            padding: 10,
            borderRadius: 7,
            background:
              "rgba(255, 92, 92, 0.12)",
            color: "#ff6b6b"
          }}
        >
          {errorMessage}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 20,
            padding: 12,
            border:
              "1px solid #2f3542",
            borderRadius: 8,
            background:
              "#1a1d24"
          }}
        >
          <div
            style={{
              color: "#43d17a",
              fontWeight: "bold"
            }}
          >
            Import completed
          </div>

          <div
            style={{
              marginTop: 8
            }}
          >
            Products Created:{" "}
            {Number(
              result.created || 0
            )}
          </div>

          {rejectedRows.length > 0 && (
            <div
              style={{
                marginTop: 14
              }}
            >
              <strong>
                Rejected Rows:{" "}
                {rejectedRows.length}
              </strong>

              <div
                style={{
                  marginTop: 8,
                  maxHeight: 220,
                  overflowY: "auto",
                  borderTop:
                    "1px solid #2f3542"
                }}
              >
                {rejectedRows.map(
                  (
                    rejected,
                    index
                  ) => (
                    <div
                      key={
                        `${rejected.row}-${index}`
                      }
                      style={{
                        padding:
                          "7px 0",
                        borderBottom:
                          "1px solid #2f3542",
                        color:
                          "#ffb3b3"
                      }}
                    >
                      Row{" "}
                      {rejected.row ??
                        "—"}
                      :{" "}
                      {rejected.error ||
                        "Unknown error"}
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {rejectedRows.length ===
            0 && (
            <div
              style={{
                marginTop: 8,
                color: "#9da7b3"
              }}
            >
              No rows were rejected.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProductImporter;
