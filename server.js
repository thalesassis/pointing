const express = require('express');
const next = require('next');
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })

const handle = app.getRequestHandler()

    
app.prepare()
.then(() => {
  const server = express()
  const http = require('http').createServer(server);
  const io = require('socket.io')(http);
  let roomList = [];
    
  server.get('*', (req, res) => {
    return handle(req, res)
  })
    
  http.listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })

  io.on('connection', (socket) => {
    socket.join('lobby');
    io.to('lobby').emit('roomList', JSON.stringify({...roomList}));
    console.log('a user connected ' + socket.id);


    socket.on('join-room', (data) => {
      createRoom(socket, data);
      socket.leave('lobby');
      socket.join(data);
      io.to('lobby').emit('roomList', JSON.stringify({...roomList}));
    });

    socket.on('joined-room', () => {
      console.log(socket.rooms);
      io.to(socket.id).emit('joined-room', socket.rooms);
    });

    socket.on('disconnect', function() {
        console.log("disconnect: ", socket.id);
    });
  });

  createRoom = (socket, roomName) => {
    socket.join(roomName);

    let room = roomList.find(x => x.room === roomName);
    if (!room) {
      roomList.push({ room: roomName, users: [] });
      room = roomList.find(x => x.room === roomName);
    }

    let user = room.users.find(x => x === socket.id);
    if (!user) {
      room.users.push(socket.id);
    }
  }


})