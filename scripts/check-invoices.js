const { query } = require('../config/db');

(async function(){
  try {
    const rows = await query(`SELECT invoices.id, invoices.company_id, invoices.client_id, clients.name AS client_name, invoices.amount, invoices.due_date, invoices.status, invoices.created_at
    FROM invoices
    LEFT JOIN clients ON clients.id = invoices.client_id
    ORDER BY invoices.id DESC
    LIMIT 50`);

    if (!rows || rows.length === 0) {
      console.log('Nenhuma fatura encontrada.');
      process.exit(0);
    }

    console.log('id\tcompany_id\tclient_id\tclient_name\tamount\tdue_date\tstatus\tcreated_at');
    rows.forEach(r => {
      console.log(`${r.id}\t${r.company_id}\t${r.client_id}\t${r.client_name || ''}\t${r.amount}\t${r.due_date}\t${r.status}\t${r.created_at}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Erro ao consultar faturas:', err);
    process.exit(1);
  }
})();
