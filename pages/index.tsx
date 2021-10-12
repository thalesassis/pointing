import React, { Component, useEffect, useState, useContext, useRef } from "react";
import { withRouter } from 'next/router';
import socketContext from '../context/socketContext';
import { useBeforeunload } from 'react-beforeunload';

const Home = (props) => {
  const socket = useContext(socketContext);
  const [roomName, setRoomName] = useState('');
  const [userName, setUserName] = useState('');
  const [roomList, setRoomList] = useState({});
  let isRendered = false;

  useEffect(() => {
    isRendered = true;

    socket.emit('check-room-exists', null);
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

  const start = (e) => {
    e.preventDefault();
    socket.emit("join-room", roomName);
    props.router.push('/' + roomName);
  }

  const joinRoom = (e) => {
    e.preventDefault();
    socket.emit("join-room", name);
    //props.router.push('/room');
  }

  return (
    <main>

      <div className="room-list">
        {Object.values(roomList).length == 0 &&
          <div>No rooms available</div>}
        
        <ul>
        {Object.values(roomList).map((val: any) => {
          return <li key={val.room}><a onClick={joinRoom}>{val.room}</a></li>
        })}
        </ul>
      </div>
      <div className="create-room">
        <h3>Create a room!</h3>
        <input type="text" placeholder="Room Name" required onChange={(e) => setRoomName(e.target.value)} value={roomName} /> 
        <button onClick={start}>Start</button> 
      </div>
    </main>
  );
}

export default withRouter(Home);