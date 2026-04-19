const { query } = require("../config/db");

async function ensureServiceTypeColumn() {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'invoices'
       AND COLUMN_NAME = 'service_type'
     LIMIT 1`
  );

  if (rows.length === 0) {
    await query("ALTER TABLE invoices ADD COLUMN service_type VARCHAR(40) NULL AFTER client_id");
    await query("ALTER TABLE invoices ADD INDEX idx_invoices_service_type (service_type)");
  }
}

async function backfillServiceType() {
  await query(
    `UPDATE invoices
     SET service_type = 'other'
     WHERE service_type IS NULL OR service_type = ''`
  );
}

async function run() {
  await ensureServiceTypeColumn();
  await backfillServiceType();
  console.log("Setup de tipo de servico em cobrancas aplicado com sucesso.");
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Erro no setup de tipo de servico:", error.message);
    process.exit(1);
  });
