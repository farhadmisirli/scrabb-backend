const express = require('express');
const bodyParser = require("body-parser");

const app = express();
const server = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

// socket connections
const realtime = require('./realtime');
realtime.connect(server);
const connection = realtime.connection();

// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Controllers
const {AuthController} = require("./controllers/AuthController");

// Map routes
app.use('/api/v1/auth', AuthController)

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/message', function(req, res){
    let room = req.query.room;
    connection.sendMessageToRoom(room, req.query.message ? req.query.message : "empty message");
    res.send("message sent to "+room);
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});