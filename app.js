const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const server = require('http').createServer(app);
const env = require('dotenv').config();
const mysql = require('mysql');

const {getWords, getWordsByArray} = require("./services/GameService")

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

app.get('/checkWord', function(req, res){
    // let word = req.query.word;
    // let result = getWords(word);
    res.send(getWordsByArray(["salam", "qoca"]));
});

server.listen(env.parsed.port, () => {
    console.log(`listening on *: ${env.parsed.port}`);
});
