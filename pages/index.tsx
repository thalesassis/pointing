import React, { Component, useEffect, useState, useContext, useRef } from "react";
import { withRouter } from 'next/router';
import socketContext from '../context/socketContext';
import { useBeforeunload } from 'react-beforeunload';
import Cookies from 'js-cookie';

const Home = (props) => {
  const socket = useContext(socketContext);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [roomList, setRoomList] = useState({});
  let isRendered = false;

  useEffect(() => {
    isRendered = true;

    setRoomName('dundies-'+ Object.values(roomList).length.toString().padStart(2,'0'));

    socket.emit('check-room-exists', JSON.stringify({ roomName: null, token: Cookies.get("user-token") }));
    socket.emit('lobby');

    const listen = (message, func) => {
      socket.on(message, (ret) => {
        if (isRendered) { func(ret); }
      })
    }

    listen("roomList", (data) => {
      setRoomList(JSON.parse(data));
    })

    listen("goto-room", (roomName) => {
      props.router.push('/' + roomName);
    })

    listen("connect_error", (err) => { console.log(err.message); });

    return () => {
      isRendered = false;
    };
  }, [])

  useEffect(() => {
    setRoomName('dundies-'+ Object.values(roomList).length.toString().padStart(2,'0'));
  }, [roomList])


  const start = (e) => {
    e.preventDefault();
    if (Object.values(roomList).length > 0) {
      if (confirm("Someone else already created a room. Are you sure you want to create your own room?")) {
        createRoom(roomName);
      }
    } else {
      createRoom(roomName);
    }
  }

  const createRoom = (roomName) => {
    socket.emit("join-room", roomName);
    props.router.push('/' + roomName);
  }

  const joinRoom = (e, room) => {
    socket.emit("join-room", room);
    props.router.push('/' + room);
  }

  return (
    <>
    <title>Dundies Symple Points</title>
    <main>
      <div className="card-logo enlarge">
        <span><i>D</i></span>
        <span>u</span>
        <span>n</span>
        <span>d</span>
        <span>i</span>
        <span>e</span>
        <span>s</span>
        <div className="symple">symple points</div>
      </div>
      <div className="booklet">
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">
      <div className="booklet-page">

        <div className="flex index-page">


          <div className="point">
            <div className="room-list">
              <h3>Rooms list - Click to join!</h3>
              
              <ul>
              {Object.values(roomList).map((val: any) => {
                return <li key={val.room}><a onClick={(e) => joinRoom(e, val.room)}>{val.room}</a></li>
              })}

              {Object.values(roomList).length == 0 &&
                <li className="no-rooms">No rooms available</li>}
              </ul>
            </div>
          </div>

          <div className="story">

            <div className="create-room">
              <form onSubmit={(e) => start(e)}>
                <h3>Create a new room</h3>
                <input type="text" value={roomName} className="big-input" placeholder="Room Name" required onChange={(e) => setRoomName(e.target.value)} /> 
                <button disabled={roomName.length < 1} className='action'>Create</button> 
              </form>
            </div>
          </div>

        </div>


      </div>
      </div>
      </div>
      </div>
      </div>
    </main>
    </>
  );
}

export default withRouter(Home);