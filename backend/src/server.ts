import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import app from './app';
import SocketService from './services/socketService';

const server = http.createServer(app);

// Initialize Socket.IO
new SocketService(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
