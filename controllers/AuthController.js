const express = require("express");
let AuthController = express.Router();
const {activeUsers} = require("../db");



function register(req, res) {
    if(req.body.username in activeUsers) {
        res.status(422).send("This username already taken");
    } else {
        activeUsers[req.body.username] = {
            "score": 0
        }
        res.status(201).send(activeUsers);
    }
}

function getActiveUsers(req, res) {
    return res.send(activeUsers);
}

function test(req, res) {
    const connection  = require('../realtime').connection();
    // connection.sendEvent("chat message", "salam");

    res.send("message sent");
}

AuthController.post('/register', register);
AuthController.get('/users', getActiveUsers);
AuthController.get('/test', test);

module.exports = {AuthController}
