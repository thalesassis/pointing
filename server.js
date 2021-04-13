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
    
  server.get('*', (req, res) => {
    return handle(req, res)
  })
    
  http.listen(3000, (err) => {
    if (err) throw err
    console.log('> Ready on http://localhost:3000')
  })

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('name', (data) => {
      console.log(data);
    });
  });
})