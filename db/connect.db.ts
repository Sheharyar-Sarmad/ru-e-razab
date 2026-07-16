import { connect, connection } from "mongoose";

export const ConnectDB = async (mongoUri: string) => {
  try {
    // If already connected, do nothing
    if (connection.readyState === 1) {
      return;
    }

    // Connect to MongoDB
    const conn = await connect(mongoUri);

    if (conn.connection.readyState === 1) {
      console.log("MongoDB connected successfully");
    }
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
};