const { query } = require("../config/db");

const FIXED_COMPANY_ID = 1;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatLastAccess(isoDate) {
  if (!isoDate) {
    return "Primeiro acesso nesta sessao";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "Primeiro acesso nesta sessao";
  }

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

exports.index = async (req, res) => {
  try {
    const [activeClientsRow] = await query(
      "SELECT COUNT(*) AS total FROM clients WHERE company_id = ? AND status IN ('ativo', 'active')",
      [FIXED_COMPANY_ID]
    );

    const [receivedMonthRow] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM invoices
       WHERE company_id = ?
         AND status = 'paid'
         AND YEAR(created_at) = YEAR(CURDATE())
         AND MONTH(created_at) = MONTH(CURDATE())`,
      [FIXED_COMPANY_ID]
    );

    const [pendingPaymentsRow] = await query(
      "SELECT COUNT(*) AS total FROM invoices WHERE company_id = ? AND status = 'pending'",
      [FIXED_COMPANY_ID]
    );

    const [pendingAmountRow] = await query(
      "SELECT COALESCE(SUM(amount), 0) AS total FROM invoices WHERE company_id = ? AND status = 'pending'",
      [FIXED_COMPANY_ID]
    );

    const [todayBookingsRow] = await query(
      "SELECT COUNT(*) AS total FROM bookings WHERE company_id = ? AND date = CURDATE() AND status = 'confirmed'",
      [FIXED_COMPANY_ID]
    );

    const upcomingBookings = await query(
      `SELECT bookings.id,
              bookings.start_time,
              bookings.end_time,
              clients.name AS client_name,
              rooms.name AS room_name,
              CASE
                WHEN bookings.start_time <= CURTIME() THEN 'Confirmado'
                ELSE 'Pendente'
              END AS booking_status
       FROM bookings
       INNER JOIN clients ON clients.id = bookings.client_id
       INNER JOIN rooms ON rooms.id = bookings.room_id
       WHERE bookings.company_id = ?
         AND bookings.date = CURDATE()
         AND bookings.status = 'confirmed'
      ORDER BY bookings.start_time ASC`,
      [FIXED_COMPANY_ID]
    );

    const roomOverview = await query(
      `SELECT rooms.id, rooms.name, COUNT(bookings.id) AS bookings_count
       FROM rooms
       LEFT JOIN bookings
        ON bookings.room_id = rooms.id
       AND bookings.company_id = rooms.company_id
       AND bookings.date = CURDATE()
       AND bookings.status = 'confirmed'
       WHERE rooms.company_id = ?
       GROUP BY rooms.id, rooms.name
       ORDER BY rooms.name ASC`,
      [FIXED_COMPANY_ID]
    );

    const overdueAlerts = await query(
      `SELECT clients.name AS client_name,
              SUM(invoices.amount) AS total_due,
              MAX(DATEDIFF(CURDATE(), invoices.due_date)) AS days_overdue
       FROM invoices
       INNER JOIN clients ON clients.id = invoices.client_id
       WHERE invoices.company_id = ?
         AND invoices.status = 'pending'
         AND invoices.due_date < CURDATE()
       GROUP BY invoices.client_id, clients.name
       ORDER BY days_overdue DESC, total_due DESC`,
      [FIXED_COMPANY_ID]
    );

    res.render("dashboard", {
      greetingName: req.session.user_name || "Usuario",
      lastAccessText: formatLastAccess(req.session.last_login_at),
      currentDate: new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      metrics: {
        activeClients: Number(activeClientsRow.total || 0),
        receivedMonth: formatCurrency(receivedMonthRow.total),
        todayBookings: Number(todayBookingsRow.total || 0),
        pendingPayments: Number(pendingPaymentsRow.total || 0),
        pendingAmount: formatCurrency(pendingAmountRow.total),
      },
      summaryText: `Hoje voce tem ${Number(todayBookingsRow.total || 0)} reserva(s) agendada(s), ${Number(
        pendingPaymentsRow.total || 0
      )} pagamento(s) pendente(s) e ${formatCurrency(receivedMonthRow.total)} em receita no mes.`,
      upcomingBookings,
      roomOverview,
      overdueAlerts,
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar dashboard.");
  }
};
