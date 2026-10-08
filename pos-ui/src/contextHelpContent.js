export const contextHelpContent = {
  tracksStock: {
    es: {
      title: "¿Qué significa controlar existencias?",
      body: [
        "Cuando está activado, VENDR lleva el conteo de unidades disponibles. Las ventas, entradas, transferencias y ajustes actualizan ese conteo.",
        "Cuando está desactivado, el producto puede venderse sin mantener un conteo de unidades."
      ],
      example: "Actívelo para productos físicos que necesita contar, como bebidas o herramientas. Desactívelo para servicios o artículos que no controla por unidad."
    },
    en: {
      title: "What does tracking stock mean?",
      body: [
        "When enabled, VENDR keeps a count of the available units. Sales, intakes, transfers, and adjustments update that count.",
        "When disabled, the product can be sold without maintaining a unit count."
      ],
      example: "Enable it for physical products you need to count, such as bottled drinks or tools. Disable it for services or items you do not manage by unit."
    }
  },
  lowStockThreshold: {
    es: {
      title: "Límite de pocas existencias (LST)",
      body: [
        "Es la cantidad a partir de la cual VENDR considera que un producto necesita atención. Si las existencias llegan a este número o bajan de él, el producto aparece como bajo en existencias.",
        "El LST no hace pedidos automáticamente; sirve para avisarle y apoyar la lista de reposición."
      ]
    },
    en: {
      title: "Low Stock Threshold (LST)",
      body: [
        "This is the quantity at which VENDR considers a product to need attention. When stock reaches or falls below this number, the product appears as low stock.",
        "The LST does not place orders automatically; it provides warnings and supports the reorder list."
      ]
    }
  },
  stockAdjustment: {
    es: {
      title: "Ajuste de existencias",
      body: [
        "Use esta herramienta después de contar físicamente un producto. Ingrese el total que realmente encontró, no la cantidad que desea sumar o restar.",
        "VENDR registra la diferencia y actualiza las existencias al total contado."
      ],
      example: "Si VENDR muestra 10 unidades pero usted cuenta 8, ingrese 8."
    },
    en: {
      title: "Stock adjustment",
      body: [
        "Use this after physically counting a product. Enter the total you actually found, not an amount to add or subtract.",
        "VENDR records the difference and changes stock to the counted total."
      ],
      example: "If VENDR shows 10 units but you count 8, enter 8."
    }
  },
  archiveProduct: {
    es: {
      title: "Archivar un producto",
      body: [
        "Archivar retira el producto de las operaciones activas sin borrar su historial. Sus ventas, entradas y otros movimientos anteriores permanecen disponibles.",
        "Un producto archivado puede reactivarse posteriormente."
      ]
    },
    en: {
      title: "Archive a product",
      body: [
        "Archiving removes a product from active workflows without deleting its history. Previous sales, intakes, and other movements remain available.",
        "An archived product can be reactivated later."
      ]
    }
  },
  comboConfiguration: {
    es: {
      title: "Productos combinados",
      body: [
        "Un combo es un artículo de venta formado por otros productos o servicios. El combo no controla existencias por sí mismo, pero cada componente conserva su propia configuración.",
        "Los componentes que controlan existencias se descuentan al vender el combo. Los servicios y componentes sin control de existencias no se descuentan."
      ],
      example: "Un servicio de cambio de cadena puede incluir una cadena con existencias y mano de obra sin existencias."
    },
    en: {
      title: "Combo products",
      body: [
        "A combo is a sale item made from other products or services. The combo does not track its own stock, but every component keeps its individual setting.",
        "Components that track stock are deducted when the combo is sold. Services and non-stock components are not deducted."
      ],
      example: "A chain-replacement service can contain a stocked chain and non-stock labor."
    }
  },
  preferredSupplier: {
    es: {
      title: "Proveedor preferido",
      body: [
        "Es el proveedor que VENDR seleccionará primero al agregar este producto a reposición. Puede cambiarlo cuando sea necesario.",
        "Esta selección no envía pedidos automáticamente."
      ]
    },
    en: {
      title: "Preferred supplier",
      body: [
        "This is the supplier VENDR selects first when the product is added to reorder. You can change it when needed.",
        "This selection does not send orders automatically."
      ]
    }
  },
  supplierLeadTime: {
    es: {
      title: "Tiempo de entrega",
      body: [
        "Indica cuántos días suele tardar este proveedor en entregar el producto. Es información de referencia para planificar compras; VENDR no programa el pedido automáticamente."
      ]
    },
    en: {
      title: "Supplier lead time",
      body: [
        "This is the usual number of days the supplier takes to deliver the product. It is planning information; VENDR does not schedule the order automatically."
      ]
    }
  },
  saleDiscount: {
    es: {
      title: "Descuento de venta",
      body: [
        "Seleccione % para descontar un porcentaje o $ para descontar una cantidad fija. El descuento reduce el total final del ticket, pero nunca lo lleva por debajo de cero."
      ]
    },
    en: {
      title: "Sale discount",
      body: [
        "Select % to deduct a percentage or $ to deduct a fixed amount. The discount reduces the ticket's final total, but never below zero."
      ]
    }
  },
  changeCalculator: {
    es: {
      title: "Calculadora de cambio",
      body: [
        "Cuando está activada, Finalizar venta primero solicita el dinero recibido y muestra el cambio que debe entregar.",
        "Cancelar regresa al ticket. Aceptar continúa con la venta y el comprobante. VENDR no guarda el efectivo recibido ni el cambio calculado."
      ]
    },
    en: {
      title: "Change calculator",
      body: [
        "When enabled, Finalize Sale first asks for the money received and shows the change to return.",
        "Cancel returns to the ticket. Accept continues to the sale and receipt. VENDR does not store the cash received or calculated change."
      ]
    }
  },
  comboTicketEdit: {
    es: {
      title: "Editar combo en el ticket",
      body: [
        "Permite cambiar las opciones o componentes de este combo antes de finalizar la venta.",
        "El cambio afecta solamente esta línea del ticket; no modifica la configuración guardada del combo."
      ]
    },
    en: {
      title: "Edit a combo on the ticket",
      body: [
        "This lets you change the options or components for this combo before finalizing the sale.",
        "The change affects only this ticket line; it does not modify the combo's saved configuration."
      ]
    }
  },
  otherRevenue: {
    es: {
      title: "Otros ingresos",
      body: [
        "Registra dinero que entra a caja por una razón distinta de una venta del POS.",
        "Aumenta el saldo de caja, pero no se cuenta como venta de productos ni aumenta las métricas de ventas."
      ]
    },
    en: {
      title: "Other revenue",
      body: [
        "Records money entering the register for a reason other than a POS sale.",
        "It increases the cash balance but is not counted as product sales or included in sales metrics."
      ]
    }
  },
  expenseVsTransfer: {
    es: {
      title: "Gasto o movimiento de efectivo",
      body: [
        "Registre un gasto cuando el negocio paga algo, como alquiler, mercadería o mantenimiento.",
        "Use Mover efectivo cuando el dinero sigue perteneciendo al negocio y solamente cambia de ubicación. Un traslado interno no es un gasto."
      ]
    },
    en: {
      title: "Expense or cash movement",
      body: [
        "Record an expense when the business pays for something such as rent, inventory, or maintenance.",
        "Use Move Cash when the money still belongs to the business and only changes location. An internal transfer is not an expense."
      ]
    }
  },
  strongbox: {
    es: {
      title: "Caja fuerte",
      body: [
        "La caja fuerte representa efectivo del negocio guardado fuera de la caja registradora.",
        "Depositar y Regresar a caja son traslados internos. Retirar registra un gasto pagado directamente desde la caja fuerte."
      ]
    },
    en: {
      title: "Strongbox",
      body: [
        "The strongbox represents business cash kept outside the register.",
        "Deposit and Return to Register are internal transfers. Withdraw records an expense paid directly from the strongbox."
      ]
    }
  },
  cashCorrection: {
    es: {
      title: "Corrección de saldo",
      body: [
        "Use una corrección cuando el efectivo contado no coincide con el saldo mostrado por VENDR.",
        "La corrección ajusta el saldo registrado, pero no crea una venta, ingreso, ganancia ni gasto."
      ]
    },
    en: {
      title: "Balance correction",
      body: [
        "Use a correction when the cash you count does not match the balance shown by VENDR.",
        "The correction changes the recorded balance but does not create a sale, revenue, profit, or expense."
      ]
    }
  },
  operatingExpense: {
    es: {
      title: "¿Cuenta como gasto operativo?",
      body: [
        "Actívelo para costos normales necesarios para operar el negocio. Estos movimientos se incluyen en los totales de gastos operativos y en el Resumen Semanal.",
        "Si lo desactiva, el dinero seguirá registrándose como salida de caja, pero no aumentará esos totales de gastos operativos."
      ]
    },
    en: {
      title: "Counts as an operating expense?",
      body: [
        "Enable this for normal costs required to operate the business. These movements are included in operating-expense totals and the Weekly Brief.",
        "If disabled, the cash outflow is still recorded but does not increase those operating-expense totals."
      ]
    }
  },
  paidIntake: {
    es: {
      title: "Entrada pagada",
      body: [
        "Una entrada siempre registra las unidades recibidas y puede actualizar costo y precio.",
        "Al marcar Pagada, VENDR también registra el costo total como salida de la caja registradora. Déjela sin marcar si la mercadería aún no se pagó."
      ]
    },
    en: {
      title: "Paid intake",
      body: [
        "An intake always records the units received and may update cost and price.",
        "When marked Paid, VENDR also records the total cost as a register cash outflow. Leave it unchecked if the inventory has not been paid yet."
      ]
    }
  },
  transfers: {
    es: {
      title: "Transferencias entre tiendas",
      body: [
        "Despachar descuenta los productos de la tienda de origen. La tienda de destino debe recibir la transferencia para aumentar sus existencias.",
        "Al recibir, confirme las cantidades reales para registrar cualquier diferencia."
      ]
    },
    en: {
      title: "Store transfers",
      body: [
        "Dispatching deducts products from the source store. The destination store must receive the transfer before its stock increases.",
        "When receiving, confirm the actual quantities so any difference is recorded."
      ]
    }
  },
  reorderList: {
    es: {
      title: "Lista de reposición",
      body: [
        "Es una lista de planificación para productos que necesita comprar. Agregar un producto no cambia sus existencias ni envía un pedido al proveedor.",
        "Cuando existe un proveedor preferido, VENDR lo selecciona primero."
      ]
    },
    en: {
      title: "Reorder list",
      body: [
        "This is a planning list for products you need to purchase. Adding a product does not change stock or send an order to the supplier.",
        "When a preferred supplier exists, VENDR selects it first."
      ]
    }
  },
  masterReview: {
    es: {
      title: "Revisión Maestra",
      body: [
        "Ayuda a verificar sistemáticamente la información de los productos activos. Solamente Guardar y marcar revisado actualiza la fecha de revisión.",
        "El rango de 30, 60, 90 o 180 días es un filtro de la lista. Ocultar revisados deja visibles los productos nunca revisados o cuya revisión ya es antigua."
      ]
    },
    en: {
      title: "Master Review",
      body: [
        "This helps systematically verify active product information. Only Save & Mark Reviewed updates the review date.",
        "The 30, 60, 90, or 180-day range is a list filter. Hide Reviewed leaves never-reviewed products and products whose review is now old."
      ]
    }
  },
  deadStock: {
    es: {
      title: "Productos sin movimiento",
      body: [
        "Muestra productos activos que no se han vendido durante la cantidad seleccionada de días. También incluye productos que nunca han tenido una venta.",
        "Se priorizan por el dinero actualmente invertido en sus existencias."
      ]
    },
    en: {
      title: "Dead stock",
      body: [
        "Shows active products with no sale during the selected number of days. Products that have never sold are also included.",
        "They are prioritized by the money currently invested in their stock."
      ]
    }
  },
  productVelocity: {
    es: {
      title: "Velocidad de venta",
      body: [
        "Indica cuántas unidades del producto se venden por día y por semana durante el período seleccionado.",
        "La velocidad usa las unidades vendidas antes de devoluciones. Las devoluciones aparecen por separado en los resultados netos, y el período incluye todos los días entre las dos fechas."
      ]
    },
    en: {
      title: "Sales velocity",
      body: [
        "Shows how many units of the product sell per day and per week during the selected period.",
        "Velocity uses units sold before returns. Returns appear separately in net results, and the period includes every day between the selected dates."
      ]
    }
  },
  salesAnalysis: {
    es: {
      title: "Análisis de ventas",
      body: [
        "Resume ventas y devoluciones dentro del rango de fechas. La ganancia bruta es venta menos costo registrado del producto; todavía no descuenta los gastos operativos.",
        "Los promedios diarios se dividen entre todos los días calendario del rango, incluyendo días sin ventas."
      ]
    },
    en: {
      title: "Sales analysis",
      body: [
        "Summarizes sales and returns within the date range. Gross profit is sales minus recorded product cost; operating expenses have not yet been deducted.",
        "Daily averages divide by every calendar day in the range, including days without sales."
      ]
    }
  },
  weeklyBrief: {
    es: {
      title: "Resumen Semanal",
      body: [
        "Genera un resumen de la última semana completa, de lunes a domingo, y la compara con la semana anterior.",
        "Usa ventas, ganancia bruta, gastos operativos registrados y señales del inventario. Los movimientos internos de caja no se tratan como gastos."
      ]
    },
    en: {
      title: "Weekly Brief",
      body: [
        "Creates a summary of the last completed Monday-through-Sunday week and compares it with the previous week.",
        "It uses sales, gross profit, recorded operating expenses, and inventory signals. Internal cash movements are not treated as expenses."
      ]
    }
  },
  organizationAnalytics: {
    es: {
      title: "Análisis de la organización",
      body: [
        "Combina los resultados de las tiendas seleccionadas durante el rango de fechas y muestra la participación de cada tienda.",
        "La ganancia mostrada es ganancia bruta de ventas, antes de gastos operativos."
      ]
    },
    en: {
      title: "Organization analytics",
      body: [
        "Combines results from the selected stores during the date range and shows each store's share.",
        "The displayed profit is gross sales profit before operating expenses."
      ]
    }
  }
};

export function getContextHelpContent(topic, lang) {
  const entry = contextHelpContent[topic];
  if (!entry) return null;
  return entry[lang] || entry.es || entry.en;
}
