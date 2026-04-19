const { query } = require("../config/db");

async function ensureColumn(columnName, definition) {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'bookings'
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [columnName]
  );

  if (rows.length === 0) {
    await query(`ALTER TABLE bookings ADD COLUMN ${definition}`);
  }
}

async function ensureFkCancelledBy() {
  const fkRows = await query(
    `SELECT CONSTRAINT_NAME
     FROM information_schema.REFERENTIAL_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = 'bookings'
       AND CONSTRAINT_NAME = 'fk_bookings_cancelled_by'
     LIMIT 1`
  );

  if (fkRows.length === 0) {
    await query(
      `ALTER TABLE bookings
       ADD CONSTRAINT fk_bookings_cancelled_by
       FOREIGN KEY (cancelled_by) REFERENCES users(id)
       ON UPDATE CASCADE ON DELETE SET NULL`
    );
  }
}

async function ensureStatusIndex() {
  const indexRows = await query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'bookings'
       AND INDEX_NAME = 'idx_bookings_status'
     LIMIT 1`
  );

  if (indexRows.length === 0) {
    await query("ALTER TABLE bookings ADD INDEX idx_bookings_status (status)");
  }
}

async function run() {
  await ensureColumn("status", "status VARCHAR(40) NOT NULL DEFAULT 'confirmed' AFTER end_time");
  await ensureColumn("cancel_reason", "cancel_reason VARCHAR(255) NULL AFTER status");
  await ensureColumn("cancelled_by", "cancelled_by BIGINT UNSIGNED NULL AFTER cancel_reason");
  await ensureStatusIndex();
  await ensureFkCancelledBy();

  await query(
    `UPDATE bookings
     SET status = 'confirmed'
     WHERE status IS NULL OR status = ''`
  );

  console.log("Booking status setup aplicado com sucesso.");
}

run().then(() => process.exit(0)).catch((error) => {
  console.error("Erro no setup de booking status:", error.message);
  process.exit(1);
});
