/*
 _           _     _____ _           _
| |         | |   /  __ \ |         | |
| |     __ _| |__ | /  \/ |__   __ _| |_
| |    / _` | '_ \| |   | '_ \ / _` | __|
| |___| (_| | |_) | \__/\ | | | (_| | |_
\_____/\__,_|_.__/ \____/_| |_|\__,_|\__|

Hanna Schulze, Oliver Wagner // 2018
Reutlingen University; Cloud Computing Ex1 WS2018/19
*/

var express = require('express');
var app = express();
var fs = require('fs');
var https = require('https');
var server = https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
    requestCert: false,
    rejectUnauthorized: false
}, app, console.log('SSL/TLS listening on 3001, https://localhost:3001'));
server.listen(3001);
var io = require('socket.io').listen(server);
var date = require('dateformat');
var userCount = 0;
var userlist = [];

app.use(express.static('pub'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});


io.on('connection', function (socket) {
    console.log('a user connected');

    var addedUser = false;
    socket.on('add user', function (username) {
        if (addedUser) return;

        //store username in session for this client
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

        //sending the list of online users to the client
        socket.on('list', function (list) {
            list(userlist);
        });


        socket.on('sendFile', function(base64) {
            if (base64.includes("image")) {
                io.emit('img', base64);
            }
            if (base64.includes("audio")) {
                io.emit('audio', base64);
            }
            if (base64.includes("video")) {
                io.emit('vid', base64);
            }
        });
        //if User close the Tab or the Browser
        socket.on('disconnect', function () {
            //tell every other users someone left the chat
            socket.broadcast.emit('chat message', ' ' + username + ' left');

            console.log('before length: ' + userlist.length);
            for (var i = 0; i < userlist.length; i++) {
                if (userlist[i] === socket.username) {
                    console.log(userlist[i] + ' gelöscht...');
                    userlist.splice(i, 1);
                    console.log('after length: ' + userlist.length);
                }
            }
            --userCount;

            console.log(socket.username + ' disconnected');
            userlist.forEach((user) => {
                console.log(user);
            });
        });

        //output Messages
        socket.on('chat message',  (msg)=> {
            console.log(date(new Date(), "HH:MM") + ' ' + socket.username + ' ' + msg);
            io.emit('chat message', date(new Date(), "HH:MM") + " " + socket.username + " " + msg);
        });
    });
});