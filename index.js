var express = require('express');
var app = express();
//var http = require('http').Server(app);
var fs = require('fs');
var https = require('https');
var server = https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
    requestCert: false,
    rejectUnauthorized: false
},app, console.log('SSL/TLS listening on 3001, https://localhost:3001'));
server.listen(3001);
var io = require('socket.io').listen(server);
var date = require('dateformat');
var SocketIOFileUpload = require("socketio-file-upload");
var userCount = 0;
var userlist = [];

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
        userlist.push(username);
        ++userCount;
        addedUser = true;
        console.log(userCount, username);
        //welcome message
        socket.emit('chat message', date(new Date(), "HH:MM") + ' ' + username + ' -- Nice to meet you! -');

        //tell every other users someone joined the chat
        socket.broadcast.emit('user joined', {
            username: socket.username,
            userCount: userCount
        });

        //if User close the Tab or the Browser
        socket.on('disconnect', function () {
            console.log(userlist.length);
            console.log('Tschüss '+socket.username);
            for (var i = userlist.length-1; i >= 0; i--){
                if(userlist[i]==socket.username){
                    userlist.splice(userlist[i],1)
                }
            }
            console.log(userlist.length);
            for (var i = 0; i < userlist.length; i++){
                console.log(userlist[i]);
            }
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


/*http.listen(3000, function () {
    console.log('listening on *:3000');
});*/