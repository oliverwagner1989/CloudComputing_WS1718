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
var helmet = require('helmet');

//helmet flags
//app.use(helmet());
//HSTS
const sixtyDaysInSeconds = 5184000;
app.use(helmet.hsts({
    maxAge: sixtyDaysInSeconds
}));
//CSP
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'", 'data:'],
        styleSrc: ["'self'", "cdnjs.cloudflare.com", 'maxcdn.bootstrapcdn.com', 'use.fontawesome.com', 'fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["use.fontawesome.com", "fonts.googleapis.com", 'fonts.gstatic.com'],
        scriptSrc: ["'self'", "cdnjs.cloudflare.com"],
        connectSrc: ["'self'", 'wss://localhost:8080', 'wss://objective-euler.mybluemix.net', 'ws://localhost:8080', 'ws://objective-euler.mybluemix.net']
    },
    reportOnly: false
}));
//DNS Prefetch Control
app.use(helmet.dnsPrefetchControl());
//XSS Filter
app.use(helmet.xssFilter());
//IE No Open
app.use(helmet.ieNoOpen());
//No Sniff MIME Type
app.use(helmet.noSniff());
//Hide powered by
app.use(helmet.hidePoweredBy());
//Frameguard
app.use(helmet.frameguard({ action: 'deny' }));


var fs = require('fs');
var server = require('http').Server(app);
var crypto = require('crypto');
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
var ss =  require('socket.io-stream');
var path = require('path');
var date = require('dateformat');
var userCount = 0;
var userlist = [];
var usermap = new Map(); //Hashmap safes socket.id for whisper mode
var VisualRecognitionV3 = require('watson-developer-cloud/visual-recognition/v3');

//SDK managing the IAM token.
//API requests require a version parameter that takes a date in format 'YYYY-MM-DD'
var visualRecognition = new VisualRecognitionV3({
    version: '2018-03-19',
    iam_apikey: 'BGB6CK3kFVWqKldIrkMdPS2vRe3OhtG1Nnxwk01egHMd',
});


app.use(express.static('pub'));

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});

app.get('/DomainVerification.html', function (req, res) {
    res.sendFile(__dirname + '/DomainVerification.html');
});

io.on('connection', function (socket) {
    var fileWhispername;
    var fileWhisperID;
    var filepath='';

    //takes inputs from the frontend, checks if username is already in db and eventually stores new user into db with hashed pwd
    socket.on('add user', function (data) {
        db.query('SELECT COUNT (*) as count FROM Users WHERE username=?', data.user.username,
            function (error, results, fields) {
                if (results[0].count > 0) { //if query result >0 username is already in DB
                    socket.emit('prompt', 'Username is already taken. Please choose a different one');
                }
                else {
                    var salt = crypto.randomBytes(16).toString('base64');
                    var saltedPassword = salt + data.user.password;
                    db.query('INSERT INTO Users SET username = ?, password = SHA2(?,256), salt=?, picture = ?', [data.user.username, saltedPassword, salt, filepath]);
                    socket.emit('prompt', 'New user registered. You can login now with your chosen credentials');
                    filepath = '';
                    console.log(filepath);
                }
            }
        );
    });

    socket.on('login', function (data) {
        //db.query('SELECT COUNT (*) as count FROM Users WHERE username=? && password = SHA2(?,256)',
        db.query('SELECT * FROM Users WHERE username=?', data.user.username, function (error, results, fields) {
            if (results[0] !== undefined) {
                var salt = results[0].salt;
                var saltedPassword = salt + data.user.password;
                var queryResultUsername = results[0].username;
                var queryResultUserId = results[0].userid;
                db.query('SELECT COUNT(*) AS count FROM Users WHERE username=? && password=SHA2(?,256)', [data.user.username, saltedPassword],
                    function (error, results, fields) {
                        if (results[0].count > 0) {
                            if (usermap.get(queryResultUsername) === undefined) {
                                console.log('Online users: ' + userlist);
                                //store username in session for this client
                                socket.username = queryResultUsername;
                                socket.userid = queryResultUserId;
                                //add username as key, id as value  to the map
                                userlist.push(socket.username);
                                usermap.set(socket.username, socket.id);
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
                        } else {
                            socket.emit('prompt', 'Wrong username or password.');
                        }
                    });
            } else {
                socket.emit('prompt', 'User does not exist.');
            }
        });
    });


    //save selected picture on server and via visualRecognition checking if it's a picture of a human face
    ss(socket).on('save_pic', function (stream, data) {
        var filename = path.basename(data.name);
        filepath = "./pictures/"+filename;
        stream.pipe(fs.createWriteStream(filepath).on("close", function () {
            //Visual Recognition
            var images_file = fs.createReadStream(filepath);

            var params = {
                images_file: images_file
            };

            visualRecognition.detectFaces(params, function (err, response) {
                if (err) {
                    socket.emit('prompt', 'Please try again later, there must be a Problem with the IBM Face Recognition.');
                    console.log(err);
                    filepath.delete();
                } else if (response.images[0].faces.length <= 0) {
                    socket.emit('prompt', 'The Picture must contain a human face');
                    filepath.delete();
                } else {
                    console.log('VR says: ' + JSON.stringify(response));
                    socket.emit('prompt', 'Picture contains a human face! U look great!');
                }
            });

        }));

    });

    //sending the list of online users to the client
    socket.on('list', function (list) {
        list(userlist);
    });

    //send messages & files only to one user
    socket.on('whisper', function (message) {
        //split @, username and message from each other
        var res = message.split("@");
        var splicedUsername = res[1].split(" ", 1);
        var username = splicedUsername[0];
        var whisperMessage = res[1].slice(username.length, res[1].length);
        //check if receiver exists
        if (usermap.get(username)!==undefined) {
            if(whisperMessage === " \\file"){
                //Save receiver for sending whisper file
                fileWhispername = username;
                //fileWhisperID = usermap[socket.username];
                fileWhisperID = usermap.get(socket.username);

            }else{
                //Send whispermessage to selected user and sender
                io.sockets.connected[usermap.get(username)].emit('chat message', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " " + whisperMessage);
                socket.emit('chat message', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " " + whisperMessage);
            }

        }else{
            //Send alert if selected username is wrong
            socket.emit('prompt', "the selected user doesn't exist please check the username of your friend!");
        }
    });


    socket.on('sendFile', function(base64) {
        //send file to selected user and sender
        if(fileWhisperID === usermap.get(socket.username) && fileWhispername !== null){
            if (base64.includes("image")) {
                io.sockets.connected[usermap.get(fileWhispername)].emit('img', "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
                socket.emit('img',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("audio")) {
                io.sockets.connected[usermap.get(fileWhispername)].emit('audio',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
                socket.emit('audio',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("video")) {
                io.sockets.connected[usermap.get(fileWhispername)].emit('vid',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
                socket.emit('vid',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
            }
            else if (base64.includes("pdf")) {
                io.sockets.connected[usermap.get(fileWhispername)].emit('pdf',  "----whisper  " + date(new Date(), "HH:MM") + " " + socket.username + " ", base64);
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
        usermap.delete(socket.username);
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