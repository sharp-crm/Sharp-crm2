import dotenv from 'dotenv';
// Load environment variables first (only in non-Lambda environments)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config();
}

import express from 'express';
import http from 'http';
import cors from 'cors';
import app from './app';
import { initializeLambda } from './utils/coldStartInit';
import SocketService from './services/socketService';

const server = http.createServer(app);

// Initialize Lambda-specific cold start logic
initializeLambda();

// Initialize Socket.IO
new SocketService(server);

const PORT = parseInt(process.env.PORT || '3000', 10);

// Start server with database readiness check
startServer();

async function startServer() {
  try {
    console.log('🚀 Starting server...');
    
    // Check database connectivity
    const { waitForDatabaseReady } = await import('./utils/dbHealthCheck');
    const isDatabaseReady = await waitForDatabaseReady(5, 3000); // 5 retries, 3 seconds apart
    
    if (!isDatabaseReady) {
      console.warn('⚠️  Database not ready, but starting server anyway...');
      console.log('💡 Make sure to run: npm run init-db');
      console.log('💡 Or start DynamoDB with: docker-compose up -d');
    }
    
    server.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}
