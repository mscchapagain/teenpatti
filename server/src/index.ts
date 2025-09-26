import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';

const PORT = Number(process.env.PORT || 4000);

const app = express();
app.use(cors());
app.get('/', (_req, res) => res.send('Teen Patti realtime server OK'));

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }, // dev only
});

io.on('connection', (socket) => {
  console.log('client connected', socket.id);

  // simple echo test
  socket.on('ping:echo', (msg: string, cb?: (reply: string) => void) => {
    const reply = `echo:${msg}`;
    cb?.(reply);
    socket.emit('pong:echo', reply);
  });

  // join/leave a table room (we'll use this in TableScreen soon)
  socket.on('table:join', ({ tableId }: { tableId: string }) => {
    socket.join(`table:${tableId}`);
    socket.to(`table:${tableId}`).emit('system', `player ${socket.id} joined ${tableId}`);
  });

  socket.on('table:leave', ({ tableId }: { tableId: string }) => {
    socket.leave(`table:${tableId}`);
    socket.to(`table:${tableId}`).emit('system', `player ${socket.id} left ${tableId}`);
  });

  socket.on('disconnect', (reason) => {
    console.log('client disconnected', socket.id, reason);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Realtime server on http://localhost:${PORT}`);
});
