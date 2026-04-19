const { query } = require("../config/db");

async function ensureRoleColumn() {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role'
     LIMIT 1`
  );

  if (rows.length === 0) {
    await query(
      "ALTER TABLE users ADD COLUMN role ENUM('admin','manager','funcionario','client') NOT NULL DEFAULT 'client'"
    );
  } else {
    await query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','funcionario','client') NOT NULL DEFAULT 'client'"
    );
  }
}

async function ensureStatusColumn() {
  const rows = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'status'
     LIMIT 1`
  );

  if (rows.length === 0) {
    await query(
      "ALTER TABLE users ADD COLUMN status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo'"
    );
    await query("ALTER TABLE users ADD INDEX idx_users_status (status)");
  } else {
    await query(
      "ALTER TABLE users MODIFY COLUMN status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo'"
    );
  }
}

async function ensureAuditLogsTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      company_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NULL,
      action VARCHAR(80) NOT NULL,
      description TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_audit_logs_company_id (company_id),
      KEY idx_audit_logs_user_id (user_id),
      KEY idx_audit_logs_action (action),
      KEY idx_audit_logs_created_at (created_at),
      CONSTRAINT fk_audit_logs_company FOREIGN KEY (company_id) REFERENCES companies(id) ON UPDATE CASCADE ON DELETE CASCADE,
      CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
  );
}

async function run() {
  await ensureRoleColumn();
  await ensureStatusColumn();
  await ensureAuditLogsTable();
  console.log("Setup de controle de acesso e auditoria aplicado com sucesso.");
}

run().then(() => process.exit(0)).catch((error) => {
  console.error("Erro no setup de controle de acesso:", error.message);
  process.exit(1);
});
