let connection = null;
const {activeUsers, activeGames} = require("./db");

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
                activeUsers[username] = socket

                // notify all users
                socket.emit('new_registration', Object.keys(activeUsers));
                console.log(`New user ${username} connected!`);
            });

            this._socket.on('match_request', function (opponent) {
                if(activeUsers.hasOwnProperty(opponent)){
                    activeUsers[opponent].emit('match_request_', {
                        "from": socket.username,
                        "to": opponent,
                        "message": socket.username+" wants to make match with u!"
                    });
                }
            });

            this._socket.on('create_match', function (data) {
                let from = data.from;
                let to = data.to;

                // create game
                activeGames[from+to] = {
                    [from]: 0,
                    [to]: 0
                }

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