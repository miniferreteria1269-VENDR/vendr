import { useEffect, useMemo, useState } from "react";
import apiClient from "../apiClient";

export default function ProductSupplierManagement() {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      const response = await apiClient.get(
        "/product-supplier-summary"
      );

      setProducts(response.data.products || []);
    } catch (err) {
      console.error(
        "Failed to load product-supplier summary:",
        err
      );

      setProducts([]);
      setError("Unable to load products.");
    } finally {
      setLoading(false);
    }
  }

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((product) =>
      String(product.product_name || "")
        .toLowerCase()
        .includes(term)
    );
  }, [products, search]);

  const selectedProduct =
    products.find(
      (product) =>
        product.product_id === selectedProductId
    ) || null;

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>
        Product Suppliers
      </h3>

      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        style={{
          width: "100%",
          maxWidth: 420,
          marginBottom: 16,
          padding: "8px 10px",
          boxSizing: "border-box"
        }}
      />

      {loading && <p>Loading products...</p>}

      {error && (
        <p style={{ color: "#ff6b6b" }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #303642",
            borderRadius: 6
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse"
            }}
          >
            <thead>
              <tr>
                <th style={headerCellStyle}>
                  Product
                </th>

                <th style={headerCellStyle}>
                  Preferred Supplier
                </th>

                <th style={headerCellStyle}>
                  Last Cost
                </th>

                <th style={headerCellStyle}>
                  Supply Cycle
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: 16,
                      textAlign: "center"
                    }}
                  >
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const isSelected =
                    product.product_id ===
                    selectedProductId;

                  const additionalSuppliers =
                    Number(product.supplier_count || 0) -
                    1;

                  return (
                    <tr
                      key={product.product_id}
                      onClick={() =>
                        setSelectedProductId(
                          product.product_id
                        )
                      }
                      style={{
                        cursor: "pointer",
                        backgroundColor: isSelected
                          ? "#26354d"
                          : "transparent"
                      }}
                    >
                      <td style={bodyCellStyle}>
                        {product.product_name}
                      </td>

                      <td style={bodyCellStyle}>
                        {product.preferred_supplier_name ? (
                          <>
                            {
                              product.preferred_supplier_name
                            }

                            {additionalSuppliers > 0 && (
                              <span>
                                {" "}
                                (+{additionalSuppliers})
                              </span>
                            )}
                          </>
                        ) : (
                          "—"
                        )}
                      </td>

                      <td style={bodyCellStyle}>
                        {product.last_cost != null
                          ? `$${Number(
                              product.last_cost
                            ).toFixed(2)}`
                          : "—"}
                      </td>

                      <td style={bodyCellStyle}>
                        {product.supply_cycle ||
                          product.lead_time_days ||
                          "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          paddingTop: 16,
          borderTop: "1px solid #303642"
        }}
      >
        {selectedProduct ? (
          <>
            <h3 style={{ marginTop: 0 }}>
              {selectedProduct.product_name}
            </h3>

            <p style={{ marginBottom: 0 }}>
              Supplier management panel coming next.
            </p>
          </>
        ) : (
          <p style={{ margin: 0 }}>
            Select a product to manage its suppliers.
          </p>
        )}
      </div>
    </div>
  );
}

const headerCellStyle = {
  padding: "10px 12px",
  textAlign: "left",
  borderBottom: "1px solid #303642",
  whiteSpace: "nowrap"
};

const bodyCellStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid #252a33"
};
