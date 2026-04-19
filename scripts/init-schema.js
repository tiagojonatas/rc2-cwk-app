const mysql = require("mysql2/promise");

async function run() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    multipleStatements: false,
  });

  const statements = [
    "CREATE DATABASE IF NOT EXISTS `coworking_app` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
    "USE `coworking_app`",
    "CREATE TABLE IF NOT EXISTS `companies` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `name` VARCHAR(150) NOT NULL, `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), KEY `idx_companies_name` (`name`)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `users` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `company_id` BIGINT UNSIGNED NOT NULL, `name` VARCHAR(120) NOT NULL, `email` VARCHAR(150) NOT NULL, `password` VARCHAR(255) NOT NULL, `role` ENUM('admin','manager','funcionario','client') NOT NULL DEFAULT 'client', `status` ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo', PRIMARY KEY (`id`), UNIQUE KEY `uk_users_company_email` (`company_id`, `email`), KEY `idx_users_company_id` (`company_id`), KEY `idx_users_status` (`status`), CONSTRAINT `fk_users_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON UPDATE CASCADE ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `clients` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `company_id` BIGINT UNSIGNED NOT NULL, `name` VARCHAR(120) NOT NULL, `company_name` VARCHAR(150) NULL, `phone` VARCHAR(30) NULL, `email` VARCHAR(150) NULL, `plan` VARCHAR(50) NULL, `monthly_value` DECIMAL(10,2) NOT NULL DEFAULT 0.00, `status` VARCHAR(30) NOT NULL DEFAULT 'active', `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), KEY `idx_clients_company_id` (`company_id`), KEY `idx_clients_status` (`status`), KEY `idx_clients_email` (`email`), CONSTRAINT `fk_clients_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON UPDATE CASCADE ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `invoices` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `company_id` BIGINT UNSIGNED NOT NULL, `client_id` BIGINT UNSIGNED NOT NULL, `service_type` VARCHAR(40) NULL, `amount` DECIMAL(10,2) NOT NULL, `due_date` DATE NOT NULL, `status` VARCHAR(30) NOT NULL DEFAULT 'pending', `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), KEY `idx_invoices_company_id` (`company_id`), KEY `idx_invoices_client_id` (`client_id`), KEY `idx_invoices_service_type` (`service_type`), KEY `idx_invoices_due_date` (`due_date`), KEY `idx_invoices_status` (`status`), CONSTRAINT `fk_invoices_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT `fk_invoices_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `rooms` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `company_id` BIGINT UNSIGNED NOT NULL, `name` VARCHAR(100) NOT NULL, PRIMARY KEY (`id`), KEY `idx_rooms_company_id` (`company_id`), KEY `idx_rooms_name` (`name`), CONSTRAINT `fk_rooms_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON UPDATE CASCADE ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `bookings` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `company_id` BIGINT UNSIGNED NOT NULL, `client_id` BIGINT UNSIGNED NOT NULL, `room_id` BIGINT UNSIGNED NOT NULL, `date` DATE NOT NULL, `start_time` TIME NOT NULL, `end_time` TIME NOT NULL, `status` VARCHAR(40) NOT NULL DEFAULT 'confirmed', `cancel_reason` VARCHAR(255) NULL, `cancelled_by` BIGINT UNSIGNED NULL, `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), KEY `idx_bookings_company_id` (`company_id`), KEY `idx_bookings_client_id` (`client_id`), KEY `idx_bookings_room_id` (`room_id`), KEY `idx_bookings_date` (`date`), KEY `idx_bookings_status` (`status`), KEY `idx_bookings_room_date_time` (`room_id`, `date`, `start_time`), CONSTRAINT `fk_bookings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT `fk_bookings_client` FOREIGN KEY (`client_id`) REFERENCES `clients` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT, CONSTRAINT `fk_bookings_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT, CONSTRAINT `fk_bookings_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
    "CREATE TABLE IF NOT EXISTS `audit_logs` (`id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT, `company_id` BIGINT UNSIGNED NOT NULL, `user_id` BIGINT UNSIGNED NULL, `action` VARCHAR(80) NOT NULL, `description` TEXT NULL, `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (`id`), KEY `idx_audit_logs_company_id` (`company_id`), KEY `idx_audit_logs_user_id` (`user_id`), KEY `idx_audit_logs_action` (`action`), KEY `idx_audit_logs_created_at` (`created_at`), CONSTRAINT `fk_audit_logs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`) ON UPDATE CASCADE ON DELETE CASCADE, CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE CASCADE ON DELETE SET NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",
  ];

  try {
    for (const sql of statements) {
      await connection.query(sql);
    }
    console.log("Schema coworking_app aplicado com sucesso.");
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error("Erro ao aplicar schema:", error.message);
  process.exit(1);
});
