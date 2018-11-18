var mysql = require('mysql')
// Let’s make node/socketio listen on port 3000
var io = require('socket.io').listen(3000)
// Define our db creds
var db = mysql.createConnection({
    host: 'cloudws1819.c0lwjxnry6gy.us-east-2.rds.amazonaws.com',
	port: '3306',
    user: 'root',
	password: 'OliHanna!',
    database: 'test'
})

// Log any errors connected to the db
db.connect(function(err){
    if (err) console.log(err)
})

// Define/initialize our global vars
var users = []
var isInitUsers = false
var socketCount = 0

io.sockets.on('connection', function(socket){
	socket.on('new user', function(data) {
		console.log(data);
		//io.sockets.emit('new user', data)
		db.query('INSERT INTO Users (username, password) VALUES (?)', data)
	}
	);
	
/*     // Socket has connected, increase socket count
    socketCount++
    // Let all sockets know how many are connected
    io.sockets.emit('users connected', socketCount)

    socket.on('disconnect', function() {
        // Decrease the socket count on a disconnect, emit
        socketCount--
        io.sockets.emit('users connected', socketCount)
    })

    socket.on('new user', function(data){
        // New user added, push to all sockets and insert into db
        users.push(data)
        io.sockets.emit('new user', data)
        // Use node's db injection format to filter incoming data
        db.query('INSERT INTO Users (userid, username) VALUES (?)', data.user)
    })

    // Check to see if initial query/notes are set
    if (! isInitUsers) {
        // Initial app start, run db query
        db.query('SELECT * FROM Users')
            .on('result', function(data){
                // Push results onto the notes array
                users.push(data)
            })
            .on('end', function(){
                // Only emit notes after query has been completed
                socket.emit('initial users', users)
            })

        isInitUsers = true
    } else {
        // Initial notes already exist, send out
        socket.emit('initial users', users)
    } */
})