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
                    "turn": to,
                    "letters_pool": [
                        'Z' ,'A','A','A','A','A','A','A','A','A' ,'B','B','B', 'C',   'C', 'Ç','Ç','Ç'
                        // 'D','D','D','D' ,'E','E','E','E','E','E','E','K',
                        // 'G','G','Ğ' ,'H','H' ,'İ','İ','İ','İ','İ','İ','I','I','J','J', 'K',
                        // 'L','L','L','L' ,'M','M','N','N','N','N','N','N','O','O','Ö','Ö','Ö','O',
                        // 'P','P', 'Q', 'Q', 'Q','R','R','R','R','R','R','S','S','Ş','Ş','T','T','T','T','T',
                        // 'U','U','Ü','Ü' ,'V','V', 'X', 'Y', 'Y', 'Ə','Ə','Ə','Ə','Ə','Ə','Ə'
                    ],
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

                // generate letters pool
                let new_generated_pools = fillUsersLettersPool(activeGames[game_id].letters_pool, [], 7);
                activeGames[game_id][from].letters_pool = new_generated_pools.new_user_letters_pool;
                activeGames[game_id].letters_pool = new_generated_pools.new_common_letters_pool;

                new_generated_pools = fillUsersLettersPool(activeGames[game_id].letters_pool, [], 7);
                activeGames[game_id][to].letters_pool = new_generated_pools.new_user_letters_pool;
                activeGames[game_id].letters_pool = new_generated_pools.new_common_letters_pool;

                activeUsers[from]["socket"].emit('_new_letter_pool', {"letters_pool": activeGames[game_id][from].letters_pool});
                activeUsers[to]["socket"].emit('_new_letter_pool', {"letters_pool": activeGames[game_id][to].letters_pool});
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

            this._socket.on('game_check_word', function(data) {
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
                            current_user.socket.emit('_notification', {"message": 'Not your turn'});
                        } else {

                            let user_letter_pool = [...current_game[current_user_username].letters_pool];
                            let wrong_letter_found = false;

                            if(checkWord(data.word)) {
                                Array.from(data.word).forEach((letter) => {
                                    let index =  user_letter_pool.indexOf(letter);
                                    if (index > -1) {
                                        user_letter_pool.splice(index, 1);
                                    } else {
                                        wrong_letter_found = true;
                                        return -1;
                                    }
                                });

                                if(!wrong_letter_found) {
                                    let number_of_required_letters = data.word.length;

                                    if(current_game.letters_pool.length > 0) {
                                        let new_generated_pools = fillUsersLettersPool(current_game.letters_pool, user_letter_pool, number_of_required_letters);

                                        current_game[current_user_username].letters_pool = new_generated_pools.new_user_letters_pool;
                                        current_game.letters_pool = new_generated_pools.new_common_letters_pool;
                                    } else {
                                        if(current_game.letters_pool.length === 0) {
                                            current_game[current_user_username].letters_pool = [];
                                        }
                                    }

                                    // Change turn
                                    current_game.turn = current_game.from === current_user_username ? current_game.to : current_game.from;

                                    // send current user new letter pool
                                    current_user.socket.emit('_new_letter_pool', {
                                        "letters_pool": current_game[current_user_username].letters_pool
                                    });

                                    console.log("new letters pool send to user");
                                } else {
                                    // notify user about wrong letter
                                    current_user.socket.emit('_notification', {"message":'Wrong letter'});
                                    console.log({
                                        "word": data.word,
                                        "pool": current_game[current_user_username].letters_pool

                                    })
                                }
                            } else {
                                current_user.socket.emit('_notification', {"message":'Wrong word'});
                            }

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

function checkWord(word, username) {
    return true;
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

function fillUsersLettersPool(common_pool, current_pool, number_of_required_letters) {
    let random_letter_index = 0;
    if(number_of_required_letters > common_pool.length) {
        console.log("here")
        for (let i = 0; i < common_pool.length; i++) {
            current_pool.push(common_pool[i]);
        }
        common_pool = []
    } else {
        console.log('sds')
        for (let i = 0; i < number_of_required_letters; i++) {
            random_letter_index = getRandomNumber(0, common_pool.length-1);
            current_pool.push(common_pool[random_letter_index]);
            common_pool.splice(random_letter_index, 1);
        }
    }

    return {
        "new_user_letters_pool": current_pool,
        "new_common_letters_pool": common_pool
    }
}
module.exports = {
    connect: Realtime.init,
    connection: Realtime.getConnection
}