$(document).ready(function(){
	console.log(1);
    // Connect to our node/websockets server
    var socket = io.connect('http://localhost:3000');

    // Add a new user
    $('#send').click(function(){
        var username = $('#username').val();
		var password = $('#password').val();
		console.log(username);
		console.log(password);
        socket.emit('new user', {user: {username, password}})
    })
})