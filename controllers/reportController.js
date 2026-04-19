const { query } = require("../config/db");

const FIXED_COMPANY_ID = 1;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function parseSelectedMonth(monthParam) {
  const match = /^(\d{4})-(\d{2})$/.exec(monthParam || "");
  const current = new Date();
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth() + 1;
  const currentIndex = currentYear * 12 + currentMonth;

  if (!match) {
    return {
      year: currentYear,
      month: currentMonth,
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const selectedIndex = year * 12 + month;

  if (month < 1 || month > 12 || selectedIndex < currentIndex) {
    return {
      year: currentYear,
      month: currentMonth,
    };
  }

  return { year, month };
}

function buildMonthOptions() {
  const options = [];
  const current = new Date();
  const baseDate = new Date(current.getFullYear(), current.getMonth(), 1);
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  });

  for (let i = 0; i < 12; i += 1) {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const value = `${year}-${String(month).padStart(2, "0")}`;

    options.push({
      value,
      label: formatter.format(date),
    });
  }

  return options;
}

exports.index = async (req, res) => {
  try {
    const { year, month } = parseSelectedMonth(req.query.month);
    const selectedMonth = `${year}-${String(month).padStart(2, "0")}`;
    const selectedMonthStart = `${selectedMonth}-01`;

    const [paidMonthRow] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM invoices
       WHERE company_id = ?
         AND status = 'paid'
         AND YEAR(created_at) = ?
         AND MONTH(created_at) = ?`,
      [FIXED_COMPANY_ID, year, month]
    );

    const [pendingTotalRow] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM invoices
       WHERE company_id = ?
         AND status = 'pending'
         AND YEAR(created_at) = ?
         AND MONTH(created_at) = ?`,
      [FIXED_COMPANY_ID, year, month]
    );

    const revenueLast3Months = await query(
      `SELECT YEAR(created_at) AS ref_year,
              MONTH(created_at) AS ref_month_num,
              DATE_FORMAT(created_at, '%m/%Y') AS ref_month,
              COALESCE(SUM(amount), 0) AS total
       FROM invoices
       WHERE company_id = ?
         AND status = 'paid'
         AND created_at >= DATE_SUB(?, INTERVAL 2 MONTH)
         AND created_at < DATE_ADD(?, INTERVAL 1 MONTH)
       GROUP BY YEAR(created_at), MONTH(created_at), DATE_FORMAT(created_at, '%m/%Y')
       ORDER BY YEAR(created_at) DESC, MONTH(created_at) DESC`,
      [FIXED_COMPANY_ID, selectedMonthStart, selectedMonthStart]
    );

    const [activeClientsRow] = await query(
      "SELECT COUNT(*) AS total FROM clients WHERE company_id = ? AND status IN ('ativo', 'active')",
      [FIXED_COMPANY_ID]
    );

    const [newClientsMonthRow] = await query(
      `SELECT COUNT(*) AS total
       FROM clients
       WHERE company_id = ?
         AND YEAR(created_at) = ?
         AND MONTH(created_at) = ?`,
      [FIXED_COMPANY_ID, year, month]
    );

    const [inactiveClientsRow] = await query(
      "SELECT COUNT(*) AS total FROM clients WHERE company_id = ? AND status IN ('inativo', 'inactive')",
      [FIXED_COMPANY_ID]
    );

    const roomsMonthUsage = await query(
      `SELECT rooms.id, rooms.name, COUNT(bookings.id) AS bookings_count
       FROM rooms
       LEFT JOIN bookings
         ON bookings.room_id = rooms.id
        AND bookings.company_id = rooms.company_id
        AND YEAR(bookings.date) = ?
        AND MONTH(bookings.date) = ?
        AND bookings.status = 'confirmed'
       WHERE rooms.company_id = ?
       GROUP BY rooms.id, rooms.name
       ORDER BY bookings_count DESC, rooms.name ASC`,
      [year, month, FIXED_COMPANY_ID]
    );

    const topRoomId = roomsMonthUsage.length > 0 ? roomsMonthUsage[0].id : null;

    const [overdueTotalRow] = await query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM invoices
       WHERE company_id = ?
         AND status = 'pending'
         AND due_date < CURDATE()
         AND YEAR(due_date) = ?
         AND MONTH(due_date) = ?`,
      [FIXED_COMPANY_ID, year, month]
    );

    const [overdueClientsRow] = await query(
      `SELECT COUNT(DISTINCT client_id) AS total
       FROM invoices
       WHERE company_id = ?
         AND status = 'pending'
         AND due_date < CURDATE()
         AND YEAR(due_date) = ?
         AND MONTH(due_date) = ?`,
      [FIXED_COMPANY_ID, year, month]
    );

    const overdueList = await query(
      `SELECT clients.name AS client_name, COALESCE(SUM(invoices.amount), 0) AS total_due
       FROM invoices
       INNER JOIN clients ON clients.id = invoices.client_id
       WHERE invoices.company_id = ?
         AND invoices.status = 'pending'
         AND invoices.due_date < CURDATE()
         AND YEAR(invoices.due_date) = ?
         AND MONTH(invoices.due_date) = ?
       GROUP BY invoices.client_id, clients.name
       ORDER BY total_due DESC`,
      [FIXED_COMPANY_ID, year, month]
    );

    res.render("reports/index", {
      pageTitle: "Relatorios",
      activeMenu: "reports",
      topbarDate: new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      revenue: {
        paidMonth: formatCurrency(paidMonthRow.total),
        pendingTotal: formatCurrency(pendingTotalRow.total),
        last3Months: revenueLast3Months.map((item) => ({
          refMonth: item.ref_month,
          total: formatCurrency(item.total),
        })),
      },
      clients: {
        active: Number(activeClientsRow.total || 0),
        newInMonth: Number(newClientsMonthRow.total || 0),
        inactive: Number(inactiveClientsRow.total || 0),
      },
      selectedMonth,
      monthOptions: buildMonthOptions(),
      roomsMonthUsage: roomsMonthUsage.map((room) => ({
        ...room,
        isTopRoom: topRoomId !== null && room.id === topRoomId,
      })),
      delinquency: {
        totalOverdue: formatCurrency(overdueTotalRow.total),
        overdueClients: Number(overdueClientsRow.total || 0),
        list: overdueList.map((item) => ({
          client_name: item.client_name,
          total_due: formatCurrency(item.total_due),
        })),
      },
    });
  } catch (error) {
    res.status(500).send("Erro ao carregar relatorios.");
  }
};
