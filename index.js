var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var date = require('dateformat');
var SocketIOFileUpload = require("socketio-file-upload");
var userCount = 0;

app.use(express.static('pub'));
app.use(SocketIOFileUpload.router);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


io.on('connection', function (socket) {
    console.log('a user connected');

    var addedUser = false;
    socket.on('add user', function (username) {
        if (addedUser) return;

        //store username in socket session for this client
        socket.username = username;
        ++userCount;
        addedUser = true;
        console.log(userCount, username);
        //welcome message
        socket.emit('chat message', date(new Date(), "HH:MM") + ' ' + username + ' Welcome to Socket.IO Chat -');

        //tell every other users someone joined the chat
        socket.broadcast.emit('user joined', {
            username: socket.username,
            userCount: userCount
        });

        //if User close the Tab or the Browser
        socket.on('disconnect', function () {
            console.log('user disconnected');
        });

        //output Messages
        socket.on('chat message', function (msg) {
            console.log(date(new Date(), "HH:MM") + ' ' + socket.username + ' ' + msg);
            io.emit('chat message', date(new Date(), "HH:MM") + " " + socket.username + " " + msg);
        });

        /*    Uploadshit
            Make an instance of SocketIOFileUpload and listen on this socket:*/
        var uploader = new SocketIOFileUpload();
        uploader.dir = __dirname + "/pub/uploads";
        uploader.listen(socket);
    });
});


http.listen(3000, function () {
    console.log('listening on *:3000');
});