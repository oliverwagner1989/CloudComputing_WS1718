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
/*
var server = https.createServer({
    key: fs.readFileSync('server.key'),
    cert: fs.readFileSync('server.cert'),
    requestCert: false,
    rejectUnauthorized: false
}, app, console.log(`
 _           _     _____ _           _
| |         | |   /  __ \\ |         | |
| |     __ _| |__ | /  \\/ |__   __ _| |_
| |    / _\` | '_ \\| |   | '_ \\ / _\` | __|
| |___| (_| | |_) | \\__/\\ | | | (_| | |_
\\_____/\\__,_|_.__/ \\____/_| |_|\\__,_|\\__|

S S L / T L S    L I S T E N I N G    O N   P O R T    3 0 0 1
https://localhost:3001

Hanna Schulze, Oliver Wagner // 2018
Reutlingen University; Cloud Computing Ex1 WS2018/19
`));

server.listen(3001);
*/
app.enable('trust proxy');
server.listen(8080);
var io = require('socket.io')(server);
var date = require('dateformat');
var userCount = 0;
var userlist = [];
var usermap = {}; //Hashmap safes socket.id for whisper mode
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
    if (userlist.includes(data.user.username)) {
        console.log('Online users: '+userlist);
        socket.emit('prompt', 'You are already logged in!');
    } else {
        db.query('SELECT COUNT (*) as count FROM Users WHERE username=? && password = SHA2(?,256)', [data.user.username, data.user.password],
            function (error, results, fields) {
                if (results[0].count>0) { //if query result >0 user credentials are valid
                    db.query('SELECT username AS user FROM Users WHERE username=?', data.user.username, function(error,results,fields) {
                        //store username in session for this client
                        socket.username = results[0].user;
                        //add username as key, id as value  to the map
                        userlist.push(results[0].user);
                        console.log('Online users: '+userlist);
                        ++userCount;
                        //welcome message
                        socket.emit('chat message', date(new Date(), "HH:MM") + ' ' + socket.username + ' -- Nice to meet you! -');
                        //hide login and show text input and textfield
                        socket.emit('enter chatroom');

                        //tell every other users someone joined the chat
                        socket.broadcast.emit('user joined', {
                            username: socket.username,
                            userCount: userCount
                        });
                    });
                }
                else {socket.emit('prompt', 'Wrong username or password.');}
            });
    }});




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