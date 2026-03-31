import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

interface DatabaseConfig {
  host: string;
  user: string;
  password: string;
  database: string;
  port: number;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const host = process.env.DB_HOST || "localhost";
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "db_parrucchieri";
  const port = parseInt(process.env.DB_PORT || "3306");

  return { host, user, password, database, port };
};

let connection: mysql.Connection | null = null;

export async function connectDatabase(): Promise<mysql.Connection> {
  try {
    if (connection) {
      console.log("✅ Database già connesso");
      return connection;
    }

    const config = getDatabaseConfig();
    console.log("🔄 Connessione a MySQL");

    connection = await mysql.createConnection(config);

    console.log("✅ Connessione a MySQL riuscita!");

    return connection;
  } catch (error) {
    console.error("❌ Errore connessione database:", error);
    throw error;
  }
}

export function getDatabaseConnection(): mysql.Connection {
  if (!connection) {
    throw new Error("Database non connesso.");
  }
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  try {
    if (connection) {
      await connection.end();
      connection = null;
      console.log("✅ Database disconnesso");
    }
  } catch (error) {
    console.error("❌ Errore disconnessione database:", error);
    throw error;
  }
}

export function isDatabaseConnected(): boolean {
  return connection !== null;
}

export { connection as db };

export default {
  connectDatabase,
  getDatabaseConnection,
  disconnectDatabase,
  isDatabaseConnected,
};
