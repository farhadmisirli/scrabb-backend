let connection = null;
const {activeUsers, activeGames, activeUsersSocketIds} = require("./db");
const uuid = require('uuid');
class Realtime {
    constructor() {
        this._socket = null;
    }

    connect(server) {
        const io = require('socket.io')(server);

        io.on('connection', (socket) => {
            this._socket = socket;

            this._socket.on('register', function (username) {
                socket.username = username
                activeUsers[username] = {
                    "socket": socket,
                    "isActive": true,
                    "isAvailable": true
                }

                // store socket.id
                activeUsersSocketIds[socket.id] = username;

                // notify all users
                socket.emit('new_registration', Object.keys(activeUsers));
                console.log(`New user ${username} connected!`);
            });

            this._socket.on('disconnect', function() {
                // check this user was playing
                // if playing notify opponent, but not just remove from active users
                if(activeUsersSocketIds.hasOwnProperty(socket.id)) {
                    let username = activeUsersSocketIds[socket.id];

                    // if(activeUsers.hasOwnProperty(username)) {
                    //     if(!activeUsers[username]["isAvailable"]) {
                    //         Object.entries(a).forEach(item =>  {
                    //             if(item[1].hasOwnProperty("farhad")) {
                    //
                    //             }
                    //         })
                    //     } else {
                    //         delete activeUsers[username];
                    //     }
                    // }

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
                }
            });

            this._socket.on('create_match', function (data) {
                let from = data.from;
                let to = data.to;
                let game_id = uuid.v1();

                // create game
                activeGames[game_id] = {
                    [from]: 0,
                    [to]: 0,
                    "from": from,
                    "to": to
                }

                // make these users unAvailable
                activeUsers[from]["isAvailable"] = false;
                activeUsers[to]["isAvailable"] = false;

                console.log(activeGames);
            });

            console.log(`New socket connection: ${socket.id}`);
        });
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