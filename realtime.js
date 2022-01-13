let connection = null;
const {activeUsers, activeGames, activeUsersSocketIds, activeRoomsGameIds} = require("./db");
const uuid = require('uuid');
class Realtime {
    constructor() {
        this._socket = null;
        this._io = null;
    }

    connect(server) {
        let io = require('socket.io')(server);

        io.on('connection', (socket) => {
            this._socket = socket;

            this._socket.on('register', function (username) {
                socket.username = username
                activeUsers[username] = {
                    "socket": socket,
                    "isActive": true,
                    "isAvailable": true,
                    "connected_room_id": null
                }

                // store socket.id
                activeUsersSocketIds[socket.id] = username;

                // notify all users
                io.emit('_new_registration', Object.keys(activeUsers));
                console.log(`New user ${username} connected!`);

            });

            this._socket.on('disconnect', function() {
                // check this user was playing
                // if playing notify opponent, but not just remove from active users
                if(activeUsersSocketIds.hasOwnProperty(socket.id)) {
                    let username = activeUsersSocketIds[socket.id];
                    if(activeUsers.hasOwnProperty(username)) {
                        if(!activeUsers[username]["isAvailable"]) {
                            Object.entries(activeGames).forEach(item =>  {
                                let opponent = item[1].from === username ? item[1].to : item[1].to === username ? item[1].from : null;

                                if(opponent != null) {
                                    let opponent_socket = activeUsers.hasOwnProperty(opponent) ? activeUsers[opponent].socket : null;

                                    if(opponent_socket != null) {
                                        opponent_socket.emit('_notification', {
                                            "message": `${username} left game!`
                                        });
                                    }
                                }

                            })
                        }

                        delete activeUsers[username];

                        // notify all users about user update
                        io.emit('_new_registration', Object.keys(activeUsers));
                        console.log(`${username} disconnected!`);
                    }

                }
            });

            this._socket.on('match_request', function (opponent) {
                if(activeUsers.hasOwnProperty(opponent) && activeUsers[opponent]["isActive"]) {
                    if(activeUsers[opponent]["isAvailable"]) {
                        activeUsers[opponent]["socket"].emit('_match_request', {
                            "from": socket.username,
                            "to": opponent,
                            "message": socket.username+" wants to make match with u!"
                        });
                    } else {
                        socket.emit("_notification", {"message": `${opponent} currently playing with other!`})
                    }
                } else {
                    socket.emit("_notification", {"message": `${opponent} is not active`})
                }
            });

            this._socket.on('create_match', function (data) {
                let from = data.from;
                let to = data.to;
                let game_id = uuid.v1();
                let room_id = from+to;

                activeRoomsGameIds[room_id] = game_id;

                // create game
                activeGames[game_id] = {
                    "from": from,
                    "to": to,
                    "room_id": room_id,
                    "started_at": "22:00",
                    "turn": from,
                    "letters_pool": [],
                    "state": {
                        "11a": "v"
                    },
                    [from]: {
                        "score": 0,
                        "letters_pool": [],
                        "time": "15:30",
                        "words": []
                    },
                    [to]: {
                        "score": 0,
                        "letters_pool": [],
                        "time": "13:12",
                        "words": []
                    }

                }



                // update active user's data
                activeUsers[from]["connected_room_id"] = room_id;
                activeUsers[to]["connected_room_id"] = room_id;

                // make these users not available
                activeUsers[from]["isAvailable"] = false;
                activeUsers[to]["isAvailable"] = false;

                activeUsers[from]["socket"].join(room_id);
                activeUsers[to]["socket"].join(room_id);

                activeUsers[from]["socket"].emit('_connect_room', room_id);
                activeUsers[to]["socket"].emit('_connect_room', room_id);
            });

            this._socket.on('chat', function(data) {
                // find room which current user connected and send message;
                let current_user = activeUsersSocketIds[socket.id] ? activeUsers.hasOwnProperty(activeUsersSocketIds[socket.id]) ? activeUsers[activeUsersSocketIds[socket.id]] : null : null;

                if(current_user != null) {
                    let connected_room_id = current_user.connected_room_id;
                    if(connected_room_id != null) {
                        io.to(connected_room_id).emit('_chat', {
                            "from": activeUsersSocketIds[socket.id],
                            "message": data.message
                        });
                        console.log("message sebt!!")
                    }
                }
            });

            this._socket.on('game', function(data) {
                // find room which current user connected and send message;
                let current_user = activeUsersSocketIds[socket.id] ? activeUsers.hasOwnProperty(activeUsersSocketIds[socket.id]) ? activeUsers[activeUsersSocketIds[socket.id]] : null : null;

                if(current_user != null) {
                    let connected_room_id = current_user.connected_room_id;
                    if(connected_room_id != null) {
                        let current_user_username = activeUsersSocketIds[socket.id];
                        let current_users_game_id = activeRoomsGameIds[connected_room_id];
                        let current_game = activeGames[current_users_game_id];

                        // check who's turn
                        if(current_user_username !== current_game.turn) {
                            current_user.socket.emit('_notification', 'Not your turn');
                        } else {

                        }
                    }
                }
            });

            console.log(`New socket connection: ${socket.id}`);
        });

        this._io = io
    }

    sendMessageToRoom(room, data) {
        if(this._io != null) {
            this._io.to(room).emit(room, data);
            console.log("room message sent..");
        } else {
            console.log("this._io is null");
        }
    }

    sendEvent(event, data) {
        this._socket.emit(event, data);
    }

    registerEvent(event, handler) {
        this._socket.on(event, handler);
    }

    static init(server) {
        if(!connection) {
            connection = new Realtime();
            connection.connect(server);
        }
    }

    static getConnection() {
        if(!connection) {
            throw new Error("no active connection");
        }
        return connection;
    }
}

module.exports = {
    connect: Realtime.init,
    connection: Realtime.getConnection
}