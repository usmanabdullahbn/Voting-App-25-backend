// config/connections.js - With detailed debugging
const { connect } = require("mongoose");

let isConnected;

const connectDatabase = async () => {
  if (isConnected) return;

  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      dbName: "vote-app", // Specify database name here
    };

    await connect(process.env.DATABASE_URL, options);
    console.log("✅ MongoDB Connected Successfully!");
    isConnected = true;
  } catch (error) {
    console.log("❌ MongoDB Connection Error:");
  }
};

module.exports = connectDatabase;
