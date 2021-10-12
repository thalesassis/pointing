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
  const http = require('http').createServer(server);
  const io = require('socket.io')(http);
  let roomList = [];
  let userList = [];
  let pointList = ['0','1','2','3','5','?'];
  let userPoints = [];
  let revealVotes = false;
  let storyLoading = false;
  let storyRefreshTime = 5000;
  
  server.get('*', (req, res) => {
    return handle(req, res);
  })

  http.listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })

  io.on('connection', (socket) => {
    console.log('a user connected ' + socket.id);

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
      if (!storyLoading) {
        io.to(room).emit('story-loading', true);
        storyLoading = true;
        axios.get('https://www.pivotaltracker.com/services/v5/projects/2434677/stories/178386051', {
          headers: {
            'X-TrackerToken': process.env.PT_TOKEN
          }
        })
        .then(story => {
          console.log(roomList);
          roomList.find(x => x.room === room).story = story.data;
          io.to(room).emit('story-loaded', story.data);

          setTimeout(() => {
            storyLoading = false;
          }, storyRefreshTime)
        })
      }
      
    })

    socket.on('leave-room', () => {
      let room = userList.find(x => x.id === socket.id).room;
      socket.leave(room);
      userList.find(x => x.id === socket.id).room = undefined;
      console.log(userList);
      userList.find(x => x.id === socket.id).data.point = undefined;
      userList.find(x => x.id === socket.id).data.vote = undefined;
      socket.join('lobby');
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

    socket.on('voted', (val) => {
      if (val !== null) {
        let room = userList.find(x => x.id === socket.id).room;
        let pointVal = val === 'Not voted' ? val : 'Voted';
        if(revealVotes) {
          pointVal = val;
        }
        userList.find(x => x.id === socket.id).data.vote = val;
        socket.broadcast.to(room).emit('someone-voted', JSON.stringify({ id: socket.id, vote: pointVal }));
      }
    })

    socket.on('user-name', (val) => {
      userList.find(x => x.id === socket.id).name = val;
      console.log(val);
      joinedRoom(socket);
    })

    socket.on('check-room-exists', (roomName) => {
      //if user already in a room, force him to that room
      //if user access a room through url, check if it exists
      let gotoIndex = false;
      let rooms = userList.find(x => x.id === socket.id);
      if (rooms !== undefined && rooms.room !== undefined) {
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
            userList.find(x => x.id === socket.id).room = roomName;
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
      let room = userList.find(x => x.id === socket.id).room;
      io.to(room).emit('reveal-votes');
    });

    socket.on('reset-votes', () => {
      revealVotes = false;
      let room = userList.find(x => x.id === socket.id).room;
      let roomUsers = userList.filter(x => x.room === room);
      for (r of roomUsers) {
        r.data.point = '';
        if (r.data.vote) { delete r.data.vote; }
      }
      io.to(room).emit('reset-votes', JSON.stringify({...roomUsers}))
    });

    socket.on('disconnect', () => {
        console.log("disconnect: ", socket.id);
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
                console.log("User out, lets rejoin");
              }
              console.log("Timed out : ", socket.id);
              console.log(userList);

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
    if (userList.find(x => x.id === socket.id)) {
      let room = userList.find(x => x.id === socket.id).room;
      if (room !== undefined) {
        if(!Object.values(socket.rooms).includes(room)) {
          socket.leave('lobby');
          socket.join(room);
        }

        roomData = roomList.find(x => x.room === room);
        if (roomData && roomData.story) {
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
      userList.push({ id: socketId, data: { point: '' } });
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