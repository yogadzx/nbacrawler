const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 3223 });

// 当有客户端连接时触发
server.on('connection', (socket) => {
  console.log('Client connected');

  // 处理收到的消息
  socket.on('message', (data) => {
    console.log(`Received: ${data}`);
    // 在此处添加处理消息的逻辑
  });

  // 处理连接关闭
  socket.on('close', () => {
    console.log('Client disconnected');
  });
});