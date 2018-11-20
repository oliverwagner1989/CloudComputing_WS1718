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
var mysql = require('mysql');
var server = require('http').Server(app);
//Connecting to our db
var db = mysql.createConnection({
    host: 'cloudws1819.c0lwjxnry6gy.us-east-2.rds.amazonaws.com',
    port: '3306',
    user: 'root',
    password: 'OliHanna!',
    database: 'chatserver'
});
// Log any errors connected to the db
db.connect(function(err){
    if (err) console.log(err);
});

//Enforcing HTTPS on Bluemix
app.enable('trust proxy');
app.use (function (req, res, next) {
    if (req.secure || process.env.BLUEMIX_REGION === undefined) {
        next();
    } else {
        console.log('redirecting to https');
        res.redirect('https://' + req.headers.host + req.url);
    }
});

server.listen(8080);
var io = require('socket.io')(server);
var date = require('dateformat');
var userCount = 0;
var userlist = [];
var usermap = new Map(); //Hashmap safes socket.id for whisper mode
var fileWhispername;
var fileWhisperID;

app.use(express.static('pub'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
    //takes inputs from the frontend, checks if username is already in db and eventually stores new user into db with hashed pwd
    socket.on('add user', function (data) {
        db.query('SELECT COUNT (*) as count FROM Users WHERE username=?', data.user.username,
            function (error, results, fields) {
                if (results[0].count > 0) { //if query result >0 username is already in DB
                    socket.emit('prompt', 'Username is already taken. Please choose a different one');
                }
                else {
                    db.query('INSERT INTO Users SET username = ?, password = ?', [data.user.username, data.user.password]);
                    db.query('UPDATE Users SET password = SHA2(?,256) WHERE username=?', [data.user.password, data.user.username]);
                    socket.emit('prompt', 'New user registered. You can login now with your chosen credentials');
                }
            });
    });

    socket.on('login', function (data) {
        db.query('SELECT COUNT (*) as count FROM Users WHERE username=? && password = SHA2(?,256)', [data.user.username, data.user.password],
            function (error, results, fields) {
                if (results[0].count>0) { //if query result >0 user credentials are valid
                    db.query('SELECT userid, username FROM Users WHERE username=?', data.user.username, function(error,results,fields) {
                        if (!usermap.has(results[0].userid)) {
                            console.log('Online users: '+userlist);
                            //store username in session for this client
                            socket.username = results[0].username;
                            socket.userid = results[0].userid;
                            //add username as key, id as value  to the map
                            userlist.push(socket.username);
                            usermap.set(socket.userid, socket.id);
                            console.log(usermap);
                            console.log(Object.keys(usermap));
                            ++userCount;
                            //welcome message
                            socket.emit('chat message', date(new Date(), "HH:MM") + ' ' + socket.username + ' -- Nice to meet you! -');
                            socket.emit('enter chatroom', socket.userid);

                            //tell every other users someone joined the chat
                            socket.broadcast.emit('user joined', {
                                username: socket.username,
                                userCount: userCount
                            });
                        } else {
                            socket.emit('prompt', 'You are already logged in!');
                        }

                    });
                }
                else {socket.emit('prompt', 'Wrong username or password.');}
            });
    });

    //sending the list of online users to the client
    socket.on('list', function (list) {
        list(userlist);
    });

    //send messages & files only to one user
    socket.on('whisper', function (message) {
        //split @, username and message from each other
        var res = message.split("@");
        var username = res[1].split(" ", 1);
        var whisperMessage = res[1].slice(username[0].length, res[1].length);
        //check if receiver exists
        if (usermap[username]) {
            if(whisperMessage === " \\file"){
                //Save receiver for sending whisper file
                fileWhispername = username;
                fileWhisperID = usermap[socket.username];

            }else{
                //Send whispermessage to selected user and sender
                io.sockets.connected[usermap[username]].emit('chat message', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " " + whisperMessage);
                socket.emit('chat message', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " " + whisperMessage);
            }

        }else{
            //Send alert if selected username is wrong
            socket.emit('alert', "the selected user doesn't exist please check the username of your friend!");
        }
    });


    socket.on('sendFile', function(base64) {
        //send file to selected user and sender
        if(fileWhisperID === usermap[socket.username] && fileWhispername !== null){
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
          //send file to all users
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

    //if User close the Tab or the Browser User disconnect
    socket.on('disconnect', function () {
        console.log('userid: '+socket.userid);
        usermap.delete(socket.userid);
        //tell every other users someone left the chat
        if(socket.name === undefined){
            socket.broadcast.emit('chat message', ' ' + socket.username + ' left');
        }

        for (var i = 0; i < userlist.length; i++) {
            if (userlist[i] === socket.username) {
                userlist.splice(i, 1);
            }
        }
        if(userCount > 0){
            --userCount;
            console.log(socket.username + ' disconnected');
        }
    });

    //output Messages
    socket.on('chat message',  function (msg) {
        io.emit('chat message', date(new Date(), "HH:MM") + " " + socket.username + " " + msg);
    });
});