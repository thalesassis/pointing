import Head from 'next/head';
import React, { Component } from "react";
import { io } from "socket.io-client";
  

class Pointing extends Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    const socket = io();

    const name = sessionStorage.getItem("name");
    socket.emit("name", name);
    console.log(name);

  }

  render() { 
    return (
      <div>
        Home
      </div>
    )
  }
}


export default Pointing;