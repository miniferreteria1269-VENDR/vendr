export const helpTopics = {
  en: [
    {
      id: "create-product",
      category: "Products",
      question: "How do I create a product?",
      summary: "Add a product to the catalog so it can be sold and tracked.",
      steps: [
        "Open Products and select Create.",
        "Enter the product name, price, cost, and any stock settings you need.",
        "Review the information and save the product."
      ],
      target: { view: "products" },
      videoUrl: null
    },
    {
      id: "import-products",
      category: "Products",
      question: "How do I import several products?",
      summary: "Use VENDR's spreadsheet template to load a catalog in one operation.",
      steps: [
        "Open Products and select Import.",
        "Download the import template and complete it without changing its column names.",
        "Upload the completed XLSX or CSV file and review any rejected rows."
      ],
      target: { view: "products" },
      videoUrl: null
    },
    {
      id: "opening-register",
      category: "Cash",
      question: "How do I set the opening register amount?",
      summary: "Record the cash physically present when you begin using the register.",
      steps: [
        "Open Cash and select Adjust Register.",
        "Choose Increase and enter the amount currently in the register.",
        "Add a note such as Opening balance and confirm."
      ],
      target: { view: "cash" },
      videoUrl: null
    },
    {
      id: "complete-sale",
      category: "Sales",
      question: "How do I complete a sale?",
      summary: "Build a ticket, verify it, and record the payment.",
      steps: [
        "Open POS and create a ticket if one is not already open.",
        "Search for products and add them to the ticket.",
        "Review quantities, prices, discounts, and credit details before confirming the sale."
      ],
      target: { view: "pos" },
      videoUrl: null
    },
    {
      id: "correct-stock",
      category: "Inventory",
      question: "How do I correct a product's stock count?",
      summary: "Enter the physically counted total; VENDR calculates the adjustment.",
      steps: [
        "Open Inventory and select Adjustment.",
        "Find and select the product.",
        "Enter the physically counted total, add a reason or note, and confirm."
      ],
      target: { view: "inventory", inventoryView: "adjustment" },
      videoUrl: null
    },
    {
      id: "low-stock",
      category: "Inventory",
      question: "How do Low Stock and priority warnings work?",
      summary: "Low Stock uses each product's threshold; the orange indicator highlights fast-moving low-stock products.",
      steps: [
        "Open Inventory and select Low Stock.",
        "Use Stock 0 when you only want to review products with no remaining stock.",
        "Adjust the count, change the minimum, or add the product to Reorder directly from the list."
      ],
      target: { view: "inventory", inventoryView: "lowstock", lowStockView: "lowstock" },
      videoUrl: null
    },
    {
      id: "reorder-list",
      category: "Purchasing",
      question: "How do I use the reorder list?",
      summary: "Prepare a purchasing checklist, assign suppliers, and mark must-have items as priority.",
      steps: [
        "Open Inventory, select Low Stock, and then open Reorder List.",
        "Review current stock and change the planned quantity as needed.",
        "Use Purchase Priority for products that must not be omitted from the order."
      ],
      target: { view: "inventory", inventoryView: "lowstock", lowStockView: "reorder" },
      videoUrl: null
    },
    {
      id: "receive-inventory",
      category: "Purchasing",
      question: "How do I receive purchased inventory?",
      summary: "Use an intake ticket to increase stock and preserve its purchasing history.",
      steps: [
        "Open POS, create a ticket, and change its type to Intake.",
        "Choose the supplier and add the products received.",
        "Review quantities and costs, indicate whether it was paid, and confirm the intake."
      ],
      target: { view: "pos" },
      videoUrl: null
    },
    {
      id: "returns",
      category: "Sales",
      question: "How do I record a return or refund?",
      summary: "Link the return to its original sale when possible so cash and inventory remain auditable.",
      steps: [
        "Open Cash and select Return / Refund.",
        "Search for the original ticket and choose the returned products and quantities.",
        "Review the inventory and refund effects before confirming."
      ],
      target: { view: "cash" },
      videoUrl: null
    },
    {
      id: "cash-strongbox",
      category: "Cash",
      question: "What is the difference between Register and Strongbox?",
      summary: "Moving cash to the strongbox changes its location without recording a business expense.",
      steps: [
        "Use Deposit to move cash from the register into the strongbox.",
        "Use Return to Register when cash moves back into the working register.",
        "Use Expense only when money actually leaves the business, and identify how much was paid from each source."
      ],
      target: { view: "cash" },
      videoUrl: null
    },
    {
      id: "offline-sync",
      category: "Synchronization",
      question: "What happens if the connection fails?",
      summary: "Supported work is saved locally and synchronized when connectivity returns.",
      steps: [
        "Watch the status below the store name to see whether VENDR is online and synchronized.",
        "If an operation is saved pending synchronization, do not repeat it.",
        "Open the synchronization status when attention is required and review any event marked Review needed."
      ],
      target: null,
      videoUrl: null
    },
    {
      id: "weekly-brief",
      category: "Reports",
      question: "How do I read the weekly brief?",
      summary: "The brief summarizes sales, gross profit, recorded expenses, inventory signals, and data limitations.",
      steps: [
        "Open Analysis and select Weekly Brief.",
        "Read the summary, then review the references beneath important claims.",
        "Treat recommended actions as prompts for investigation and confirm decisions against store records."
      ],
      target: { view: "analysis" },
      videoUrl: null
    }
  ],
  es: [
    {
      id: "create-product",
      category: "Productos",
      question: "¿Cómo creo un producto?",
      summary: "Agregue un producto al catálogo para poder venderlo y controlar sus existencias.",
      steps: [
        "Abra Productos y seleccione Crear.",
        "Ingrese el nombre, precio, costo y las opciones de inventario que necesite.",
        "Revise la información y guarde el producto."
      ],
      target: { view: "products" },
      videoUrl: null
    },
    {
      id: "import-products",
      category: "Productos",
      question: "¿Cómo importo varios productos?",
      summary: "Utilice la plantilla de VENDR para cargar un catálogo en una sola operación.",
      steps: [
        "Abra Productos y seleccione Importar.",
        "Descargue la plantilla y complétela sin cambiar los nombres de las columnas.",
        "Suba el archivo XLSX o CSV y revise las filas rechazadas."
      ],
      target: { view: "products" },
      videoUrl: null
    },
    {
      id: "opening-register",
      category: "Caja",
      question: "¿Cómo establezco el monto inicial de caja?",
      summary: "Registre el efectivo que se encuentra físicamente en la caja al comenzar.",
      steps: [
        "Abra Caja y seleccione Ajustar caja.",
        "Elija Aumentar e ingrese el monto que se encuentra actualmente en la caja.",
        "Agregue una nota como Saldo inicial y confirme."
      ],
      target: { view: "cash" },
      videoUrl: null
    },
    {
      id: "complete-sale",
      category: "Ventas",
      question: "¿Cómo completo una venta?",
      summary: "Prepare el ticket, revíselo y registre el pago.",
      steps: [
        "Abra POS y cree un ticket si todavía no hay uno abierto.",
        "Busque los productos y agréguelos al ticket.",
        "Revise cantidades, precios, descuentos y datos de crédito antes de confirmar la venta."
      ],
      target: { view: "pos" },
      videoUrl: null
    },
    {
      id: "correct-stock",
      category: "Inventario",
      question: "¿Cómo corrijo las existencias de un producto?",
      summary: "Ingrese el total contado físicamente; VENDR calcula el ajuste.",
      steps: [
        "Abra Inventario y seleccione Ajuste.",
        "Busque y seleccione el producto.",
        "Ingrese el total contado, agregue el motivo o una nota y confirme."
      ],
      target: { view: "inventory", inventoryView: "adjustment" },
      videoUrl: null
    },
    {
      id: "low-stock",
      category: "Inventario",
      question: "¿Cómo funcionan Stock bajo y las alertas prioritarias?",
      summary: "Stock bajo usa el mínimo de cada producto; el indicador naranja resalta productos de alta rotación con pocas existencias.",
      steps: [
        "Abra Inventario y seleccione Stock bajo.",
        "Use Existencia 0 para revisar solamente productos agotados.",
        "Ajuste el conteo, cambie el mínimo o agregue el producto a Reposición desde la misma lista."
      ],
      target: { view: "inventory", inventoryView: "lowstock", lowStockView: "lowstock" },
      videoUrl: null
    },
    {
      id: "reorder-list",
      category: "Compras",
      question: "¿Cómo utilizo la lista de reposición?",
      summary: "Prepare una lista de compras, asigne proveedores y marque como prioritarios los productos indispensables.",
      steps: [
        "Abra Inventario, seleccione Stock bajo y luego Lista de reposición.",
        "Revise la existencia actual y cambie la cantidad planificada si es necesario.",
        "Use Prioridad de compra para productos que no deben quedar fuera del pedido."
      ],
      target: { view: "inventory", inventoryView: "lowstock", lowStockView: "reorder" },
      videoUrl: null
    },
    {
      id: "receive-inventory",
      category: "Compras",
      question: "¿Cómo recibo inventario comprado?",
      summary: "Use un ticket de entrada para aumentar existencias y conservar el historial de compra.",
      steps: [
        "Abra POS, cree un ticket y cambie su tipo a Entrada.",
        "Seleccione el proveedor y agregue los productos recibidos.",
        "Revise cantidades y costos, indique si fue pagado y confirme la entrada."
      ],
      target: { view: "pos" },
      videoUrl: null
    },
    {
      id: "returns",
      category: "Ventas",
      question: "¿Cómo registro una devolución o reembolso?",
      summary: "Vincule la devolución con la venta original cuando sea posible para mantener caja e inventario auditables.",
      steps: [
        "Abra Caja y seleccione Devolución / Reembolso.",
        "Busque el ticket original y seleccione los productos y cantidades devueltos.",
        "Revise los efectos en inventario y reembolso antes de confirmar."
      ],
      target: { view: "cash" },
      videoUrl: null
    },
    {
      id: "cash-strongbox",
      category: "Caja",
      question: "¿Cuál es la diferencia entre Caja y Caja fuerte?",
      summary: "Mover efectivo a la caja fuerte cambia su ubicación sin registrar un gasto del negocio.",
      steps: [
        "Use Depositar para mover efectivo de la caja hacia la caja fuerte.",
        "Use Regresar a caja cuando el efectivo vuelva a la caja de trabajo.",
        "Use Gasto solamente cuando el dinero salga del negocio e indique cuánto se pagó desde cada origen."
      ],
      target: { view: "cash" },
      videoUrl: null
    },
    {
      id: "offline-sync",
      category: "Sincronización",
      question: "¿Qué sucede si falla la conexión?",
      summary: "Las operaciones compatibles se guardan localmente y se sincronizan cuando regresa la conexión.",
      steps: [
        "Observe el estado debajo del nombre de la tienda para confirmar si VENDR está en línea y sincronizado.",
        "Si una operación queda pendiente de sincronización, no la repita.",
        "Abra el estado de sincronización cuando requiera atención y revise cualquier evento marcado Revisar."
      ],
      target: null,
      videoUrl: null
    },
    {
      id: "weekly-brief",
      category: "Reportes",
      question: "¿Cómo interpreto el informe semanal?",
      summary: "El informe resume ventas, utilidad bruta, gastos registrados, señales de inventario y limitaciones de los datos.",
      steps: [
        "Abra Análisis y seleccione Informe semanal.",
        "Lea el resumen y luego revise las referencias debajo de las afirmaciones importantes.",
        "Use las acciones recomendadas como puntos de investigación y confirme sus decisiones con los registros de la tienda."
      ],
      target: { view: "analysis" },
      videoUrl: null
    }
  ]
};
