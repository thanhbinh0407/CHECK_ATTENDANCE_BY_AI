import pkg from 'pg';
const { Client } = pkg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
});

try {
  await client.connect();
  console.log('PostgreSQL 17 Connection Successful!');
  
  const result = await client.query('SELECT version();');
  console.log('PostgreSQL Version:', result.rows[0].version);
  
  // Create facedb database if not exists
  try {
    await client.query('CREATE DATABASE facedb;');
    console.log('Created facedb database');
  } catch (e) {
    console.log('ℹ️ facedb database already exists');
  }
  
  // Try connecting to facedb
  const client2 = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'facedb',
  });
  
  await client2.connect();
  console.log('Connected to facedb database!');
  
  // Create sample tables
  await client2.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE,
      employee_code VARCHAR(100) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created users table');
  
  const tableResult = await client2.query(`SELECT * FROM information_schema.tables WHERE table_name = 'users';`);
  console.log('Users table exists:', tableResult.rows.length > 0);
  
  await client2.end();
  await client.end();
} catch (err) {
  console.error('PostgreSQL Error:', err.message);
  process.exit(1);
}
