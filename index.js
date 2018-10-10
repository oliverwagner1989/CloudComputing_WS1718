var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var date = require('dateformat');
var time = date(new Date(), "HH:MM");
var users = [];

app.use(express.static('pub'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    socket.emit('chat message', time+' Willommen im Tschätt');
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('user disconnected');
    });
    socket.on('chat message', function (msg) {
        console.log('message: ' + time+' '+msg);
    });
    socket.on('chat message', function (msg) {
        socket.broadcast.emit('chat message', time+" "+msg);
    });
});


http.listen(3000, function () {
    console.log('listening on *:3000');
});