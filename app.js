const express = require('express');
const bodyParser = require("body-parser");

const app = express();
const server = require('http').createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

const realtime = require('./realtime');

realtime.connect(server);

// support parsing of application/json type post data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// socket.io
const connection = require('./realtime').connection();

// export data
const {activeUsers} = require("./db");

// Controllers
const {AuthController} = require("./controllers/AuthController");

// Map routes
app.use('/api/v1/auth', AuthController)

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});


// connectedUsers = {}
// io.on('connection', (socket) => {
//
//     socket.on('disconnect', () => {
//         console.log('user disconnected');
//         io.emit('chat message', "a user disconnected");
//     });
//
//
//     io.emit('chat message', "test test");
//
//     console.log("a user connected23");
//
//     socket.on('chat message', (msg) => {
//         console.log('message: ' + msg);
//         io.emit('chat message', msg);
//     });
//
//     socket.on('register', (nickname) => {
//         socket.username = nickname;
//         connectedUsers[nickname] = socket;
//         console.log(nickname+" connected!");
//
//         io.emit("newRegistration", Object.keys(connectedUsers));
//     });
//
//     socket.on('private_chat',function(data) {
//         const to = data.to, message = data.message;
//
//         if(connectedUsers.hasOwnProperty(to)){
//             connectedUsers[to].emit('private_chat',{
//                 //The sender's username
//                 username : socket.username,
//
//                 //Message sent to receiver
//                 message : message
//             });
//         }
//     });
// });

