import { useEffect, useMemo, useState } from "react";
import api from "../api"; // Adjust to your project

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
            const response = await api.get("/product-supplier-summary");

            setProducts(response.data.products);
        } catch (err) {
            console.error(err);
            setError("Unable to load products.");
        } finally {
            setLoading(false);
        }
    }

    const filteredProducts = useMemo(() => {
        const term = search.toLowerCase().trim();

        if (!term) return products;

        return products.filter(product =>
            product.product_name.toLowerCase().includes(term)
        );
    }, [products, search]);

    const selectedProduct =
        products.find(
            p => p.product_id === selectedProductId
        ) || null;

    return (
        <div>

            <h2>Product Suppliers</h2>

            <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                    width: "100%",
                    marginBottom: "1rem"
                }}
            />

            {loading && <p>Loading...</p>}

            {error && (
                <p style={{ color: "red" }}>
                    {error}
                </p>
            )}

            {!loading && (
                <table className="table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Preferred Supplier</th>
                            <th>Last Cost</th>
                            <th>Lead Time</th>
                        </tr>
                    </thead>

                    <tbody>

                        {filteredProducts.map(product => (

                            <tr
                                key={product.product_id}
                                onClick={() =>
                                    setSelectedProductId(product.product_id)
                                }
                                style={{
                                    cursor: "pointer",
                                    backgroundColor:
                                        selectedProductId === product.product_id
                                            ? "#eef4ff"
                                            : ""
                                }}
                            >

                                <td>{product.product_name}</td>

                                <td>
                                    {product.preferred_supplier_name || "—"}
                                </td>

                                <td>
                                    {product.last_cost != null
                                        ? `$${Number(product.last_cost).toFixed(2)}`
                                        : "—"}
                                </td>

                                <td>
                                    {product.lead_time_days ?? "—"}
                                </td>

                            </tr>

                        ))}

                    </tbody>
                </table>
            )}

            <hr />

            {selectedProduct ? (
                <div>

                    <h3>
                        {selectedProduct.product_name}
                    </h3>

                    <p>
                        Supplier management panel coming next.
                    </p>

                </div>
            ) : (
                <p>Select a product to manage its suppliers.</p>
            )}

        </div>
    );
}
