import dotenv from 'dotenv';
dotenv.config();

import app from "./app";
import { initializeDatabase } from "./utils/initDatabase";

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize database first
    console.log("Initializing database...");
    await initializeDatabase();
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
