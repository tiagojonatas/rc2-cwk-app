const mysql = require("mysql2/promise");

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      user: "root",
      password: "",
      database: "coworking_app",
    });

    // Verificar reservas da empresa 1 na semana atual
    const [rows] = await connection.execute(
      `SELECT id, date, start_time, end_time, status, company_id 
       FROM bookings 
       WHERE company_id = 1 
         AND date >= "2026-04-19" AND date <= "2026-04-25"
         AND status != "cancelled_by_admin"
         AND status != "cancelled_by_client"
         AND status != "cancelado"
       ORDER BY date ASC, start_time ASC`
    );
    console.log('Reservas da empresa 1 (semana atual):', JSON.stringify(rows, null, 2));
    await connection.end();
  } catch (err) {
    console.error('Erro:', err.message);
  }
})();