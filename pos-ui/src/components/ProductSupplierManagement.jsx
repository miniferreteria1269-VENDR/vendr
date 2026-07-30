import { useEffect, useState } from "react";

export default function ProductSupplierManagement() {
    const [selectedProduct, setSelectedProduct] = useState(null);

    const [productSuppliers, setProductSuppliers] = useState([]);
    const [availableSuppliers, setAvailableSuppliers] = useState([]);

    const [form, setForm] = useState({
        supplier_id: "",
        supplier_sku: "",
        last_cost: "",
        lead_time_days: "",
        is_preferred: false
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    return (
        <div>
            <h2>Product Suppliers</h2>

            <p>
                Select a product to view and assign suppliers.
            </p>
        </div>
    );
}
