const serverless = require('serverless-http');
const { app, initializeData } = require('../server');

// 在首次请求前初始化数据
let isInitialized = false;
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  if (!isInitialized) {
    await initializeData();
    isInitialized = true;
  }
  return await handler(event, context);
};