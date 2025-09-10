const { app, initializeData } = require('../server.js');

// Initialize data once when the serverless function starts
let dataInitialized = false;
if (!dataInitialized) {
  initializeData();
  dataInitialized = true;
}

module.exports = app;