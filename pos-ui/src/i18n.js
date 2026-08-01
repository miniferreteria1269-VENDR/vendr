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

    // RETURN MODAL
    return_refund: "Return / Refund",
    refund: "Refund",
    return: "Return",
    amount: "Amount",
    select_product: "Select product",
    enter_valid_amount: "Enter valid amount",
    failed: "Failed",

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
    fiado: "Fiado",
    due_date: "Due Date",
    fiado_client_required:
      "Select a client before recording a fiado sale.",
    credit_limit_warning:
      "{client} currently owes ${balance}. This fiado would bring the balance to ${projected}, exceeding the ${limit} credit limit. Continue anyway?",

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

    // RETURN MODAL
    return_refund: "Devolución / Reembolso",
    refund: "Reembolso",
    return: "Devolución",
    amount: "Monto",
    select_product: "Seleccionar producto",
    enter_valid_amount: "Ingrese un monto válido",
    failed: "Error",

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
    credit_limit_warning:
      "{client} actualmente debe ${balance}. Este fiado elevaría el saldo a ${projected}, superando el límite de crédito de ${limit}. ¿Desea continuar de todos modos?",

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
