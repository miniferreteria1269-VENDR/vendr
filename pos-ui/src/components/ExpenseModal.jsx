import BusinessCashModal from "./BusinessCashModal";

const categories = [
  ["Compra Mercaderia", "inventory_purchase"],
  ["Nomina", "payroll"],
  ["Utilidades", "utilities"],
  ["Impuestos", "taxes"],
  ["Mantenimiento", "maintenance"],
  ["Renta", "rent"],
  ["Retiro Dueño", "owner_draw"],
  ["Otros", "other"]
].map(([value, label]) => ({
  value,
  label
}));

function ExpenseModal(props) {
  return (
    <BusinessCashModal
      {...props}
      type="expense"
      categories={categories}
    />
  );
}

export default ExpenseModal;
