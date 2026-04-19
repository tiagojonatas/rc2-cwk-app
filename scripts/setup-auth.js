const { query } = require("../config/db");

async function run() {
  const roleColumn = await query(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND COLUMN_NAME = 'role'
     LIMIT 1`
  );

  if (roleColumn.length === 0) {
    await query(
      "ALTER TABLE users ADD COLUMN role ENUM('admin','manager','funcionario','client') NOT NULL DEFAULT 'client'"
    );
  } else {
    await query(
      "ALTER TABLE users MODIFY COLUMN role ENUM('admin','manager','funcionario','client') NOT NULL DEFAULT 'client'"
    );
  }

  await query(
    `INSERT INTO users (company_id, name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       role = VALUES(role)`,
    [1, "Administrador RC2", "admin@rc2.com", "admin123", "admin", "ativo"]
  );

  await query(
    `INSERT INTO users (company_id, name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       role = VALUES(role)`,
    [1, "Mariana Souza", "mariana.souza@alfastudio.com.br", "cliente123", "client", "ativo"]
  );

  await query(
    `INSERT INTO users (company_id, name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       role = VALUES(role)`,
    [1, "Gerente RC2", "manager@rc2.com", "manager123", "manager", "ativo"]
  );

  await query(
    `INSERT INTO users (company_id, name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       role = VALUES(role)`,
    [1, "Funcionario RC2", "funcionario@rc2.com", "func123", "funcionario", "ativo"]
  );

  console.log("Auth setup aplicado com sucesso.");
  console.log("Admin: admin@rc2.com / admin123");
  console.log("Manager: manager@rc2.com / manager123");
  console.log("Funcionario: funcionario@rc2.com / func123");
  console.log("Cliente: mariana.souza@alfastudio.com.br / cliente123");
  process.exit(0);
}

run().catch((error) => {
  console.error("Erro no setup de auth:", error.message);
  process.exit(1);
});
