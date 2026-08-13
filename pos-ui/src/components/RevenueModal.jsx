import BusinessCashModal from "./BusinessCashModal";

// Register corrections and internal transfers now
// have dedicated Cash Panel actions and are not revenue.
const categories = [
  ["Aporte Dueño", "owner_contribution"],
  ["Inversion Socio", "partner_investment"],
  ["Prestamo Recibido", "loan_received"],
  ["Otros", "other"]
].map(([value, label]) => ({
  value,
  label
}));

function RevenueModal(props) {
  return (
    <BusinessCashModal
      {...props}
      type="revenue"
      categories={categories}
    />
  );
}

export default RevenueModal;
