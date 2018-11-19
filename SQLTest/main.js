$(document).ready(function(){
    // Connect to our node/websockets server
    var socket = io.connect('http://localhost:3000');
	
	socket.on('prompt', function (data) {
		alert(data);
	});	

	socket.on('loggedIn', function (data) {
		$( "body" ).empty();
		$( "body" ).append('Hello '+data.username);
	});
	
    // Add a new user
    $('#send').click(function(){
        var username = $('#username').val().trim();
		var password = $('#password').val().trim();
		if (username!='' && password!='') {
        socket.emit('new user', {user: {username, password}})
		} else {
			alert('Please fill out all fields');
		}
    })
	
	//Check User Login
	$('#login').click(function(){
        var username = $('#username').val();
		var password = $('#password').val();
        socket.emit('login', {user: {username, password}})
    })
})