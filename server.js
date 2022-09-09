const express = require('express');
const next = require('next');
const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const _ = require('lodash');
const handle = app.getRequestHandler()
const axios = require('axios');

//TODO: check all user actions - test as if user didnt exist
    
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
  let actionTimeout = 2 * 3600000;
  server.get('*', (req, res) => {
    return handle(req, res);
  })

  http.listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready')
  })
  
  setInterval(() => {
    _.each(userList, (u) => {
      let inactiveTime = Date.now() - u.lastAction;
      if (inactiveTime >= actionTimeout) {
        u.expired = true;
      }
    })

    let hasExpired = userList.find(x => x.expired);
    if (hasExpired) {
      userList = userList.filter(x => !x.expired)
      updateRoomsUsers();
    }

    _.each(roomList, (u) => {
      let usersInRoom = getUsersInRoom(u.room);
      if (usersInRoom.length == 0) {
        roomList = roomList.filter(x => x.room != u.room)
      }
    })
  }, ((actionTimeout/2) + 5000));
  
  /*
  setInterval(() => {
    //console.log("[==========="+ new Date().toISOString() +"============]");
    connectedSockets = io.sockets.sockets;
    for (let [key, val] of connectedSockets) {
      console.log(val.id);
    }
    console.log(userList);
  }, 10000);
  */
  

  io.on('connection', (socket) => {
    //console.log('a user connected ' + socket.id);

    socket.on("connect_error", (err) => {
      console.log(`connect_error due to ${err.message}`);
    });

    socket.on('user-token', (data) => {
      handleRefresh(socket, data);      
      removeUnusedSockets(io);

      //console.log(userList);
    });

    socket.on('lobby', () => {
      socket.join('lobby');
      sendRoomsToLobby();
    })

    socket.on('get-story', (label) => {
      let roomData = getUserRoom(socket);
      if (roomData) {
        io.to(roomData.room).emit('story-loading', true);
        roomData.storyLoading = true;
        axios.get('https://www.pivotaltracker.com/services/v5/projects/2434677/stories?with_label=' + encodeURI(label), {
          headers: {
            'X-TrackerToken': process.env.PT_TOKEN
          }
        })
        .then(story => {          
          let roomData = getUserRoom(socket);
          if (roomData && story.data.length > 0) {
            story.data[0].active = true;
            story.data[0].storyLabel = label;
            roomData.story = story.data;
            io.to(roomData.room).emit('story-loaded', story.data);
            roomData.storyLoading = false;
          } else {
            io.to(roomData.room).emit('story-404');
            roomData.storyLoading = false;
          }
        }).catch(e => {
          console.log('error loading stories');
          io.to(roomData.room).emit('story-404');
          roomData.storyLoading = false;
        })
      }
    })

    socket.on('close-story', () => {
      let roomData = getUserRoom(socket);
      if (roomData) {
        roomData.story = { id: '', url: '', name: '', description: '' };
        io.to(roomData.room).emit('close-story');
      }
    });

    socket.on('goto-story', (number) => {
      let roomData = getUserRoom(socket);
      if (roomData) {
        _.each(roomData.story, (u) => {
          u.active = false;
        })
        roomData.story[number].active = true;
        io.to(roomData.room).emit('change-story', number);
      }
    });

    socket.on('leave-room', () => {
      let user = getUser(socket);
      let roomData = getUserRoom(socket);

      if (user && roomData) {
        socket.leave(roomData.room);
        user.room = undefined;
        user.data.point = 'Not voted';
        user.data.vote = 'Not voted';
        user.data.voting = true;
        socket.join('lobby');

        let usersInRoom = getUsersInRoom(roomData.room);
        if (!usersInRoom) {
          sendRoomsToLobby();
        } else {
          resendUsersVotes(roomData);        
        }

        socket.emit('goto-index');
      }
    })

    socket.on('join-room', (roomName) => {
      socket.leave('lobby');
      let user = getUser(socket);
      if (user) {
        let usersInRoom = getUsersInRoom(roomName);
        if (!usersInRoom) {
          user.host = true;
        }
        createRoom(socket, roomName);
        user.room = roomName;
        sendRoomsToLobby();
      }
    });

    socket.on('is-voting', (val) => {
      if (val !== null) {
        let user = getUser(socket);
        if (user) {
          user.data.voting = val;
          io.to(user.room).emit('someone-voting', JSON.stringify({ id: socket.id, status: val }));
        }
      }
    })

    socket.on('update-is-voting', () => {
      let user = getUser(socket);
      if (user) {
        io.to(user.room).emit('update-is-voting');
      }
    });

    socket.on('voted', (val) => {
      if (val !== null) {
        let user = getUser(socket);
        let roomData = getUserRoom(socket);
        if (user && roomData) {
          let pointVal = val === 'Not voted' ? val : 'Voted';
          if (roomData.revealVotes) {
            pointVal = val;
          }
          user.data.vote = val;
          socket.broadcast.to(roomData.room).emit('someone-voted', JSON.stringify({ id: socket.id, vote: pointVal }));
        } else {
          createUser(socket);
          io.emit('rejoin');
          socket.emit('check-room-exists');
        }
      }
    })

    socket.on('user-name', (val) => {
      let user = getUser(socket);
      if (user) {
        user.name = val;
        joinedRoom(socket);
      }
    })

    socket.on('joined-room', (val) => {
      joinedRoom(socket);
    })

    socket.on('check-room-exists', (obj) => {
      obj = JSON.parse(obj);
      let roomName = obj.roomName;
      let userToken = userList.find(x => x.id == obj.token);
      if (userToken) {
        userToken.id = socket.id;
      }

      removeUnusedSockets(io);
      //null means its coming from index
      //if user already in a room, force him to that room
      //if user access a room through url, check if it exists
      let gotoIndex = false;
      let user = getUser(socket);
      if (user && user.room !== undefined) {
        //user already in a room? send him to his room
        if (user.room != roomName) {
          socket.emit('goto-room', user.room);
          socket.join(user.room);
        }
      } else {
        //user joining a room
        if (roomName !== null) { //not from index
          if (roomName.length === 0) { //room name must not be empty
            socket.emit('goto-index');
            gotoIndex = true;
          }

          if (roomExists(roomName)) { //room exists?
            socket.leave('lobby');
            socket.join(roomName);
            let user = getUser(socket);
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
      let roomData = getUserRoom(socket);
      if (roomData) {
        roomData.revealVotes = true;
        io.to(roomData.room).emit('reveal-votes');
        resendUsersVotes(roomData);
      }
    });

    socket.on('unreveal-votes', () => {
      let roomData = getUserRoom(socket);
      if (roomData) {
        roomData.revealVotes = false;
        resendUsersVotes(roomData);
        io.to(roomData.room).emit('unreveal-votes');
      }
    });

    socket.on('reset-votes', () => {
      let roomData = getUserRoom(socket);
      if (roomData) {
        roomData.revealVotes = false;
        let roomUsers = getUsersInRoom(roomData.room);
        for (r of roomUsers) {
          r.data.point = 'Not voted';
          if (r.data.vote) { delete r.data.vote; }
        }
        io.to(roomData.room).emit('reset-votes', JSON.stringify({...roomUsers}))
        resendUsersVotes(roomData);
      }
    });

    socket.on('add-topic', (topic) => {
      let user = getUser(socket);
      let roomData = getUserRoom(socket);
      if (user && roomData) {
        let newTopic = {
          "index": (Math.random() * Date.now()).toString(),
          "user_id": user.id,
          "user": user.name,
          "checked": false,
          "text": topic
        }
        roomData.topics.push(newTopic);
        io.to(user.room).emit('add-topic', newTopic)
      }
    });

    socket.on('remove-topic', (index) => {
      let user = getUser(socket);
      let roomData = getUserRoom(socket);
      if (user && roomData) {
        roomData.topics = roomData.topics.filter(x => x.index != index);
        io.to(user.room).emit('remove-topic', index)
      }
    });

    socket.on('clear-topics', (index) => {
      let user = getUser(socket);
      let roomData = getUserRoom(socket);
      if (user && roomData) {
        roomData.topics = [];
        io.to(user.room).emit('clear-topics', index)
      }
    });

    socket.on('topic-discussed', (topic) => {
      let user = getUser(socket);
      let roomData = getUserRoom(socket);
      if (user && roomData) {
        t = _.find(roomData.topics, x => x.index === topic.index);
        if (t) {
          t.checked = topic.checked;
          io.to(user.room).emit('topic-discussed', t)
        }
      }
    });

    socket.on('disconnect', () => {
      handleDisconnection(socket);
    });

    socket.on('deluser', () => {
      let users = _.cloneDeep(userList);
      users = _.filter(userList, x => x.id != socket.id);
      userList = users;

      //console.log('User deleted');
      //console.log(users);
    });

    socket.on('remove-user-from-list', () => {
      let user = userList.find(x => x.id === socket.id);
      let roomData = getUserRoom(socket);
      user.name = undefined;
      user.data.point = 'Not voted';
      user.data.vote = 'Not voted';
      user.data.voting = true;
      resendUsersVotes(roomData);
    });
  });

  getUser = (socket) => {
    if (socket !== undefined) {
      let user = userList.find(x => x.id === socket.id);
      if (user) {
        user.lastAction = Date.now();
        return user;
      } else {
        //socket.emit('refresh');
        handleUserNotFound(socket);
        return false;
      }
    } else {
      handleUserNotFound(socket);
      return false;
    }
  }

  getUserRoom = (socket) => {
    if (socket !== undefined) {
      let user = getUser(socket);
      if (user && user.room) {
        let roomData = roomList.find(x => x.room === user.room);
        if (roomData) {
          return roomData;
        } else {
          handleUserNotFound(socket);
          return false;
        }
      } else {
        handleUserNotFound(socket);
        return false;
      }
    } else {
      handleUserNotFound(socket);
      return false;
    }
  }

  getUsersInRoom = (roomName) => {
    let usersInRoom = userList.filter(x => x.room === roomName);
    if (usersInRoom) {
      return usersInRoom;
    } else {
      return false;
    }
  }

  userExists = (socket) => {
    let user = userList.find(x => x.id === socket.id);
    if (user) {
      return true;
    } else {
      return false;
    }
  }

  roomExists = (roomName) => {
    let roomUsers = userList.find(x => x.room === roomName);
    if (roomUsers !== undefined) {
      return true;
    } else {
      return false;
    }
  }

  handleUserNotFound = (socket) => {
    //console.log("ERROR NOT FOUND");
    //socket.emit('goto-index');
  }

  sendRoomsToLobby = () => {
    let rooms = _.cloneDeep(userList);
    rooms = _.uniqBy(rooms, 'room');
    rooms = rooms.filter(x => x.room !== undefined && x.room !== '');
    io.to('lobby').emit('roomList', JSON.stringify({...rooms}));
  }

  joinedRoom = (socket) => {
    let user = getUser(socket);       
    if (user) {
      let room = user.room;
      if (room !== undefined) {
        socket.leave('lobby');
        socket.join(room);
        
        let roomData = getUserRoom(socket);
        if (roomData && roomData.story.length > 0) {
          socket.emit('story-loaded', roomData.story);
        }
        
        resendUsersVotes(roomData);

        io.to(room).emit('room-info', JSON.stringify({...roomData}));
        io.to(room).emit('room-points', JSON.stringify({...pointList}));
      } else {
        socket.emit('goto-index');
      }
    }
  }

  resendUsersVotes = (roomData) => {
    let usersToReceiveVotes = _.cloneDeep(userList);
    usersToReceiveVotes = usersToReceiveVotes.filter(x => x.room === roomData.room);
    if (usersToReceiveVotes) {
      _.each(usersToReceiveVotes, (u) => {

        //Creating data to send to users in the room
        let roomUsers = _.cloneDeep(userList);
        roomUsers = roomUsers.filter(x => x.room === roomData.room);
        if (roomUsers) {
          for (r of roomUsers) {
            if (r.data.vote) {
              if (roomData.revealVotes || r.id == u.id) {
                r.data.point = r.data.vote;
              } else {
                if (r.data.vote != "Voted" && r.data.vote != "Not voted") {
                  r.data.point = "Voted";
                } else {
                  r.data.point = r.data.vote;
                }
              }
              delete r.data.vote;
            }
          }
        }

        //Send created data to room users
        io.to(u.id).emit('room-users', JSON.stringify({...roomUsers}));
      })
    }
  }

  createRoom = (socket, roomName) => {
    socket.join(roomName);

    let room = roomList.find(x => x.room === roomName);
    if (!room) {
      roomList.push({ room: roomName, storyLoading: false, revealVotes: false, topics: [], story: [], users: [] });
    }
  }

  createUser = (socket) => {
    if (!userExists(socket)) {
      userList.push({ id: socket.id, room: undefined, expired: false, lastAction: Date.now(), data: { point: 'Not voted', voting: true } });
    }
  }

  updateRoomsUsers = () => {
    io.emit('rejoin');
  }

  handleDisconnection = (socket) => { 
    let user = getUser(socket);
    if (user) {
      setTimeout(() => {
        let user = getUser(socket);
        if (user) {
          let usersInRoom = getUsersInRoom(user.room);
          if (!usersInRoom) {
            sendRoomsToLobby();
          }
          if (user.room) {
            //io.to(user.room).emit('rejoin');
          }
        }
      }, 3000);
    }
  }

  handleRefresh = (socket, userToken) => {
    let newUser = false;
    if (!_.isNull(userToken)) {
      let user = userList.find(x => x.id == userToken);
      if (user) {
        user.id = socket.id;

        if (user.room) {
          let roomData = getUserRoom(socket);
          _.each(roomData.topics, x => {
            if (x.user_id == userToken) {
              x.user_id = socket.id;
            }
          })
        }

        socket.emit("user-token", socket.id);
      } else {
        newUser = true;
      }
    } else {
      newUser = true;
    }

    if (newUser) {
      socket.emit("user-token", socket.id);
      createUser(socket);
    }
  }

  removeUnusedSockets = (io) => {
    connectedSockets = io.sockets.sockets;
    for (let [key, val] of connectedSockets) {
      if (!userList.find(x => x.id == val.id)) {
        ul = _.cloneDeep(userList);
        userList = ul.filter(x => x.id !== val.id);
      }
    }
  }

})