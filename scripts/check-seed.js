const { query } = require("../config/db");

async function run() {
  const [activeClients] = await query(
    "SELECT COUNT(*) AS total FROM clients WHERE company_id=1 AND status IN ('ativo','active')"
  );
  const [monthlyRevenue] = await query(
    "SELECT COALESCE(SUM(monthly_value),0) AS total FROM clients WHERE company_id=1 AND status IN ('ativo','active')"
  );
  const [pendingPayments] = await query(
    "SELECT COUNT(*) AS total FROM invoices WHERE company_id=1 AND status='pending'"
  );
  const [receivedMonth] = await query(
    "SELECT COALESCE(SUM(amount),0) AS total FROM invoices WHERE company_id=1 AND status='paid' AND YEAR(created_at)=YEAR(CURDATE()) AND MONTH(created_at)=MONTH(CURDATE())"
  );
  const [todayBookings] = await query(
    "SELECT COUNT(*) AS total FROM bookings WHERE company_id=1 AND date=CURDATE() AND status='confirmed'"
  );

  console.log(
    JSON.stringify({
      clientesAtivos: activeClients.total,
      receitaMensal: monthlyRevenue.total,
      pendentes: pendingPayments.total,
      recebidoMes: receivedMonth.total,
      reservasHoje: todayBookings.total,
    })
  );

  process.exit(0);
}

run().catch((error) => {
  console.error("Erro ao validar seed:", error.message);
  process.exit(1);
});
