const { query } = require('../config/db');

(async function(){
  try {
    // pick first client and room
    const clients = await query('SELECT id FROM clients LIMIT 1');
    const rooms = await query('SELECT id FROM rooms LIMIT 1');
    if (clients.length === 0 || rooms.length === 0) {
      console.error('No clients or rooms found. Create seed data first.');
      process.exit(1);
    }
    const clientId = clients[0].id;
    const room = rooms[0];
    const roomId = room.id;
    const price = 100;

    const companyId = 1;
    const date = new Date().toISOString().slice(0,10);
    const start_time = '10:00:00';
    const end_time = '11:00:00';
    const durationHours = 1;
    const bookingValue = Number((durationHours * price).toFixed(2));

    // detect booking value column
    const valColRows = await query(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME IN ('valor', 'value') ORDER BY FIELD(COLUMN_NAME,'valor','value') LIMIT 1`);
    const valCol = valColRows[0] ? valColRows[0].COLUMN_NAME : null;

    // insert booking
    let insertSql, params;
    if (valCol) {
      insertSql = `INSERT INTO bookings (company_id, client_id, room_id, date, start_time, end_time, status, ${valCol}) VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?)`;
      params = [companyId, clientId, roomId, date, start_time, end_time, bookingValue];
    } else {
      insertSql = `INSERT INTO bookings (company_id, client_id, room_id, date, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`;
      params = [companyId, clientId, roomId, date, start_time, end_time];
    }

    const result = await query(insertSql, params);
    console.log('Inserted booking id:', result.insertId || result.insert_id || null);

    // create invoice for booking
    await query('INSERT INTO invoices (company_id, client_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)', [companyId, clientId, bookingValue, date, 'pending']);
    console.log('Invoice created for value:', bookingValue);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
