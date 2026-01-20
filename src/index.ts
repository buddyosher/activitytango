import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { testConnection } from './config/database';
import familyRoutes from './routes/family';
import choreRoutes from './routes/chores';

const app = express();
const PORT = Number(process.env.PORT) || 8080;

// Log environment variables (without sensitive data)
console.log('Environment check:', {
  DB_HOST: process.env.DB_HOST ? 'Set' : 'Missing',
  DB_PORT: process.env.DB_PORT ? 'Set' : 'Missing',
  DB_USER: process.env.DB_USER ? 'Set' : 'Missing',
  DB_PASSWORD: process.env.DB_PASSWORD ? 'Set' : 'Missing',
  DB_NAME: process.env.DB_NAME ? 'Set' : 'Missing',
  NODE_ENV: process.env.NODE_ENV,
  PORT: PORT
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.get('/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.use('/api/family', familyRoutes);
app.use('/api/chores', choreRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const startServer = async () => {
  try {
    console.log('Starting server...');
    
    // Start server first, then test DB connection (Railway friendly)
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('═══════════════════════════════════════════════');
      console.log('🚀 ActivityTANGO Backend Server');
      console.log('═══════════════════════════════════════════════');
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
      console.log(`🗄️  Database: SkySQL MariaDB`);
      console.log('═══════════════════════════════════════════════');
      console.log('');
      console.log('Available endpoints:');
      console.log('  GET  /health');
      console.log('  GET  /api/family/dashboard/:householdId');
      console.log('  POST /api/chores/:choreId/complete');
      console.log('  POST /api/chores/:choreId/claim');
      console.log('');
    });

    // Test DB connection after server starts (non-blocking)
    testConnection().then(connected => {
      if (connected) {
        console.log('✅ Database connection established');
      } else {
        console.warn('⚠️  Database connection failed - server running in degraded mode');
      }
    });

    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
