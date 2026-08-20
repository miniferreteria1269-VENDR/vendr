// Includes compact POS fiado and client credit-account labels.
export const translations = {
  en: {
    // AUTH
    login: "Login",
    email: "Email",
    password: "Password",
    create_account: "Create Account",
    store_name: "Store Name",
    sign_up: "Sign Up",
    back_to_login: "Back to Login",
    // ORGANIZATION REPORTS
organization: "Organization",
organization_reports: "Organization Reports",
organization_sales_report: "Aggregate Sales Report",

    // English
unit_cost: "Unit Cost",
sales_price_per_unit:
  "Sales Price per Unit",
line_total: "Total",

organization_unlock_description:
  "Enter the secondary organization credentials to view sensitive aggregate reports.",

username: "Username",
unlock_organization: "Unlock Organization",
unlocking: "Unlocking...",
lock_organization: "Lock Organization",
all_stores: "All Stores",

select_at_least_one_store:
  "Select at least one store.",

revenue_share: "Revenue Share",
profit_share: "Profit Share",

organization_credentials_required:
  "Enter the organization username and password.",

organization_login_failed:
  "Unable to unlock organization reports.",

organization_session_expired:
  "Organization access expired. Enter the secondary credentials again.",

organization_report_load_failed:
  "Unable to load the organization report.",

    // PRODUCT MANAGEMENT
    product_management: "Product Management",
    select_tool: "Select a tool above",
    create: "Create",
    price: "Price",
    edit: "Edit",
    loss: "Loss",
    adjustment: "Adjustment",
    transfer: "Transfer",
    archive: "Archive",
    restore: "Restore",
    import: "Import",
    name: "Name",
    product_name: "Product name",
    product_name_required: "Product name required",
    product_created: "Product created",
    price_change: "Price Change",
    updated: "Updated",
    save: "Save",

    create_product: "Create Product",
    initial_stock: "Initial Stock",
    cost: "Cost",
    low_stock: "Low Stock Threshold",
    tracks_stock: "Tracks Stock",
        // AGENDA
    agenda: "Agenda",
    today: "Today",
    this_week: "This Week",
    custom_range: "Custom Range",

    agenda_occurrences: "Agenda Items",
    new_agenda_item: "New Agenda Item",
    edit_agenda_item: "Edit Agenda Item",
    no_agenda_items:
      "No agenda items were found for this period.",

    title: "Title",
    scheduled_date: "Scheduled Date",
    scheduled_time: "Scheduled Time",
    any_time: "Any time",

    recurrence: "Recurrence",
    one_time: "One time",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    weekdays: "Weekdays",
    day_of_month: "Day of Month",

    monday_short: "Mon",
    tuesday_short: "Tue",
    wednesday_short: "Wed",
    thursday_short: "Thu",
    friday_short: "Fri",
    saturday_short: "Sat",
    sunday_short: "Sun",

        reorder_list: "Reorder List",
    master_list: "Master List",
    by_supplier: "By Supplier",
    unassigned: "Unassigned",
    add_product: "Add Product",
    add: "Add",
    update_reorder: "Update Reorder",
    add_to_reorder: "Add to Reorder",
    clear_all: "Clear All",
    clear_supplier_list: "Clear Supplier List",
    clear_unassigned: "Clear Unassigned",
    save_to_reorder_list: "Save to Reorder List",

    open: "Open",
    completed: "Completed",
    complete: "Complete",
    reopen: "Reopen",
    delete: "Delete",

    agenda_title_required:
      "An agenda item title is required.",
    agenda_weekday_required:
      "Select at least one weekday.",
    agenda_month_day_required:
      "Enter a valid day of the month.",
    agenda_load_failed:
      "Unable to load agenda items.",
    agenda_save_failed:
      "Unable to save the agenda item.",
    agenda_completion_failed:
      "Unable to update the agenda item.",
    agenda_delete_failed:
      "Unable to delete the agenda item.",

        // PRODUCT MASTER / POS LOCATION
    location: "Location",
    location_code_placeholder: "Example: E3R2I",
    active: "Active",
    archived: "Archived",
    active_products: "Active products",
    archived_products: "Archived products",
    low_stock_products_count: "Products on low-stock list",
    yes: "Yes",
    no: "No",

    quick_items: "Quick Items",
    no_quick_items: "No quick items available.",
    clear_product_search: "Clear product search",
    stock_not_tracked: "Stock not tracked",

    // PRODUCT TOOLS
    performance: "Performance",
    performance_coming_next:
      "Product performance details are coming next.",

    stock_transfer: "Stock Transfer",
    stock_transfer_recorded:
      "Stock transfer recorded.",

    // TRANSFER TICKETS
    stock_transfers: "Stock Transfers",
    incoming: "Incoming",
    sent: "Sent",
    new_transfer: "New Transfer",
    transfer_attention:
      "Transfer awaiting confirmation",
    transfer_status_created: "Created",
    transfer_status_dispatched:
      "Awaiting receipt",
    transfer_status_received: "Received",
    transfer_status_discrepancy:
      "Received with discrepancy",
    transfer_status_cancelled: "Cancelled",
    transfer_history_requires_connection:
      "Transfer history requires an internet connection.",
    transfer_details_requires_connection:
      "Transfer details require an internet connection.",
    transfer_tickets_load_failed:
      "Unable to load transfer tickets.",
    transfer_details_load_failed:
      "Unable to load transfer details.",
    no_incoming_transfers:
      "No incoming transfers.",
    no_sent_transfers:
      "No sent transfers.",
    destination_store: "Destination store",
    select_destination:
      "Select destination...",
    general_note: "General note",
    optional: "Optional",
    add_products: "Add products",
    search_local_products:
      "Search local products",
    transfer_product_already_added:
      "That product is already on the transfer.",
    transfer_product_no_stock:
      "This product has no stock available to transfer.",
    select_destination_store:
      "Select the destination store.",
    transfer_add_one_product:
      "Add at least one product.",
    transfer_quantity_invalid:
      "Check the transfer quantity for {product}. It must be a whole number between 1 and {stock}.",
    transfer_dispatched:
      "Transfer dispatched.",
    transfer_saved_pending:
      "Transfer saved. It will be dispatched when synchronization is available.",
    transfer_save_failed:
      "Unable to save the transfer.",
    transfer_items: "Transfer items",
    no_products_added:
      "No products added.",
    available: "Available",
    dispatch_transfer:
      "Dispatch Transfer",
    loading_transfers:
      "Loading transfers...",
    items: "items",
    units: "units",
    back: "Back",
    dispatched: "Dispatched",
    items_units: "Items / units",
    received: "Received",
    units_received: "Units received",
    transfer_note: "Transfer note",
    sent_product: "Sent product",
    destination_product:
      "Destination product",
    previous_match: "Previous match",
    search_to_change: "Search to change",
    awaiting_mapping: "Awaiting mapping",
    receiving_note: "Receiving note",
    confirming: "Confirming...",
    confirm_receipt: "Confirm Receipt",
    transfer_receipt_requires_connection:
      "Receiving confirmation requires an internet connection.",
    select_local_product_every_line:
      "Select a local product for every line.",
    transfer_unique_local_products:
      "Each line must use a different local product.",
    received_quantity_invalid:
      "Received quantities must be whole numbers between zero and the quantity sent.",
    transfer_received_discrepancy:
      "Transfer received with a quantity discrepancy.",
    transfer_received:
      "Transfer received.",
    transfer_receipt_failed:
      "Unable to confirm receipt.",

    // SALES / ANALYSIS
    sales_analysis: "Sales Analysis",
    revenue: "Revenue",
    profit: "Profit",
    tickets: "Tickets",
    avg_daily_revenue: "Avg Daily Revenue",
    avg_daily_profit: "Avg Daily Profit",
    avg_ticket: "Avg Ticket",
    top_revenue: "Top Revenue",
    top_profit: "Top Profit",
    top_volume: "Top Volume",
    no_data: "No data",

    // PARETO
    investment: "Investment",
    sales: "Sales",
    pareto_desc_1:
      "Pareto analysis helps you identify which products matter most.",
    pareto_desc_2:
      "A small number of products usually account for most of your results.",
    pareto_desc_3: "You can use this data in order to:",
    pareto_focus: "Focus on your most important products",
    pareto_reduce: "Reduce money tied up in slow items",
    pareto_improve: "Improve profitability decisions",

    // SEARCH / INPUT
    search_product: "Search product...",
    search_inventory: "Search inventory...",
    search_product_or_id: "Search product name or ID...",
    quantity: "Quantity",
    notes: "Notes",
    note: "Note",
    submit: "Submit",
    cancel: "Cancel",
    close: "Close",
    confirm: "Confirm",
    apply: "Apply",
    loading: "Loading...",
    saving: "Saving...",
    refresh: "Refresh",
    review: "Review",
    details: "Details",
    actions: "Actions",

    // INVENTORY
    stock: "Stock",
    movement: "Movement",
    lowstock: "Low Stock",
    pareto: "Pareto",
    deadstock: "Dead Stock",
    services: "Services",
    value: "Value",
    qty: "Qty",
    inv: "Inv",
    no_issues: "No issues",
    stock_label: "Stock",
    min: "Min",
    never: "Never",

    // NAV
    pos: "POS",
    inventory: "Inventory",
    diagnostics: "Diagnostics",
    products: "Products",
    analysis: "Analysis",
    cash: "Cash",

    // SALES FLOW
    sales_history: "Sales History",
    intake_history: "Intake History",
    sale: "Sale",
    intake: "Intake",
    finalize_sale: "Finalize Sale",
    finalize_intake: "Finalize Intake",
    paid: "Paid",
    sale_ticket: "Sale Ticket",
    intake_ticket: "Intake Ticket",
    discount: "Discount",
    loss_on_sale: "Loss on this sale",
    sale_saved_pending:
      "Sale saved locally. It will synchronize automatically when the connection returns. Do not submit it again.",

    sale_save_failed:
      "The sale could not be saved. Please try again.",

    // HISTORY / TICKET DETAILS
    ticket: "Ticket",
    date: "Date",
    product: "Product",
    product_id: "Product ID",
    product_lines: "Product Lines",
    total_units: "Total Units",
    total_cost: "Total Cost",
    unit_cost: "Unit Cost",
    sale_price: "Sale Price",
    line_cost: "Line Cost",
    totals: "Totals",
    no_intakes: "No intake tickets found for this date range.",

    // PRODUCT MOVEMENT SUMMARY
    product_movement_summary: "Product Movement Summary",
    initial: "Initial",
    purchase: "Purchase",
    transfer_in: "Transfer In",
    transfer_out: "Transfer Out",
    adjustment_positive: "Adj +",
    adjustment_negative: "Adj -",
    stock_adjustment: "Stock Adjustment",
    counted_total: "Counted Total",
    counted_total_help:
      "Select a product and enter the total physically counted. VENDR calculates the adjustment.",
    calculated_adjustment: "Calculated adjustment",
    difference: "Difference",
    select: "Select",
    confirm_adjustment: "Confirm Adjustment",
    physical_count: "Physical count",
    damage_or_loss: "Damage or loss",
    found_stock: "Stock found",
    data_correction: "Data correction",
    invalid_counted_stock:
      "Enter a valid whole-number stock total of zero or greater.",
    stock_changed_recount:
      "Stock changed after the count began. The latest stock has been loaded; please count the product again.",
    stock_adjustment_completed:
      "Stock count recorded.",
    stock_adjustment_saved_pending:
      "Stock count saved locally and pending synchronization.",
    stock_adjustment_failed:
      "The stock count could not be recorded.",
    final: "Final",
    no_product_movement:
      "No product movement found for this date range.",

    // PRODUCT DIAGNOSTICS
    product_diagnostics: "Product Diagnostics",
    products_need_attention: "products need attention",
    total_issues: "total issues",
    showing_products_with_issues:
      "Showing {products} products with {issues} matching issues",
    no_diagnostic_issues: "No diagnostic issues match this view.",
    issue_fixed: "Issue Fixed!",

    all: "All",
    price_less_than_cost: "Price < Cost",
    cost_equals_zero: "Cost = 0",
    price_equals_zero: "Price = 0",
    negative_stock: "Negative Stock",

    price_below_cost: "Price below cost",
    cost_is_zero: "Cost is zero",
    price_is_zero: "Price is zero",
    stock_is_negative: "Stock is negative",

    review_cost_and_sale_price: "Review cost and sale price",
    enter_product_cost: "Enter product cost",
    enter_sale_price: "Enter sale price",
    verify_physical_stock: "Verify physical stock",
    review_product: "Review product",

    review_diagnostic_issue: "Review Diagnostic Issue",
    current_stock: "Current stock",
    correct_physical_stock: "Correct physical stock",
    apply_price_change: "Apply Price Change",
    apply_stock_adjustment: "Apply Stock Adjustment",
    price_still_below_cost:
      "Warning: the entered price is still below cost.",

    invalid_cost_price:
      "Cost and price must be valid numbers equal to or greater than zero.",
    invalid_correct_stock:
      "Correct stock must be a valid number equal to or greater than zero.",
    same_stock_value:
      "The corrected stock is the same as the current stock.",
    could_not_load_diagnostics:
      "Could not load product diagnostics.",
    could_not_apply_price_correction:
      "Could not apply the price correction.",
    could_not_apply_stock_correction:
      "Could not apply the stock correction.",
    no_issues_to_export:
      "There are no diagnostic issues to export.",

    // DIAGNOSTICS EXCEL EXPORT
    export_all_issues: "Export All Issues",
    vendr_product_diagnostics: "VENDR Product Diagnostics",
    store_id: "Store ID",
    exported: "Exported",
    products_requiring_attention: "Products Requiring Attention",
    issue: "Issue",
    recommended_action: "Recommended Action",
    reviewed: "Reviewed",

    // CASH PANEL
    cash_balance: "Cash Balance",
    expense: "Expense",
    adjust_register: "Adjust Register",
    move_cash: "Move Cash",
    adjustment_direction:
      "Adjustment direction",
    movement_direction:
      "Movement direction",
    register_increase:
      "Increase register balance",
    register_decrease:
      "Decrease register balance",
    into_register: "Into register",
    out_of_register:
      "Out of register",
    cash_source: "Cash source",
    cash_destination:
      "Cash destination",
    strongbox: "Strongbox",
    bank: "Bank",
    other_location: "Other location",
    select_cash_location:
      "Select the other cash location.",
    amount_greater_than_zero:
      "Amount must be greater than zero.",
    adjustment_no_profit_effect:
      "This corrects the register balance and does not count as revenue or expense.",
    cash_transfer_no_profit_effect:
      "This moves existing cash and does not count as revenue or expense.",
    cash_movement_recorded:
      "Cash movement recorded.",
    cash_movement_saved_pending:
      "Cash movement saved. It will synchronize when a connection is available.",
    cash_movement_failed:
      "Unable to save the cash movement.",
    total_expense: "Total expense",
    total_revenue: "Total revenue",
    paid_from_register:
      "Paid from register",
    received_in_register:
      "Received in register",
    remaining_amount:
      "Remaining amount",
    paid_from: "Paid from",
    received_at: "Received at",
    invalid_register_amount:
      "The register amount must be between zero and the total amount.",
    select_external_source:
      "Select the source for the amount outside the register.",

    // RETURN MODAL
    return_refund: "Return / Refund",
    refund: "Refund",
    return: "Return",
    amount: "Amount",
    select_product: "Select product",
    enter_valid_amount: "Enter valid amount",
    failed: "Failed",
    linked_return: "Return linked to sale",
    unlinked_return: "Unlinked product return",
    find_sale_ticket: "Find sale ticket",
    continue_without_ticket: "Without ticket",
    refund_only: "Refund only",
    ticket_number: "Ticket number",
    date_range: "Date range",
    enter_ticket_number: "Enter a ticket number",
    ticket_search_failed: "Could not search sale tickets. Linked returns require a connection.",
    ticket_details_failed: "Could not load the sale ticket.",
    no_tickets_found: "No sale tickets found",
    search: "Search",
    select_return_quantity: "Select at least one quantity to return",
    return_quantity: "Quantity to return",
    purchased: "Purchased",
    already_returned: "Already returned",
    refund_total: "Refund total",
    cash_sale: "Cash sale",
    credit_sale: "On-credit sale",
    debt_reduced: "Debt reduced",
    cash_refund: "Cash refund",
    linked_return_failed: "The linked return could not be completed.",
    unlinked_return_note_required: "A note is required when continuing without a sale ticket.",

    // REVENUE / EXPENSE MODALS
    add_revenue: "Add Revenue",
    add_expense: "Add Expense",
    note_optional: "Note (optional)",
    failed_add_revenue: "Failed to add revenue",
    failed_add_expense: "Failed to add expense",
    movement_summary: "Movement Summary",
    no_movements: "No movements",

    // CATEGORY LABELS
    owner_contribution: "Owner Contribution",
    partner_investment: "Partner Investment",
    loan_received: "Loan Received",
    internal_transfer: "Internal Transfer",
    cash_adjustment: "Cash Adjustment",
    inventory_purchase: "Inventory Purchase",
    payroll: "Payroll",
    utilities: "Utilities",
    taxes: "Taxes",
    maintenance: "Maintenance",
    rent: "Rent",
    owner_draw: "Owner Draw",
    other: "Other",
    product_movement: "Product Movement",
    review_queue: "Review Queue",
    priority: "Priority",
    reason: "Reason",
    high: "High",
    medium: "Medium",
    low: "Low",
    weekly_brief: "Weekly Brief",
    alerts: "Alerts",
    growth: "Growth",
    stability: "Stability",
    shrinking: "Shrinking",
    growing: "Growing",
    stable: "Stable",
    review_panel: "Review Panel",
    open_panel: "Open Panel",
    services_only: "Services Only",
    inventory_only: "Inventory Only",
    mixed_business: "Mixed Business",
    insufficient_history: "Insufficient History",
    monthly_trend: "Monthly Trend",
    quarterly_trend: "Quarterly Trend",
    annual_trend: "Annual Trend",
    negative_stock_alert: "Negative Stock",
    low_stock_alert: "Low Stock",
    priority_low_stock_alert: "Priority low-stock item",
    priority_low_stock_explanation: "Priority items are low in stock and rank among the fastest-selling 20% of products over the last 30 days.",
    priority_reorder: "Priority reorder",
    units_sold_last_30_days: "Net units sold (30 days)",
    zero_cost_alert: "Zero Cost",
    zero_price_alert: "Zero Price",
    high_adjustment_activity: "High Stock Adjustment Activity",

    // CLIENTS
    clients: "Clients",
    client: "Client",
    new_client: "New Client",
    edit_client: "Edit Client",
    client_name: "Client Name",
    contact: "Contact",
    contact_name: "Contact Name",
    phone: "Phone",
    whatsapp: "WhatsApp",
    address: "Address",
    tax_id: "Tax / Identification Number",
    credit_limit: "Credit Limit",
    balance: "Balance",
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    show_inactive: "Show inactive",
    search_clients: "Search clients...",
    no_clients: "No clients have been created.",
    no_clients_found: "No matching clients found.",
    deactivate: "Deactivate",
    reactivate: "Reactivate",
    confirm_deactivate_client:
      "Deactivate this client? Their history will remain available.",
    confirm_reactivate_client: "Reactivate this client?",
    overdue_balance: "This client has an overdue balance.",
    client_name_required: "Client name is required.",
    invalid_credit_limit:
      "Credit limit must be zero or greater.",
    client_load_failed: "Unable to load clients.",
    client_save_failed: "Unable to save client.",
    client_status_failed: "Unable to change client status.",
    select_client: "Select client...",
    walk_in_no_client: "Walk-in / No client",
    fiado: "On Credit",
    due_date: "Due Date",
    fiado_client_required:
      "Select a client before recording a fiado sale.",
    confirm_enable_fiado:
      "Record this sale as On Credit for {client}?",
    confirm_disable_fiado:
      "Remove On Credit status from this sale?",
    credit_limit_warning:
      "{client} currently owes ${balance}. This Credit would bring the balance to ${projected}, exceeding the ${limit} credit limit. Continue anyway?",
    account: "Account",
    outstanding_balance: "Outstanding Balance",
    loading_credit_tickets: "Loading credit tickets...",
    no_credit_tickets: "This client has no credit tickets.",
    original_amount: "Original",
    amount_paid: "Paid",
    remaining_balance: "Balance",
    unpaid: "Unpaid",
    partial: "Partial",
    overdue: "Overdue",
    record_payment: "Record Payment",
    payment_amount: "Payment Amount",
    full_balance: "Full Balance",
    confirm_payment: "Confirm Payment",
    invalid_payment_amount:
      "Enter a payment amount greater than zero.",
    payment_exceeds_balance:
      "Payment cannot exceed the remaining balance.",
    credit_tickets_load_failed:
      "Unable to load credit tickets.",
    credit_payment_failed: "Unable to record payment.",
        // PRODUCT PERFORMANCE
    product_performance: "Product Performance",
    product_performance_load_failed:
      "Unable to load product performance.",
    loading_product_performance:
      "Loading product performance...",

    created: "Created",
    current_cost: "Current Cost",
    current_price: "Current Price",

    start_date: "Start Date",
    end_date: "End Date",
    invalid_date_range:
      "Start date cannot be after end date.",

    net_revenue: "Net Revenue",
    net_profit: "Net Profit",
    net_units: "Net Units",
    net_margin: "Net Margin",

    gross_sales: "Gross Sales",
    gross_units_sold: "Gross Units Sold",
    sale_tickets: "Sale Tickets",
    average_selling_price:
      "Average Selling Price",
    cost_of_goods: "Cost of Goods",
    margin: "Margin",

    product_returns: "Product Returns",
    units_returned: "Units Returned",
    returned_revenue: "Returned Revenue",
    restored_cost: "Restored Cost",
    returned_profit: "Returned Profit",
    return_tickets: "Return Tickets",

    sales_velocity: "Sales Velocity",
    units_per_day: "Units / Day",
    units_per_week: "Units / Week",
    period_days: "Days in Period",

    price_changes: "Price Changes",
    price_history: "Price History",
    no_price_changes_period:
      "No recorded price changes in this period.",
    lowest_price: "Lowest",
    highest_price: "Highest",
    price_range: "Range",

    generic_refunds_excluded_note:
      "Cash-only refunds are excluded because they are not linked to individual products.",

    // SUPPLIERS
    suppliers: "Suppliers",
    supplier: "Supplier",
    supplier_list: "Supplier List",
    new_supplier: "New Supplier",
    supplier_name: "Supplier Name",
    search_suppliers: "Search suppliers...",
    no_suppliers: "No suppliers have been created.",
    no_suppliers_found: "No matching suppliers found.",
    supplier_name_required: "Supplier name is required.",
    supplier_created: "Supplier created successfully.",
    supplier_load_failed: "Unable to load suppliers.",
    supplier_create_failed: "Unable to create supplier.",

    // PRODUCT SUPPLIERS
    product_suppliers: "Product Suppliers",
    search_products: "Search products...",
    loading_products: "Loading products...",
    unable_load_products: "Unable to load products.",
    unable_load_suppliers: "Unable to load suppliers.",
    unable_load_assigned_suppliers:
      "Unable to load assigned suppliers.",
    select_supplier_before_saving:
      "Select a supplier before saving.",
    unable_assign_supplier: "Unable to assign supplier.",
    confirm_remove_supplier_product:
      "Remove {supplier} from {product}?",
    unable_remove_supplier: "Unable to remove supplier.",
    confirm_remove_preferred:
      "Remove preferred supplier status from {supplier}? This product will have no preferred supplier.",
    confirm_change_preferred:
      "Make {supplier} the preferred supplier instead of {current_supplier}?",
    confirm_make_preferred:
      "Make {supplier} the preferred supplier?",
    unable_update_preferred:
      "Unable to update preferred supplier.",
    preferred_supplier: "Preferred Supplier",
    last_cost: "Last Cost",
    supply_cycle: "Supply Cycle",
    no_products_found: "No products found.",
    manage_suppliers_for: "Manage suppliers for {product}",
    close_supplier_assignment: "Close supplier assignment",
    loading_assigned_suppliers: "Loading assigned suppliers...",
    assigned_suppliers: "Assigned Suppliers",
    no_suppliers_assigned:
      "No suppliers are assigned to this product.",
    preferred: "Preferred",
    supplier_sku: "Supplier SKU",
    lead_time: "Lead Time",
    remove_preferred_status: "Remove preferred supplier status",
    make_preferred_supplier: "Make preferred supplier",
    preferred_supplier_aria:
      "{supplier} is preferred. Click to remove preferred status.",
    make_preferred_supplier_aria:
      "Make {supplier} the preferred supplier.",
    days: "days",
    removing: "Removing...",
    remove: "Remove",
    assign_supplier: "Assign Supplier",
    no_active_suppliers: "No active suppliers are available.",
    all_suppliers_assigned:
      "All active suppliers are already assigned to this product.",
    select_supplier: "Select supplier...",
    lead_time_days: "Lead Time (days)",
    clear: "Clear",
  },

  es: {
    // AUTH
    login: "Iniciar sesión",
    email: "Correo",
    password: "Contraseña",
    create_account: "Crear cuenta",
    store_name: "Nombre del negocio",
    sign_up: "Registrarse",
    back_to_login: "Volver",
        // AGENDA
    agenda: "Agenda",
    today: "Hoy",
    this_week: "Esta semana",
    custom_range: "Rango personalizado",
    // REPORTES DE ORGANIZACIÓN
organization: "Organización",
organization_reports: "Reportes de organización",
organization_sales_report:
  "Reporte consolidado de ventas",
    // Spanish
unit_cost: "Costo unitario",
sales_price_per_unit:
  "Precio de venta unitario",
line_total: "Total",

organization_unlock_description:
  "Ingrese las credenciales secundarias de la organización para consultar reportes consolidados confidenciales.",

username: "Usuario",
unlock_organization: "Desbloquear organización",
unlocking: "Desbloqueando...",
lock_organization: "Bloquear organización",
all_stores: "Todas las tiendas",

select_at_least_one_store:
  "Seleccione al menos una tienda.",

revenue_share:
  "Participación en ventas",

profit_share:
  "Participación en ganancias",

organization_credentials_required:
  "Ingrese el usuario y la contraseña de la organización.",

organization_login_failed:
  "No se pudieron desbloquear los reportes de la organización.",

organization_session_expired:
  "El acceso a la organización venció. Ingrese nuevamente las credenciales secundarias.",

organization_report_load_failed:
  "No se pudo cargar el reporte de la organización.",

    agenda_occurrences: "Elementos de agenda",
    new_agenda_item: "Nuevo elemento",
    edit_agenda_item: "Editar elemento",
    no_agenda_items:
      "No se encontraron elementos de agenda para este período.",

    title: "Título",
    scheduled_date: "Fecha programada",
    scheduled_time: "Hora programada",
    any_time: "Cualquier hora",

    recurrence: "Repetición",
    one_time: "Una sola vez",
    daily: "Diariamente",
    weekly: "Semanalmente",
    monthly: "Mensualmente",
    weekdays: "Días de la semana",
    day_of_month: "Día del mes",

    monday_short: "Lun",
    tuesday_short: "Mar",
    wednesday_short: "Mié",
    thursday_short: "Jue",
    friday_short: "Vie",
    saturday_short: "Sáb",
    sunday_short: "Dom",

        reorder_list: "Lista de reposición",
    master_list: "Lista general",
    by_supplier: "Por proveedor",
    unassigned: "Sin asignar",
    add_product: "Agregar producto",
    add: "Agregar",
    update_reorder: "Actualizar reposición",
    add_to_reorder: "Agregar a reposición",
    clear_all: "Vaciar todo",
    clear_supplier_list: "Vaciar lista del proveedor",
    clear_unassigned: "Vaciar sin asignar",
    save_to_reorder_list: "Guardar en lista de reposición",

    open: "Pendientes",
    completed: "Completados",
    complete: "Completar",
    reopen: "Reabrir",
    delete: "Eliminar",

    agenda_title_required:
      "El título del elemento es obligatorio.",
    agenda_weekday_required:
      "Seleccione al menos un día de la semana.",
    agenda_month_day_required:
      "Ingrese un día del mes válido.",
    agenda_load_failed:
      "No se pudo cargar la agenda.",
    agenda_save_failed:
      "No se pudo guardar el elemento de agenda.",
    agenda_completion_failed:
      "No se pudo actualizar el elemento de agenda.",
    agenda_delete_failed:
      "No se pudo eliminar el elemento de agenda.",

    // PRODUCT MANAGEMENT
    product_management: "Gestión de productos",
    select_tool: "Seleccione una herramienta",
    create: "Crear",
    price: "Precio",
    edit: "Editar",
    loss: "Pérdida",
    adjustment: "Ajuste",
    transfer: "Transferencia",
    archive: "Archivar",
    restore: "Restaurar",
    import: "Importar",
    name: "Nombre",
    product_name: "Nombre del producto",
    product_name_required: "Nombre requerido",
    product_created: "Producto creado",
    price_change: "Cambio de precio",
    updated: "Actualizado",
    save: "Guardar",

        // MAESTRO DE PRODUCTOS / UBICACIÓN EN POS
    location: "Ubicación",
    location_code_placeholder: "Ejemplo: E3R2I",
    active: "Activo",
    archived: "Archivado",
    active_products: "Productos activos",
    archived_products: "Productos archivados",
    low_stock_products_count: "Productos en existencias bajas",
    yes: "Sí",
    no: "No",

    quick_items: "Productos frecuentes",
    no_quick_items:
      "No hay productos frecuentes disponibles.",
    clear_product_search:
      "Limpiar búsqueda de productos",
    stock_not_tracked:
      "Inventario no controlado",

    // HERRAMIENTAS DE PRODUCTOS
    performance: "Rendimiento",
    performance_coming_next:
      "Los detalles de rendimiento del producto se agregarán a continuación.",

    stock_transfer:
      "Transferencia de inventario",
    stock_transfer_recorded:
      "Transferencia de inventario registrada.",

    // TICKETS DE TRANSFERENCIA
    stock_transfers:
      "Transferencias de inventario",
    incoming: "Entrantes",
    sent: "Enviadas",
    new_transfer: "Nueva transferencia",
    transfer_attention:
      "Transferencia pendiente de confirmación",
    transfer_status_created: "Creada",
    transfer_status_dispatched:
      "Pendiente de recepción",
    transfer_status_received: "Recibida",
    transfer_status_discrepancy:
      "Recibida con diferencia",
    transfer_status_cancelled: "Cancelada",
    transfer_history_requires_connection:
      "El historial de transferencias requiere conexión a internet.",
    transfer_details_requires_connection:
      "Los detalles de la transferencia requieren conexión a internet.",
    transfer_tickets_load_failed:
      "No se pudieron cargar las transferencias.",
    transfer_details_load_failed:
      "No se pudieron cargar los detalles de la transferencia.",
    no_incoming_transfers:
      "No hay transferencias entrantes.",
    no_sent_transfers:
      "No hay transferencias enviadas.",
    destination_store: "Tienda de destino",
    select_destination:
      "Seleccionar destino...",
    general_note: "Nota general",
    optional: "Opcional",
    add_products: "Agregar productos",
    search_local_products:
      "Buscar productos locales",
    transfer_product_already_added:
      "Ese producto ya está en la transferencia.",
    transfer_product_no_stock:
      "Este producto no tiene existencias disponibles para transferir.",
    select_destination_store:
      "Seleccione la tienda de destino.",
    transfer_add_one_product:
      "Agregue al menos un producto.",
    transfer_quantity_invalid:
      "Revise la cantidad de {product}. Debe ser un número entero entre 1 y {stock}.",
    transfer_dispatched:
      "Transferencia enviada.",
    transfer_saved_pending:
      "Transferencia guardada. Se enviará cuando la sincronización esté disponible.",
    transfer_save_failed:
      "No se pudo guardar la transferencia.",
    transfer_items:
      "Productos a transferir",
    no_products_added:
      "No se han agregado productos.",
    available: "Disponible",
    dispatch_transfer:
      "Enviar transferencia",
    loading_transfers:
      "Cargando transferencias...",
    items: "productos",
    units: "unidades",
    back: "Volver",
    dispatched: "Enviada",
    items_units: "Productos / unidades",
    received: "Recibida",
    units_received: "Unidades recibidas",
    transfer_note:
      "Nota de transferencia",
    sent_product: "Producto enviado",
    destination_product:
      "Producto de destino",
    previous_match:
      "Coincidencia anterior",
    search_to_change:
      "Buscar para cambiar",
    awaiting_mapping:
      "Pendiente de asignación",
    receiving_note: "Nota de recepción",
    confirming: "Confirmando...",
    confirm_receipt:
      "Confirmar recepción",
    transfer_receipt_requires_connection:
      "La confirmación de recepción requiere conexión a internet.",
    select_local_product_every_line:
      "Seleccione un producto local para cada línea.",
    transfer_unique_local_products:
      "Cada línea debe usar un producto local diferente.",
    received_quantity_invalid:
      "Las cantidades recibidas deben ser números enteros entre cero y la cantidad enviada.",
    transfer_received_discrepancy:
      "Transferencia recibida con una diferencia de cantidad.",
    transfer_received:
      "Transferencia recibida.",
    transfer_receipt_failed:
      "No se pudo confirmar la recepción.",

    create_product: "Crear producto",
    initial_stock: "Inventario inicial",
    cost: "Costo",
    low_stock: "Stock mínimo",
    tracks_stock: "Controla inventario",

    // SALES / ANALYSIS
    sales_analysis: "Análisis de ventas",
    revenue: "Ingresos",
    profit: "Ganancia",
    tickets: "Tickets",
    avg_daily_revenue: "Promedio diario de ingresos",
    avg_daily_profit: "Promedio diario de ganancia",
    avg_ticket: "Ticket promedio",
    top_revenue: "Mayores ingresos",
    top_profit: "Mayor ganancia",
    top_volume: "Mayor volumen",
    no_data: "Sin datos",

    // PARETO
    investment: "Inversión",
    sales: "Ventas",
    pareto_desc_1:
      "El análisis de Pareto ayuda a identificar cuáles productos son más importantes.",
    pareto_desc_2:
      "Un pequeño número de productos generalmente representa la mayoría de los resultados.",
    pareto_desc_3: "Puede usar estos datos para:",
    pareto_focus: "Enfocarse en los productos más importantes",
    pareto_reduce: "Reducir dinero inmovilizado en productos lentos",
    pareto_improve: "Mejorar las decisiones de rentabilidad",

    // SEARCH / INPUT
    search_product: "Buscar producto...",
    search_inventory: "Buscar inventario...",
    search_product_or_id: "Buscar por nombre o ID del producto...",
    quantity: "Cantidad",
    notes: "Notas",
    note: "Nota",
    submit: "Guardar",
    cancel: "Cancelar",
    close: "Cerrar",
    confirm: "Confirmar",
    apply: "Aplicar",
    loading: "Cargando...",
    saving: "Guardando...",
    refresh: "Actualizar",
    review: "Revisar",
    details: "Detalles",
    actions: "Acciones",

    // INVENTORY
    stock: "Inventario",
    movement: "Movimientos",
    lowstock: "Stock bajo",
    pareto: "Pareto",
    deadstock: "Stock muerto",
    services: "Servicios",
    value: "Valor",
    qty: "Cant.",
    inv: "Inv.",
    no_issues: "Sin problemas",
    stock_label: "Stock",
    min: "Mín.",
    never: "Nunca",

    // NAV
    pos: "POS",
    history: "Historial",
    inventory: "Inventario",
    diagnostics: "Diagnóstico",
    products: "Productos",
    analysis: "Análisis",
    cash: "Caja",

    // SALES FLOW
    sales_history: "Historial de ventas",
    intake_history: "Historial de ingresos",
    sale: "Venta",
    intake: "Ingreso",
    finalize_sale: "Finalizar venta",
    finalize_intake: "Finalizar ingreso",
    paid: "Pagado",
    sale_ticket: "Ticket de venta",
    intake_ticket: "Ticket de ingreso",
    discount: "Descuento",
    loss_on_sale: "Pérdida en esta venta",
    sale_saved_pending:
      "Venta guardada localmente. Se sincronizará automáticamente cuando vuelva la conexión. No es necesario volver a registrarla.",

    sale_save_failed:
      "No se pudo guardar la venta. Inténtelo nuevamente.",

    // HISTORY / TICKET DETAILS
    ticket: "Ticket",
    date: "Fecha",
    product: "Producto",
    product_id: "ID del producto",
    product_lines: "Productos distintos",
    total_units: "Unidades totales",
    total_cost: "Costo total",
    unit_cost: "Costo unitario",
    sale_price: "Precio de venta",
    line_cost: "Costo de línea",
    totals: "Totales",
    no_intakes:
      "No se encontraron tickets de ingreso en este período.",

    // PRODUCT MOVEMENT SUMMARY
    product_movement_summary: "Resumen de movimientos de productos",
    initial: "Inicial",
    purchase: "Compra",
    transfer_in: "Transferencia entrante",
    transfer_out: "Transferencia saliente",
    adjustment_positive: "Ajuste +",
    adjustment_negative: "Ajuste -",
    stock_adjustment: "Ajuste de inventario",
    counted_total: "Total contado",
    counted_total_help:
      "Seleccione un producto e ingrese la existencia física total. VENDR calculará el ajuste.",
    calculated_adjustment: "Ajuste calculado",
    difference: "Diferencia",
    select: "Seleccionar",
    confirm_adjustment: "Confirmar ajuste",
    physical_count: "Conteo físico",
    damage_or_loss: "Daño o pérdida",
    found_stock: "Existencia encontrada",
    data_correction: "Corrección de datos",
    invalid_counted_stock:
      "Ingrese un total de inventario válido, entero e igual o mayor que cero.",
    stock_changed_recount:
      "El inventario cambió después de iniciar el conteo. Se cargó la existencia más reciente; vuelva a contar el producto.",
    stock_adjustment_completed:
      "Conteo de inventario registrado.",
    stock_adjustment_saved_pending:
      "Conteo guardado localmente y pendiente de sincronización.",
    stock_adjustment_failed:
      "No se pudo registrar el conteo de inventario.",
    final: "Final",
    no_product_movement:
      "No se encontraron movimientos de productos en este período.",

    // PRODUCT DIAGNOSTICS
    product_diagnostics: "Diagnóstico de productos",
    products_need_attention: "productos requieren atención",
    total_issues: "problemas totales",
    showing_products_with_issues:
      "Mostrando {products} productos con {issues} problemas coincidentes",
    no_diagnostic_issues:
      "No hay problemas de diagnóstico que coincidan con esta vista.",
    issue_fixed: "¡Problema corregido!",

    all: "Todos",
    price_less_than_cost: "Precio < costo",
    cost_equals_zero: "Costo = 0",
    price_equals_zero: "Precio = 0",
    negative_stock: "Stock negativo",

    price_below_cost: "Precio menor que el costo",
    cost_is_zero: "El costo es cero",
    price_is_zero: "El precio es cero",
    stock_is_negative: "El stock es negativo",

    review_cost_and_sale_price:
      "Revisar costo y precio de venta",
    enter_product_cost: "Ingresar costo del producto",
    enter_sale_price: "Ingresar precio de venta",
    verify_physical_stock: "Verificar existencias físicas",
    review_product: "Revisar producto",

    review_diagnostic_issue:
      "Revisar problema de diagnóstico",
    current_stock: "Stock actual",
    correct_physical_stock: "Existencia física correcta",
    apply_price_change: "Aplicar cambio de precio",
    apply_stock_adjustment: "Aplicar ajuste de inventario",
    price_still_below_cost:
      "Advertencia: el precio ingresado todavía es menor que el costo.",

    invalid_cost_price:
      "El costo y el precio deben ser números válidos iguales o mayores que cero.",
    invalid_correct_stock:
      "El stock correcto debe ser un número válido igual o mayor que cero.",
    same_stock_value:
      "El stock corregido es igual al stock actual.",
    could_not_load_diagnostics:
      "No se pudo cargar el diagnóstico de productos.",
    could_not_apply_price_correction:
      "No se pudo aplicar la corrección de precio.",
    could_not_apply_stock_correction:
      "No se pudo aplicar la corrección de inventario.",
    no_issues_to_export:
      "No hay problemas de diagnóstico para exportar.",

    // DIAGNOSTICS EXCEL EXPORT
    export_all_issues: "Exportar todos los problemas",
    vendr_product_diagnostics:
      "Diagnóstico de productos VENDR",
    store_id: "ID de tienda",
    exported: "Exportado",
    products_requiring_attention:
      "Productos que requieren atención",
    issue: "Problema",
    recommended_action: "Acción recomendada",
    reviewed: "Revisado",

    // CASH PANEL
    cash_balance: "Saldo de caja",
    expense: "Gasto",
    adjust_register: "Ajustar caja",
    move_cash: "Mover efectivo",
    adjustment_direction:
      "Dirección del ajuste",
    movement_direction:
      "Dirección del movimiento",
    register_increase:
      "Aumentar saldo de caja",
    register_decrease:
      "Disminuir saldo de caja",
    into_register: "Hacia la caja",
    out_of_register:
      "Fuera de la caja",
    cash_source:
      "Origen del efectivo",
    cash_destination:
      "Destino del efectivo",
    strongbox: "Caja fuerte",
    bank: "Banco",
    other_location: "Otro lugar",
    select_cash_location:
      "Seleccione el otro lugar del efectivo.",
    amount_greater_than_zero:
      "El monto debe ser mayor que cero.",
    adjustment_no_profit_effect:
      "Este movimiento corrige el saldo de caja y no cuenta como ingreso ni gasto.",
    cash_transfer_no_profit_effect:
      "Este movimiento traslada efectivo existente y no cuenta como ingreso ni gasto.",
    cash_movement_recorded:
      "Movimiento de efectivo registrado.",
    cash_movement_saved_pending:
      "Movimiento de efectivo guardado. Se sincronizará cuando haya conexión.",
    cash_movement_failed:
      "No se pudo guardar el movimiento de efectivo.",
    total_expense: "Gasto total",
    total_revenue: "Ingreso total",
    paid_from_register:
      "Pagado desde caja",
    received_in_register:
      "Recibido en caja",
    remaining_amount:
      "Monto restante",
    paid_from: "Pagado desde",
    received_at: "Recibido en",
    invalid_register_amount:
      "El monto de caja debe estar entre cero y el monto total.",
    select_external_source:
      "Seleccione el origen del monto fuera de caja.",

    // RETURN MODAL
    return_refund: "Devolución / Reembolso",
    refund: "Reembolso",
    return: "Devolución",
    amount: "Monto",
    select_product: "Seleccionar producto",
    enter_valid_amount: "Ingrese un monto válido",
    failed: "Error",
    linked_return: "Devolución vinculada a venta",
    unlinked_return: "Devolución de producto sin vínculo",
    find_sale_ticket: "Buscar ticket de venta",
    continue_without_ticket: "Sin ticket",
    refund_only: "Solo reembolso",
    ticket_number: "Número de ticket",
    date_range: "Rango de fechas",
    enter_ticket_number: "Ingrese un número de ticket",
    ticket_search_failed: "No se pudieron buscar los tickets. Las devoluciones vinculadas requieren conexión.",
    ticket_details_failed: "No se pudo cargar el ticket de venta.",
    no_tickets_found: "No se encontraron tickets de venta",
    search: "Buscar",
    select_return_quantity: "Seleccione al menos una cantidad para devolver",
    return_quantity: "Cantidad a devolver",
    purchased: "Comprado",
    already_returned: "Ya devuelto",
    refund_total: "Total a reembolsar",
    cash_sale: "Venta de contado",
    credit_sale: "Venta al fiado",
    debt_reduced: "Deuda reducida",
    cash_refund: "Reembolso en efectivo",
    linked_return_failed: "No se pudo completar la devolución vinculada.",
    unlinked_return_note_required: "Se requiere una nota al continuar sin ticket de venta.",

    // REVENUE / EXPENSE MODALS
    add_revenue: "Agregar ingreso",
    add_expense: "Agregar gasto",
    note_optional: "Nota (opcional)",
    failed_add_revenue: "Error al agregar ingreso",
    failed_add_expense: "Error al agregar gasto",
    movement_summary: "Resumen de movimientos",
    no_movements: "Sin movimientos",

    // CATEGORY LABELS
    owner_contribution: "Aporte del dueño",
    partner_investment: "Inversión de socio",
    loan_received: "Préstamo recibido",
    internal_transfer: "Transferencia interna",
    cash_adjustment: "Ajuste de caja",
    inventory_purchase: "Compra de mercadería",
    payroll: "Nómina",
    utilities: "Servicios básicos",
    taxes: "Impuestos",
    maintenance: "Mantenimiento",
    rent: "Renta",
    owner_draw: "Retiro del dueño",
    other: "Otros",
    product_movement: "Movimiento de Producto",
    review_queue: "Cola de revisión",
    priority: "Prioridad",
    reason: "Motivo",
    high: "Alta",
    medium: "Media",
    low: "Baja",
    weekly_brief: "Resumen Semanal",
    alerts: "Alertas",
    growth: "Crecimiento",
    stability: "Estabilidad",
    shrinking: "En contracción",
    growing: "En crecimiento",
    stable: "Estable",
    review_panel: "Panel de revisión",
    open_panel: "Abrir panel",
    services_only: "Solo servicios",
    inventory_only: "Solo inventario",
    mixed_business: "Negocio mixto",
    insufficient_history: "Historial insuficiente",
    monthly_trend: "Tendencia mensual",
    quarterly_trend: "Tendencia trimestral",
    annual_trend: "Tendencia anual",
    negative_stock_alert: "Stock negativo",
    low_stock_alert: "Stock bajo",
    priority_low_stock_alert: "Producto prioritario con stock bajo",
    priority_low_stock_explanation: "Los productos prioritarios tienen stock bajo y están entre el 20 % de productos que se venden más rápido durante los últimos 30 días.",
    priority_reorder: "Reposición prioritaria",
    units_sold_last_30_days: "Unidades netas vendidas (30 días)",
    zero_cost_alert: "Costo en cero",
    zero_price_alert: "Precio en cero",
    high_adjustment_activity: "Alta actividad de ajustes de inventario",

    // CLIENTES
    clients: "Clientes",
    client: "Cliente",
    new_client: "Nuevo cliente",
    edit_client: "Editar cliente",
    client_name: "Nombre del cliente",
    contact: "Contacto",
    contact_name: "Nombre de contacto",
    phone: "Teléfono",
    whatsapp: "WhatsApp",
    address: "Dirección",
    tax_id: "NIT / Documento de identidad",
    credit_limit: "Límite de crédito",
    balance: "Saldo",
    status: "Estado",
    active: "Activo",
    inactive: "Inactivo",
    show_inactive: "Mostrar inactivos",
    search_clients: "Buscar clientes...",
    no_clients: "No se han creado clientes.",
    no_clients_found: "No se encontraron clientes.",
    deactivate: "Desactivar",
    reactivate: "Reactivar",
    confirm_deactivate_client:
      "¿Desactivar este cliente? Su historial permanecerá disponible.",
    confirm_reactivate_client: "¿Reactivar este cliente?",
    overdue_balance: "Este cliente tiene un saldo vencido.",
    client_name_required: "El nombre del cliente es obligatorio.",
    invalid_credit_limit:
      "El límite de crédito debe ser igual o mayor que cero.",
    client_load_failed: "No se pudieron cargar los clientes.",
    client_save_failed: "No se pudo guardar el cliente.",
    client_status_failed:
      "No se pudo cambiar el estado del cliente.",
    select_client: "Seleccionar cliente...",
    walk_in_no_client: "Venta mostrador / Sin cliente",
    fiado: "Fiado",
    due_date: "Fecha de vencimiento",
    fiado_client_required:
      "Seleccione un cliente antes de registrar una venta fiada.",
    confirm_enable_fiado:
      "¿Registrar esta venta como fiado para {client}?",
    confirm_disable_fiado:
      "¿Quitar el estado de fiado de esta venta?",
    credit_limit_warning:
      "{client} actualmente debe ${balance}. Este fiado elevaría el saldo a ${projected}, superando el límite de crédito de ${limit}. ¿Desea continuar de todos modos?",
    account: "Cuenta",
    outstanding_balance: "Saldo pendiente",
    loading_credit_tickets: "Cargando tickets de fiado...",
    no_credit_tickets: "Este cliente no tiene tickets de fiado.",
    original_amount: "Original",
    amount_paid: "Pagado",
    remaining_balance: "Saldo",
    unpaid: "Sin pagar",
    partial: "Parcial",
    overdue: "Vencido",
    record_payment: "Registrar pago",
    payment_amount: "Monto del pago",
    full_balance: "Saldo completo",
    confirm_payment: "Confirmar pago",
    invalid_payment_amount:
      "Ingrese un monto de pago mayor que cero.",
    payment_exceeds_balance:
      "El pago no puede superar el saldo pendiente.",
    credit_tickets_load_failed:
      "No se pudieron cargar los tickets de fiado.",
    credit_payment_failed: "No se pudo registrar el pago.",

    // PROVEEDORES
    suppliers: "Proveedores",
    supplier: "Proveedor",
    supplier_list: "Lista de proveedores",
    new_supplier: "Nuevo proveedor",
    supplier_name: "Nombre del proveedor",
    search_suppliers: "Buscar proveedores...",
    no_suppliers: "No se han creado proveedores.",
    no_suppliers_found: "No se encontraron proveedores.",
    supplier_name_required:
      "El nombre del proveedor es obligatorio.",
    supplier_created: "Proveedor creado correctamente.",
    supplier_load_failed:
      "No se pudieron cargar los proveedores.",
    supplier_create_failed: "No se pudo crear el proveedor.",
        // RENDIMIENTO DEL PRODUCTO
    product_performance:
      "Rendimiento del producto",
    product_performance_load_failed:
      "No se pudo cargar el rendimiento del producto.",
    loading_product_performance:
      "Cargando rendimiento del producto...",

    created: "Creado",
    current_cost: "Costo actual",
    current_price: "Precio actual",

    start_date: "Fecha inicial",
    end_date: "Fecha final",
    invalid_date_range:
      "La fecha inicial no puede ser posterior a la fecha final.",

    net_revenue: "Ingresos netos",
    net_profit: "Ganancia neta",
    net_units: "Unidades netas",
    net_margin: "Margen neto",

    gross_sales: "Ventas brutas",
    gross_units_sold:
      "Unidades brutas vendidas",
    sale_tickets: "Tickets de venta",
    average_selling_price:
      "Precio promedio de venta",
    cost_of_goods: "Costo de ventas",
    margin: "Margen",

    product_returns:
      "Devoluciones de producto",
    units_returned: "Unidades devueltas",
    returned_revenue: "Ingresos revertidos",
    restored_cost: "Costo restituido",
    returned_profit: "Ganancia revertida",
    return_tickets:
      "Tickets de devolución",

    sales_velocity: "Velocidad de venta",
    units_per_day: "Unidades / Día",
    units_per_week: "Unidades / Semana",
    period_days: "Días del período",

    price_changes: "Cambios de precio",
    price_history: "Historial de precios",
    no_price_changes_period:
      "No se registraron cambios de precio en este período.",
    lowest_price: "Mínimo",
    highest_price: "Máximo",
    price_range: "Rango",

    generic_refunds_excluded_note:
      "Los reembolsos únicamente de caja se excluyen porque no están vinculados a productos individuales.",

    // PROVEEDORES DE PRODUCTOS
    product_suppliers: "Proveedores de productos",
    search_products: "Buscar productos...",
    loading_products: "Cargando productos...",
    unable_load_products: "No se pudieron cargar los productos.",
    unable_load_suppliers:
      "No se pudieron cargar los proveedores.",
    unable_load_assigned_suppliers:
      "No se pudieron cargar los proveedores asignados.",
    select_supplier_before_saving:
      "Seleccione un proveedor antes de guardar.",
    unable_assign_supplier: "No se pudo asignar el proveedor.",
    confirm_remove_supplier_product:
      "¿Quitar a {supplier} de {product}?",
    unable_remove_supplier: "No se pudo quitar el proveedor.",
    confirm_remove_preferred:
      "¿Quitar a {supplier} como proveedor preferido? Este producto quedará sin proveedor preferido.",
    confirm_change_preferred:
      "¿Establecer a {supplier} como proveedor preferido en lugar de {current_supplier}?",
    confirm_make_preferred:
      "¿Establecer a {supplier} como proveedor preferido?",
    unable_update_preferred:
      "No se pudo actualizar el proveedor preferido.",
    preferred_supplier: "Proveedor preferido",
    last_cost: "Último costo",
    supply_cycle: "Ciclo de suministro",
    no_products_found: "No se encontraron productos.",
    manage_suppliers_for: "Administrar proveedores de {product}",
    close_supplier_assignment: "Cerrar asignación de proveedores",
    loading_assigned_suppliers:
      "Cargando proveedores asignados...",
    assigned_suppliers: "Proveedores asignados",
    no_suppliers_assigned:
      "Este producto no tiene proveedores asignados.",
    preferred: "Preferido",
    supplier_sku: "SKU del proveedor",
    lead_time: "Tiempo de entrega",
    remove_preferred_status: "Quitar estado de proveedor preferido",
    make_preferred_supplier: "Establecer como proveedor preferido",
    preferred_supplier_aria:
      "{supplier} es el proveedor preferido. Presione para quitar este estado.",
    make_preferred_supplier_aria:
      "Establecer a {supplier} como proveedor preferido.",
    days: "días",
    removing: "Quitando...",
    remove: "Quitar",
    assign_supplier: "Asignar proveedor",
    no_active_suppliers: "No hay proveedores activos disponibles.",
    all_suppliers_assigned:
      "Todos los proveedores activos ya están asignados a este producto.",
    select_supplier: "Seleccionar proveedor...",
    lead_time_days: "Tiempo de entrega (días)",
    clear: "Limpiar",
  },
};
