const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http');
const GAME_STATE_MESSAGE = require('./config/game_states');
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });
app.use(cors());
app.use(express.json());
app.get('/', (req, res) => {
  res.status(200).send({MESSAGE:"SERVER UP"})
});
io.on('connection', (socket) => {
  const playRoomMap = {};
  app.get('/check-room/:roomId', (req, res) => {
    const roomCode = req.params.roomId;
    if (!io.sockets.adapter.rooms.get(roomCode)) {
      return res.status(200).send({ available: true });
    } else if (io.sockets.adapter.rooms.get(roomCode)?.size < 2) {
      return res.status(200).send({ available: true });
    } else {
      return res.status(200).send({ available: false });
    }
  });

  socket.on('JOIN_ROOM', (roomCode) => {
    socket.join(roomCode);
    playRoomMap[socket.id] = roomCode;
    if (io.sockets.adapter.rooms.get(roomCode)?.size === 1) {
      io.to(roomCode).emit('GAME_STATE_CHANGE', GAME_STATE_MESSAGE.WAITING_FOR_USER);
    } else {
      io.to(roomCode).emit('GAME_STATE_CHANGE', GAME_STATE_MESSAGE.STARTED
      );
    }
  });

  socket.on('CAN_START', ({ roomCode }) => {
    if (io.sockets.adapter.rooms.get(roomCode)?.size === 2) {
      io.to(roomCode).emit('GAME_STATE_CHANGE', GAME_STATE_MESSAGE.STARTED);
    }
  });

  socket.on('PLAY', ({ id, roomCode, winMove }) => {
    socket.broadcast.to(roomCode).emit('UPDATE_GAME', id, winMove);
  });

  socket.on('disconnect', () => {
    io.to(playRoomMap[socket.id]).emit('USER_LEFT');
    delete playRoomMap[socket.id];
  });
});
const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log('server running => http://localhost:5000')
);
