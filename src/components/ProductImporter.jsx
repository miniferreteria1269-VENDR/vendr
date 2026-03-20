import { useState } from "react";
import axios from "axios";

function ProductImporter({ storeId }) {

  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);

  const uploadFile = async () => {

    if (!file) {
      alert("Select a file first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const res = await axios.post(
      "http://127.0.0.1:8000/import-products",
      formData,
      {
        params: { store_id: storeId },
        headers: { "Content-Type": "multipart/form-data" }
      }
    );

    setResult(res.data);
  };

  return (

    <div style={{ maxWidth: 500 }}>

      <h3>Import Products</h3>

      <a href="/vendr_import_template.xlsx" download>
        Download Import Template
      </a>

      <div style={{ marginTop: 20 }}>
        <input
          type="file"
          accept=".xlsx,.csv"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>

      <button
        onClick={uploadFile}
        style={{ marginTop: 10 }}
      >
        Upload File
      </button>

      {result && (

        <div style={{ marginTop: 20 }}>

          <div>
            Products Created: {result.created}
          </div>

          {result.rejected.length > 0 && (

            <div style={{ marginTop: 10 }}>

              <b>Rejected Rows</b>

              {result.rejected.map((r, i) => (

                <div key={i}>
                  Row {r.row}: {r.error}
                </div>

              ))}

            </div>

          )}

        </div>

      )}

    </div>
  );
}

export default ProductImporter;