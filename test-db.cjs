const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'Allforone1!', 
  server: '127.0.0.1',
  database: 'ReactAppDB',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

async function testConnection() {
  try {
    console.log('Attempting to connect to MS SQL Server...');
    const pool = await sql.connect(config);
    console.log('✅ SUCCESS: Node.js has full access to the database!');
    pool.close();
  } catch (err) {
    console.error('❌ FAILED:', err.message);
  }
}

testConnection();