const { app, initializeData } = require('../server.js');

let dataInitializedPromise = null;

async function handler(req, res) {
  // Ensure data is initialized only once.
  if (!dataInitializedPromise) {
    dataInitializedPromise = initializeData();
  }
  // Wait for the data initialization to complete before handling the request.
  await dataInitializedPromise;
  
  // Pass the request to the Express app.
  return app(req, res);
}

module.exports = handler;