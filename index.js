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
//Hashmap safes socket.id for whisper mode
var usermap = {};
var fileWhispername;
var fileWhisperID;

app.use(express.static('pub'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    console.log('a user connected');

    socket.on('add user', function (username, res) {
        var check = usermap[username];
        if (!check) {
            //store username in session for this client
            socket.username = username;
            //add username as key, id as value  to the map
            usermap[socket.username] = socket.id;
            userlist.push(username);
            ++userCount;

            console.log(userCount, username);
            //welcome message
            socket.emit('chat message', date(new Date(), "HH:MM") + ' ' + username + ' -- Nice to meet you! -');

            socket.emit('enter chatroom');

            //tell every other users someone joined the chat
            socket.broadcast.emit('user joined', {
                username: socket.username,
                userCount: userCount
            });
        } else {
            socket.emit('alert', "Username already exist. Choose another funky name!");
        }

    });

    //sending the list of online users to the client
    socket.on('list', function (list) {
        list(userlist);
    });

    //whisper mode
    socket.on('whisper', function (message) {
        //split @, username and message from each other
        var res = message.split("@");
        var username = res[1].split(" ", 1);
        var whisperMessage = res[1].slice(username[0].length, res[1].length);
        console.log("AN: " + username + " " + whisperMessage);
        if (usermap[username]) {
            if(whisperMessage === " \\file"){
                //Send file to selected user and sender
                fileWhispername = username;
                fileWhisperID = usermap[socket.username];
                console.log("Saved fileWhispername: " + fileWhispername);
                console.log("Saved fileWhispername: " + fileWhisperID);

            }else{
                //Send to selected user and sender
                io.sockets.connected[usermap[username]].emit('chat message', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " " + whisperMessage);
                socket.emit('chat message', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " " + whisperMessage);
            }

        }else{
            //Send alert if selected username is wrong
            console.log("the selected user doesn't exist please check the username of your friend!");
            socket.emit('alert', "the selected user doesn't exist please check the username of your friend!");
        }
    });

    socket.on('sendFile', function(base64) {
        if(fileWhisperID === usermap[socket.username] && fileWhispername !== null){
            console.log("filewhispername != null: " + fileWhispername);
            if (base64.includes("image")) {
                io.sockets.connected[usermap[fileWhispername]].emit('img', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
                socket.emit('img',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("audio")) {
                io.sockets.connected[usermap[fileWhispername]].emit('audio',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
                socket.emit('audio',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("video")) {
                io.sockets.connected[usermap[fileWhispername]].emit('vid',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
                socket.emit('vid',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("pdf")) {
                io.sockets.connected[usermap[fileWhispername]].emit('pdf',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
                socket.emit('pdf',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            fileWhispername = null;
            fileWhisperID = null;
            console.log("FileWhispername = null " + fileWhispername);
            console.log("FileWhisperID = null " + fileWhispername);

        } else{
            if (base64.includes("image")) {
                io.emit('img', date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("audio")) {
                io.emit('audio', date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("video")) {
                io.emit('vid', date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("pdf")) {
                io.emit('pdf', date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
        }

    });

    //if User close the Tab or the Browser
    socket.on('disconnect', function () {
        //tell every other users someone left the chat
        socket.broadcast.emit('chat message', ' ' + socket.username + ' left');

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
    socket.on('chat message',  function (msg) {
        console.log(date(new Date(), "HH:MM") + ' ' + socket.username + ' ' + msg);
        io.emit('chat message', date(new Date(), "HH:MM") + " " + socket.username + " " + msg);
    });
});