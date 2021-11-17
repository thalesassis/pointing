const express = require('express');
const next = require('next');
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const _ = require('lodash');
const handle = app.getRequestHandler()
const axios = require('axios');
    
app.prepare()
.then(() => {
  const server = express()
  const fs = require('fs');
  let http = null;

  if (process.env.SSL_MODE == 'true') {
    let privateKey = fs.readFileSync(process.env.SSL_KEY_FILE, 'utf8');
    let certificate = fs.readFileSync(process.env.SSL_CRT_FILE, 'utf8');  
    const credential = { key: privateKey, cert: certificate };
    http = require('https').createServer(credential, server);
  } else {
    http = require('http').createServer(server);
  }
  
  const io = require('socket.io')(http, { transports: ['websocket'] });

  let roomList = [];
  let userList = [];
  let pointList = ['0','1','2','3','5','8','?'];
  let userPoints = [];
  let revealVotes = false;
  let storyLoading = false;
  let storyRefreshTime = 5000;

  server.get('*', (req, res) => {
    return handle(req, res);
  })

  http.listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready')
  })

  io.on('connection', (socket) => {
    //console.log('a user connected ' + socket.id);

    socket.on('user-token', (data) => {

      connectedSockets = io.of('/').sockets;
      for (let [key, val] of connectedSockets) {
        if (!userList.find(x => x.id === val.id)) {
          userList = userList.filter(x => x.id !== val.id);
        }
      }

      handleRefresh(socket, data);      

      connectedSockets = io.of('/').sockets;
      for (let [key, val] of connectedSockets) {
        if (!userList.find(x => x.id === val.id)) {
          userList = userList.filter(x => x.id !== val.id);
        }
      }

      console.log(userList);
    });

    socket.on('lobby', () => {
      socket.join('lobby');
      sendRoomsToLobby();
    })

    socket.on('get-story', (storyId) => {
      let room = userList.find(x => x.id === socket.id).room;
      io.to(room).emit('story-loading', true);
      storyLoading = true;
      axios.get('https://www.pivotaltracker.com/services/v5/projects/2434677/stories/' + storyId.replace("#",""), {
        headers: {
          'X-TrackerToken': process.env.PT_TOKEN
        }
      })
      .then(story => {          
        let user = userList.find(x => x.id === socket.id);
        if (user.room) {
          roomList.find(x => x.room === user.room).story = story.data;
          io.to(user.room).emit('story-loaded', story.data);
        }
        storyLoading = false;

      }).catch(e => {
        io.to(room).emit('story-404');
        storyLoading = false;
      })
      
      
    })

    socket.on('close-story', () => {
      let user = userList.find(x => x.id === socket.id);
      if (user.room) {
        roomList.find(x => x.room === user.room).story = { id: '', url: '', name: '', description: '' };
        io.to(user.room).emit('close-story');
      }
    });

    socket.on('leave-room', () => {
      let user = userList.find(x => x.id === socket.id);
      let room = user.room;

      socket.leave(room);
      user.room = undefined;
      user.data.point = undefined;
      user.data.vote = undefined;
      user.data.voting = undefined;
      socket.join('lobby');

      let usersInRoom = userList.find(x => x.room === room);
      if (usersInRoom === undefined) {
        sendRoomsToLobby();
      }

      let roomUsers = userList.filter(x => x.room === room);
      io.to(room).emit('room-users', JSON.stringify({...roomUsers}));
      io.to(room).emit('update-votes');

      socket.emit('goto-index');
    })

    socket.on('join-room', (data) => {
      createRoom(socket, data);
      socket.leave('lobby');
      socket.join(data);
      let user = userList.find(x => x.id === socket.id);
      if (user) {
        if (!userList.find(x => x.room === data)) {
          user.host = true;
        }
        user.room = data;
      }
      sendRoomsToLobby();
    });

    socket.on('is-voting', (val) => {
      if (val !== null) {
        let user = userList.find(x => x.id === socket.id);
        if (user) {
          user.data.voting = val;
          io.to(user.room).emit('someone-voting', JSON.stringify({ id: socket.id, status: val }));
        }
      }
    })

    socket.on('update-is-voting', () => {
      let user = userList.find(x => x.id === socket.id);
      if (user) {
        io.to(user.room).emit('update-is-voting');
      }
    });

    socket.on('voted', (val) => {
      if (val !== null) {
        let user = userList.find(x => x.id === socket.id);
        if (user) {
          let pointVal = val === 'Not voted' ? val : 'Voted';
          let unflip = false;
          if (revealVotes) {
            pointVal = val;
            unflip = true;
          }
          userList.find(x => x.id === socket.id).data.vote = val;
          socket.broadcast.to(user.room).emit('someone-voted', JSON.stringify({ id: socket.id, vote: pointVal, flipEffect: true, unflip: unflip }));
        }
      }
    })

    socket.on('user-name', (val) => {
      let user = userList.find(x => x.id === socket.id);
      if (user) {
        user.name = val;
        joinedRoom(socket);
      }
    })

    socket.on('joined-room', (val) => {
      joinedRoom(socket);
    })

    socket.on('check-room-exists', (roomName) => {
      //if user already in a room, force him to that room
      //if user access a room through url, check if it exists
      let gotoIndex = false;
      let rooms = userList.find(x => x.id === socket.id);
      if (rooms && rooms.room !== undefined) {
        //user already in a room? send him to his room
        if (rooms.room != roomName) {
          socket.emit('goto-room', rooms.room);
          socket.join(rooms.room);
        }
      } else {
        //user joining a room
        if (roomName !== null) { //not from index
          if (roomName.length === 0) { //room name must not be empty
            socket.emit('goto-index');
            gotoIndex = true;
          }

          if (userList.find(x => x.room === roomName)) { //room exists?
            socket.leave('lobby');
            socket.join(roomName);
            let user = userList.find(x => x.id === socket.id);
            if (user) {
              user.room = roomName;
            }
          } else {
            socket.emit('goto-index');
            gotoIndex = true;
          }
        }
      }

      if (!gotoIndex) {
        joinedRoom(socket);
      }
    });

    socket.on('reveal-votes', () => {
      revealVotes = true;
      let user = userList.find(x => x.id === socket.id);
      if (user) {
        io.to(user.room).emit('reveal-votes');
      }
    });

    socket.on('reset-votes', () => {
      revealVotes = false;
      let user = userList.find(x => x.id === socket.id);
      if (user) {
        let roomUsers = userList.filter(x => x.room === user.room);
        for (r of roomUsers) {
          r.data.point = '';
          if (r.data.vote) { delete r.data.vote; }
        }
        io.to(user.room).emit('reset-votes', JSON.stringify({...roomUsers}))
      }
    });

    socket.on('disconnect', () => {
        if (userList.find(x => x.id === socket.id)) {
          let room = userList.find(x => x.id === socket.id).room;
          setTimeout(() => {

              if (userList.find(x => x.id === socket.id)) {
                userList = userList.filter(x => x.id !== socket.id);

                let usersInRoom = userList.find(x => x.room === room);
                if (usersInRoom === undefined) {
                  sendRoomsToLobby();
                }

                io.to(room).emit('rejoin');
              }

          }, 3000);
        }
    });
  });

  sendRoomsToLobby = () => {
    let rooms = _.cloneDeep(userList);
    rooms = _.uniqBy(rooms, 'room');
    rooms = rooms.filter(x => x.room !== undefined && x.room !== '');
    io.to('lobby').emit('roomList', JSON.stringify({...rooms}));
  }

  joinedRoom = (socket) => {
    let user = userList.find(x => x.id === socket.id);
    if (user) {
      let room = user.room;
      if (room !== undefined) {
        socket.leave('lobby');
        socket.join(room);

        roomData = roomList.find(x => x.room === room);
        if (roomData && roomData.story) {
          roomData.story.no_cooldown = true;
          socket.emit('story-loaded', roomData.story);
        }

        let roomUsers = _.cloneDeep(userList);
        roomUsers = roomUsers.filter(x => x.room === room);
        let user = userList.find(x => x.id === socket.id);

        //Remove votes from array
        for (r of roomUsers) {
          if (r.data.vote) {
            delete r.data.vote;
          }
        }
        io.to(room).emit('room-users', JSON.stringify({...roomUsers}));

        //Recover user vote
        if (user.data.vote !== undefined) {
          socket.emit('recover-vote', user.data.vote);
        }

        io.to(room).emit('update-votes');
        io.to(room).emit('room-points', JSON.stringify({...pointList}));
      } else {
        socket.emit('goto-index');
      }
    }
  }

  createRoom = (socket, roomName) => {
    socket.join(roomName);

    let room = roomList.find(x => x.room === roomName);
    if (!room) {
      roomList.push({ room: roomName, story: [], users: [] });
      room = roomList.find(x => x.room === roomName);
    }
  }

  createUser = (socketId) => {
    if (!userList.find(x => x.id === socketId)) {
      userList.push({ id: socketId, data: { point: '', voting: true } });
    }
  }

  handleRefresh = (socket, userToken) => {
    let newUser = false;
    if (userToken) {
      let user = userList.find(x => x.id === userToken);
      if (user) {
        user.id = socket.id;
        socket.emit("user-token", socket.id);
      } else {
        newUser = true;
      }
    } else {
      newUser = true;
    }

    if (newUser) {
      socket.emit("user-token", socket.id);
      createUser(socket.id);
    }
  }


})