import Head from 'next/head';
import { io } from "socket.io-client";

const socket = io();

export default function Pointing() {
  return (
    <div>
      Home
    </div>
  )
}
