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
		io.sockets.emit('new user', data)
		
		var queryUserName = db.query('SELECT COUNT (*) as count FROM Users WHERE username=?', data.user.username,
		function (error, results, fields)
			{if (results[0].count>0) { //if query result >0 username is already in DB
			io.sockets.emit('prompt', 'Username is already taken. Please choose a different one');}
				else {
					var queryRegister = db.query('INSERT INTO Users SET ?', data.user)
					var queryHashPassword= db.query('UPDATE Users SET password = SHA(?) WHERE username=?', [data.user.password, data.user.username]);
					io.sockets.emit('prompt', 'New user registered. You can login now with your chosen credentials');
				};
		}); 
		

	});
	
	socket.on('login', function(data) {
		var queryLogin = db.query('SELECT COUNT (*) as count FROM Users WHERE username=? && password = SHA(?)', [data.user.username, data.user.password],
		function (error, results, fields) {
			if (results[0].count>0) { //if query result >0 user credentials are valid
			io.sockets.emit('loggedIn', {username:data.user.username});}
				else {io.sockets.emit('prompt', 'Wrong username or password.'); };
		}); 
	});
})