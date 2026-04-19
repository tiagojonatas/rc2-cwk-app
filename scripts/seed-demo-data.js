const mysql = require("mysql2/promise");

async function run() {
  const connection = await mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "coworking_app",
  });

  const statements = [
    `INSERT INTO companies (id, name, created_at)
     VALUES
       (1, 'RC2 Coworking', NOW())
     ON DUPLICATE KEY UPDATE
       name = VALUES(name)`,

    `INSERT INTO clients (id, company_id, name, company_name, phone, email, plan, monthly_value, status, created_at)
     VALUES
       (101, 1, 'Mariana Souza', 'Alfa Studio', '(11) 98811-1001', 'mariana.souza@alfastudio.com.br', 'Flex', 300.00, 'active', DATE_SUB(NOW(), INTERVAL 90 DAY)),
       (102, 1, 'Felipe Rocha', 'Rocha Consultoria', '(21) 97722-1002', 'felipe.rocha@rochaconsultoria.com.br', 'Sala Privativa', 1200.00, 'active', DATE_SUB(NOW(), INTERVAL 75 DAY)),
       (103, 1, 'Camila Martins', NULL, '(31) 96633-1003', 'camila.martins@gmail.com', 'Basico', 150.00, 'active', DATE_SUB(NOW(), INTERVAL 60 DAY)),
       (104, 1, 'Rafael Lima', 'Lima Tech', '(41) 95544-1004', 'rafael@limatech.com.br', 'Flex', 300.00, 'active', DATE_SUB(NOW(), INTERVAL 45 DAY)),
       (105, 1, 'Juliana Costa', 'Costa Arquitetura', '(51) 94455-1005', 'juliana@costaarquitetura.com.br', 'Sala Privativa', 1200.00, 'active', DATE_SUB(NOW(), INTERVAL 40 DAY)),
       (106, 1, 'Diego Nascimento', NULL, '(61) 93366-1006', 'diego.nascimento@gmail.com', 'Basico', 150.00, 'active', DATE_SUB(NOW(), INTERVAL 30 DAY)),
       (107, 1, 'Patricia Araujo', 'Araujo Marketing', '(71) 92277-1007', 'patricia@araujomkt.com.br', 'Flex', 300.00, 'active', DATE_SUB(NOW(), INTERVAL 25 DAY)),
       (108, 1, 'Bruno Ferreira', 'BF Imports', '(81) 91188-1008', 'bruno@bfimports.com.br', 'Sala Privativa', 800.00, 'inactive', DATE_SUB(NOW(), INTERVAL 20 DAY)),
       (109, 1, 'Larissa Gomes', NULL, '(85) 90099-1009', 'larissa.gomes@gmail.com', 'Basico', 150.00, 'inactive', DATE_SUB(NOW(), INTERVAL 15 DAY)),
       (110, 1, 'Thiago Alves', 'TA Design', '(91) 98900-1010', 'thiago@tadesign.com.br', 'Flex', 300.00, 'inactive', DATE_SUB(NOW(), INTERVAL 10 DAY))
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       company_name = VALUES(company_name),
       phone = VALUES(phone),
       email = VALUES(email),
       plan = VALUES(plan),
       monthly_value = VALUES(monthly_value),
       status = VALUES(status)`,

    `INSERT INTO rooms (id, company_id, name)
     VALUES
       (201, 1, 'Sala Reuniao 1'),
       (202, 1, 'Sala Reuniao 2'),
       (203, 1, 'Sala Privativa')
     ON DUPLICATE KEY UPDATE
       name = VALUES(name)`,

    `INSERT INTO invoices (id, company_id, client_id, amount, due_date, status, created_at)
     VALUES
       (1001, 1, 101, 300.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 2 DAY),  'paid',    NOW()),
       (1002, 1, 102, 1200.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 DAY), 'paid',    NOW()),
       (1003, 1, 103, 150.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 8 DAY),  'paid',    NOW()),
       (1004, 1, 104, 300.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 12 DAY), 'paid',    NOW()),
       (1005, 1, 105, 1200.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 15 DAY), 'paid',   NOW()),
       (1006, 1, 106, 150.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 20 DAY), 'pending', NOW()),
       (1007, 1, 107, 300.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 23 DAY), 'pending', NOW()),
       (1008, 1, 101, 300.00, DATE_ADD(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 27 DAY), 'pending', NOW()),
       (1009, 1, 102, 1200.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'pending', NOW()),
       (1010, 1, 104, 300.00, DATE_SUB(CURDATE(), INTERVAL 2 DAY), 'pending', NOW())
     ON DUPLICATE KEY UPDATE
       amount = VALUES(amount),
       due_date = VALUES(due_date),
       status = VALUES(status)`,

    `INSERT INTO bookings (id, company_id, client_id, room_id, date, start_time, end_time, created_at)
     VALUES
       (2001, 1, 101, 201, CURDATE(), '09:00:00', '10:00:00', NOW()),
       (2002, 1, 102, 201, CURDATE(), '10:30:00', '11:30:00', NOW()),
       (2003, 1, 104, 201, CURDATE(), '14:00:00', '15:00:00', NOW()),
       (2004, 1, 103, 202, CURDATE(), '09:30:00', '10:30:00', NOW()),
       (2005, 1, 105, 202, CURDATE(), '11:00:00', '12:00:00', NOW()),
       (2006, 1, 107, 202, CURDATE(), '15:00:00', '16:00:00', NOW()),
       (2007, 1, 106, 203, CURDATE(), '13:00:00', '14:00:00', NOW()),
       (2008, 1, 101, 203, CURDATE(), '16:00:00', '17:00:00', NOW()),
       (2009, 1, 104, 201, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '10:00:00', NOW()),
       (2010, 1, 105, 202, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '15:00:00', NOW()),
       (2011, 1, 107, 203, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '10:00:00', '11:00:00', NOW()),
       (2012, 1, 102, 201, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '15:30:00', '16:30:00', NOW())
     ON DUPLICATE KEY UPDATE
       client_id = VALUES(client_id),
       room_id = VALUES(room_id),
       date = VALUES(date),
       start_time = VALUES(start_time),
       end_time = VALUES(end_time)`,
  ];

  try {
    for (const sql of statements) {
      await connection.query(sql);
    }
    console.log("Seed de demonstracao aplicado com sucesso.");
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error("Erro ao aplicar seed:", error.message);
  process.exit(1);
});
