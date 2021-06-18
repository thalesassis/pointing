import React, { Component, useEffect, useState } from "react";
import { withRouter } from 'next/router';


const Room = (props) => {
  const [roomName, setRoomName] = useState('');

  useEffect(() => {
    console.log(props);
    /*socket.emit("joined-room");
    socket.on("joined-room", (data) => {
      setRoomName(JSON.stringify(data));
    })*/
  }, [])

  return (
    <main>
      You are in room {roomName}
    </main>
  );
}

export default withRouter(Room);