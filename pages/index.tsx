import React, { Component, useEffect, useState, useContext } from "react";
import { withRouter } from 'next/router';
import socketContext from './context/socketContext';

const Home = (props) => {
  const socket = useContext(socketContext);
  const [name, setName] = useState('');
  const [roomList, setRoomList] = useState({});

  useEffect(() => {
  console.log(socket);
  console.log(props);
    socket.on("roomList", (data) => {
      setRoomList(JSON.parse(data));
    })
    socket.on("connect_error", (err) => { console.log(err.message); });
  }, [])

  const start = (e) => {
    e.preventDefault();
    socket.emit("join-room", name);
    props.router.push('/room');
  }

  const joinRoom = (e) => {
    e.preventDefault();
    socket.emit("join-room", name);
    //props.router.push('/room');
  }

  return (
    <main>
    <pre>{JSON.stringify(roomList)}</pre>
      <div className="big-input">
        <input type="text" placeholder="Name" required onChange={(e) => setName(e.target.value)} value={name} /> 
        <button onClick={start}>Start</button> 
      </div>

      <ul>
      {Object.values(roomList).map(val => {
        return <li key={val.room}><a onClick={joinRoom}>{val.room}</a></li>
      })}
      </ul>
    </main>
  );
}

export default withRouter(Home);