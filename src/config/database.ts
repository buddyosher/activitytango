import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.SKYSQL_HOST,
  port: parseInt(process.env.SKYSQL_PORT || '4037'),
  user: process.env.SKYSQL_USER,
  password: process.env.SKYSQL_PASSWORD,
  database: process.env.SKYSQL_DATABASE,
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export const testConnection = async (): Promise<boolean> => {
  try {
    const connection = await pool.getConnection();
    console.log('✓ Connected to SkySQL MariaDB successfully');
    console.log(`  Host: ${process.env.SKYSQL_HOST}`);
    console.log(`  Database: ${process.env.SKYSQL_DATABASE}`);
    connection.release();
    return true;
  } catch (error: any) {
    console.error('✗ SkySQL connection failed:', error.message);
    console.error('Error details:', error);
    if (error.code === 'ECONNREFUSED') {
      console.log('  Database may be auto-paused. Retrying in 15 seconds...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      return testConnection();
    }
    return false;
  }
};

export default pool;