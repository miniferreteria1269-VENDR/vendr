import { useEffect, useState } from "react";
import axios from "axios";

function SalesHistoryPanel({ storeId }) {

  const [sales, setSales] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [summary, setSummary] = useState({
    revenue: 0,
    profit: 0,
    tickets: 0
  });

  const [ticketDetails, setTicketDetails] = useState(null);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {

    const res = await axios.get(
      "http://127.0.0.1:8000/sales-history",
      {
        params: {
          store_id: storeId,
          start_date: startDate || undefined,
          end_date: endDate || undefined
        }
      }
    );

    const salesData = res.data.sales || [];

    setSales(salesData);

    let revenue = 0;
    let profit = 0;

    salesData.forEach(s => {
      revenue += Number(s.revenue) || 0;
      profit += Number(s.profit) || 0;
    });

    setSummary({
      revenue,
      profit,
      tickets: salesData.length
    });

  };


  const viewTicket = async (ticketId) => {

    const res = await axios.get(
      "http://127.0.0.1:8000/ticket-details",
      {
        params: {
          store_id: storeId,
          ticket_id: ticketId
        }
      }
    );

    setTicketDetails(res.data);

  };


  return (

    <div style={{ padding: 20 }}>

      <h2>Sales Summary</h2>

      {/* Date Filters */}

      <div style={{ marginBottom: 20 }}>

        Start Date:

        <input
          type="date"
          value={startDate}
          onChange={e => setStartDate(e.target.value)}
          style={{ marginLeft: 10, marginRight: 20 }}
        />

        End Date:

        <input
          type="date"
          value={endDate}
          onChange={e => setEndDate(e.target.value)}
          style={{ marginLeft: 10, marginRight: 20 }}
        />

        <button onClick={loadSales}>
          Apply
        </button>

      </div>


      {/* Summary */}

      <div
        style={{
          display: "flex",
          gap: 40,
          marginBottom: 20,
          fontWeight: "bold"
        }}
      >

        <div>Total Revenue: ${summary.revenue.toFixed(2)}</div>

        <div>Total Profit: ${summary.profit.toFixed(2)}</div>

        <div>Total Tickets: {summary.tickets}</div>

      </div>


      {/* MAIN LAYOUT */}

      <div style={{ display: "flex", gap: 30 }}>

        {/* LEFT SIDE — Ticket List */}

        <div
          style={{
            flex: 1,
            maxHeight: "600px",
            overflowY: "auto"
          }}
        >

          {sales.map(sale => (

            <div
              key={sale.ticket_id}
              style={{
                border: "1px solid #ccc",
                padding: 10,
                marginBottom: 8
              }}
            >

              <div>
                <b>Ticket #{sale.ticket_id}</b>
              </div>

              <div>
                {new Date(sale.datetime).toLocaleString()}
              </div>

              <div>
                {sale.items} items
              </div>

              <div>
                Revenue: ${Number(sale.revenue).toFixed(2)}
              </div>

              <button
                onClick={() => viewTicket(sale.ticket_id)}
                style={{ marginTop: 5 }}
              >
                View Ticket
              </button>

            </div>

          ))}

        </div>


        {/* RIGHT SIDE — Ticket Viewer */}

        {ticketDetails && (

          <div
            style={{
              width: 350,
              border: "2px solid #333",
              padding: 15,
              height: "fit-content",
              background: "#fafafa"
            }}
          >

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >

              <h3>Ticket #{ticketDetails.ticket_id}</h3>

              <button
                onClick={() => setTicketDetails(null)}
                style={{
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                X
              </button>

            </div>


            {ticketDetails.items.map((item, i) => (

              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 5
                }}
              >

                <span>{item.name}</span>

                <span>
                  {item.quantity} × ${Number(item.price).toFixed(2)}
                </span>

                <span>
                  ${Number(item.line_total).toFixed(2)}
                </span>

              </div>

            ))}

            <hr />

            <div>
              <b>Total: ${Number(ticketDetails.total).toFixed(2)}</b>
            </div>

            <div>
              Profit: ${Number(ticketDetails.profit).toFixed(2)}
            </div>

          </div>

        )}

      </div>

    </div>

  );

}

export default SalesHistoryPanel;