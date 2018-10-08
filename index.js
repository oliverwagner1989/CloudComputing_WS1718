var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    alert();
    socket.on('disconnect', function () {
        console.log('user disconnected');
        socket.emit('Willkommen im Chat');
    });
    socket.on('chat message', function (msg) {
        console.log('message: ' + msg);
    });
    socket.on('chat message', function (msg) {
        socket.broadcast.emit('chat message', msg);
    });
});


http.listen(3000, function () {
    console.log('listening on *:3000');
});