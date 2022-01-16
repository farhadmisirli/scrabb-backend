let connection = null;
const {activeUsers, activeGames, activeUsersSocketIds, activeRoomsGameIds} = require("./db");
const uuid = require('uuid');
class Realtime {
    constructor() {
        this._socket = null;
        this._io = null;
    }

    connect(server) {
        let io = require('socket.io')(server,{
            cors: {
                origin: "*",
            }
        });

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
                let disconnected_user = activeUsersSocketIds[socket.id] ? activeUsers.hasOwnProperty(activeUsersSocketIds[socket.id]) ? activeUsers[activeUsersSocketIds[socket.id]] : null : null;
                let disconnected_user_username = activeUsersSocketIds[socket.id];
                if(disconnected_user && disconnected_user.connected_room_id !== null) {
                    let current_users_game_id = activeRoomsGameIds[disconnected_user.connected_room_id];
                    let current_game = activeGames[current_users_game_id];
                    let opponent_username = current_game.from === disconnected_user_username ? current_game.to : current_game.from;

                    current_game.finished_at = "current datetime";
                    current_game.turn = null;
                    current_game.winner = opponent_username;

                    io.to(disconnected_user.connected_room_id).emit("_game_state", {
                        "state": current_game.state,
                        "letters_pool": current_game.letters_pool,
                        "turn": current_game.turn,
                        "started_at": current_game.started_at,
                        "finished_at": current_game.finished_at,
                        "winner": current_game.winner,
                        [disconnected_user_username]: {
                            "score": current_game[disconnected_user_username].score,
                        },
                        [opponent_username]: {
                            "score": current_game[opponent_username].score,
                        }
                    });
                }

                delete activeUsers[disconnected_user_username];

                // notify all users about user update
                io.emit('_new_registration', Object.keys(activeUsers));
                console.log(`${disconnected_user_username} disconnected!`);


                // if playing notify opponent, but not just remove from active users
                // if(activeUsersSocketIds.hasOwnProperty(socket.id)) {
                //     let username = activeUsersSocketIds[socket.id];
                //     if(activeUsers.hasOwnProperty(username)) {
                //         if(!activeUsers[username]["isAvailable"]) {
                //             Object.entries(activeGames).forEach(item =>  {
                //                 let opponent = item[1].from === username ? item[1].to : item[1].to === username ? item[1].from : null;
                //
                //                 if(opponent != null) {
                //                     let opponent_socket = activeUsers.hasOwnProperty(opponent) ? activeUsers[opponent].socket : null;
                //
                //                     if(opponent_socket != null) {
                //                         // stop game and set opponent as winner
                //
                //
                //
                //                         opponent_socket.emit('_notification', {
                //                             "message": `${username} left game!`
                //                         });
                //                     }
                //                 }
                //
                //             })
                //         }
                //
                //         delete activeUsers[username];
                //
                //         // notify all users about user update
                //         io.emit('_new_registration', Object.keys(activeUsers));
                //         console.log(`${username} disconnected!`);
                //     }
                //
                // }
            });

            this._socket.on('match_request', function (opponent) {
                if(activeUsers.hasOwnProperty(opponent) && activeUsers[opponent]["isActive"]) {
                    if(activeUsers[opponent]["isAvailable"]) {
                        activeUsers[opponent]["socket"].emit('_match_request', {
                            "from": socket.username,
                            "to": opponent,
                            "message": socket.username+" wants to make match with u!"
                        });
                        console.log("match request sent to "+opponent)
                    }else {
                        socket.emit("_notification", {"message": `${opponent} currently playing with other!`})
                    }
                } else {
                    socket.emit("_notification", {"message": `${opponent} is not active`})
                }
            });

            this._socket.on('match_request_cancelled', function (data) {
                if(activeUsers.hasOwnProperty(data.from)) {
                    activeUsers[data.from]["socket"].emit('_match_request_cancelled', {
                        "message": data.to+" cancelled match request"
                    });
                } else {
                    socket.emit("_notification", {"message": `${data.from} is not active`})
                }
            });

            this._socket.on('create_match', function (data) {
                let from = data.from;
                let to = data.to;
                let game_id = uuid.v1();
                let room_id = from+to;

                if(activeUsers[from]['isAvailable'] && activeUsers[to]['isAvailable']) {
                    activeRoomsGameIds[room_id] = game_id;

                    // create game
                    activeGames[game_id] = {
                        "from": from,
                        "to": to,
                        "room_id": room_id,
                        "started_at": "22:00",
                        "finished_at": null,
                        "winner": null,
                        "turn": to,
                        "letters_pool": [
                            'Z' ,'A','A','A','A','A','A','A','A','A' ,'B','B','B', 'C',   'C', 'Ç','Ç','Ç',
                            'D','D','D','D' ,'E','E','E','E','E','E','E','K',
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

                    // send current game state to room
                    io.to(room_id).emit("_game_state", {
                        "state": activeGames[game_id].state,
                        "letters_pool": activeGames[game_id].letters_pool,
                        "turn": activeGames[game_id].turn,
                        "started_at": activeGames[game_id].started_at,
                        "finished_at": activeGames[game_id].finished_at,
                        "winner": activeGames[game_id].winner,
                        [from]: {
                            "score": activeGames[game_id][from].score,
                        },
                        [to]: {
                            "score": activeGames[game_id][to].score,
                        }
                    });

                    console.log(`room id ${room_id} created. and game state sent to room`);
                } else {
                    let notAvailableUser = activeUsers[from]['isAvailable'] ? to : from;
                    let mustNotifyUser = notAvailableUser === from ? to : from;
                    activeUsers[mustNotifyUser]["socket"].emit("_notification", {
                        "message": `${notAvailableUser} stareted to play`
                    });
                }


            });

            this._socket.on('chat', function(message) {
                // find room which current user connected and send message;
                let current_user = activeUsersSocketIds[socket.id] ? activeUsers.hasOwnProperty(activeUsersSocketIds[socket.id]) ? activeUsers[activeUsersSocketIds[socket.id]] : null : null;

                if(current_user != null) {
                    let connected_room_id = current_user.connected_room_id;
                    if(connected_room_id != null) {
                        io.to(connected_room_id).emit('_chat', {
                            "from": activeUsersSocketIds[socket.id],
                            "message": message
                        });

                        console.log(`message sent to room. room_id: { ${connected_room_id} }  message : { ${message} }`);
                    } else {
                        console.log(`room id not found. current user ${socket.id}`);
                    }
                } else {
                    console.log("user not found");
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
                        let opponent_username = current_game.from === current_user_username ? current_game.to : current_game.from;

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
                                    // calculate score
                                    current_game[current_user_username].score += data.point;

                                    // check game ended
                                    if((current_game.letters_pool.length === 0 && current_game[current_user_username].letters_pool.length === 0 && current_game[opponent_username].letters_pool === 0) || (current_game.letters_pool.length === 0 && current_game[opponent_username].letters_pool.length === 0) ) {
                                        let winner =  current_game[current_user_username].score > current_game[opponent_username].score ? current_user_username : opponent_username;

                                        // send notification(game states) to room that game ended
                                        current_game.finished_at = "current datetime";
                                        current_game.turn = null;
                                        current_game.winner = winner;

                                        current_game[current_user_username].letters_pool = user_letter_pool;
                                        // send response to user
                                        current_user.socket.emit('_response', {
                                            "status": true,
                                            "letters_pool": current_game[current_user_username].letters_pool
                                        });

                                        // io.to(connected_room_id).emit("_game_state", {
                                        //     "winner": current_game[current_user_username].score > current_game[opponent_username].score ? current_user_username : opponent_username,
                                        //     "state": current_game
                                        // });
                                        // send current game state to room
                                        io.to(connected_room_id).emit("_game_state", {
                                            "state": current_game.state,
                                            "letters_pool": current_game.letters_pool,
                                            "turn": current_game.turn,
                                            "started_at": current_game.started_at,
                                            "finished_at": current_game.finished_at,
                                            "winner": current_game.winner,
                                            [current_user_username]: {
                                                "score": current_game[current_user_username].score,
                                            },
                                            [opponent_username]: {
                                                "score": current_game[opponent_username].score,
                                            }
                                        });

                                        console.log("game ended");

                                    }
                                    else {
                                        // Change turn
                                        current_game.turn = opponent_username;

                                        // Fill letters pool
                                        let number_of_required_letters = data.word.length;
                                        if(current_game.letters_pool.length > 0) {
                                            let new_generated_pools = fillUsersLettersPool(current_game.letters_pool, user_letter_pool, number_of_required_letters);
                                            current_game[current_user_username].letters_pool = new_generated_pools.new_user_letters_pool;
                                            current_game.letters_pool = new_generated_pools.new_common_letters_pool;
                                        } else {
                                            current_game[current_user_username].letters_pool = user_letter_pool;
                                        }

                                        // send response to user
                                        current_user.socket.emit('_response', {
                                            "status": true,
                                            "letters_pool": current_game[current_user_username].letters_pool
                                        });

                                        // send current game state to room
                                        io.to(connected_room_id).emit("_game_state", {
                                            "state": current_game.state,
                                            "letters_pool": current_game.letters_pool,
                                            "turn": current_game.turn,
                                            "started_at": current_game.started_at,
                                            "finished_at": current_game.finished_at,
                                            "winner": current_game.winner,
                                            [current_user_username]: {
                                                "score": current_game[current_user_username].score,
                                            },
                                            [opponent_username]: {
                                                "score": current_game[opponent_username].score,
                                            }
                                        });

                                        console.log("game state changed");


                                        // send current user new letter pool
                                        // current_user.socket.emit('_new_letter_pool', {
                                        //     "letters_pool": current_game[current_user_username].letters_pool
                                        // });

                                        // notify opponent about his turn
                                        // activeUsers[opponent_username].socket.emit('_notification', {
                                        //     "type": "turn",
                                        //     "message": "Its your turn!"
                                        // });

                                        // send current game state to room
                                        // io.to(connected_room_id).emit("_game_state", {
                                        //     "letters_pool": current_game.letters_pool
                                        // });

                                    }

                                } else {
                                    current_user.socket.emit('_response', {
                                        "status": false,
                                        "message":'Wrong letter, Your submitted word is '+data.word+" but your pool is "+current_game[current_user_username].letters_pool.join('-')
                                    });
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
        for (let i = 0; i < common_pool.length; i++) {
            current_pool.push(common_pool[i]);
        }
        common_pool = []
    } else {
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
