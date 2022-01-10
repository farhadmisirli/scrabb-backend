let connection = null;

class Realtime {
    constructor() {
        this._socket = null;
    }
    connect(server) {
        const io = require('socket.io')(server);

        io.on('connection', (socket) => {
            // socket.id = "asdasdasdas"
            this._socket = socket;
            this._socket.on('statusConnetion',(data)=>{
                console.log(data)
            });

            this._socket.on('disconnect', function () {
                console.log(socket.id, "Un socket se desconecto");
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