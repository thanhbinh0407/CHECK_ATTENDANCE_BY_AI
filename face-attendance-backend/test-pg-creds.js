import pkg from 'pg';
const { Client } = pkg;

const clients = [
  { user: 'postgres', password: '', host: '127.0.0.1', port: 5432 },
  { user: 'postgres', password: 'postgres', host: '127.0.0.1', port: 5432 },
];

for (const config of clients) {
  try {
    const client = new Client({
      ...config,
      database: 'postgres',
      connect_timeout: 2000
    });
    
    await client.connect();
    console.log(`SUCCESS with user:${config.user} password:${config.password || '(empty)'}`);
    
    const result = await client.query('SELECT version();');
    console.log('Version:', result.rows[0].version.split(',')[0]);
    
    // Create facedb database if needed
    try {
      await client.query('CREATE DATABASE facedb;');
      console.log('Created facedb database');
    } catch (e) {
      console.log('ℹ️ facedb database already exists');
    }
    
    await client.end();
    process.exit(0);
  } catch (e) {
    console.log(`Failed: user:${config.user} password:${config.password || '(empty)'}`);
  }
}
