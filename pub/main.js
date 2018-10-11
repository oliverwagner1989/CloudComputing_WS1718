$(function () {
    var socket = io();

    var username = prompt("What's your Username?");
    console.log(username);
    socket.emit('add user', username);

    socket.on('user joined', (data)  => {
        console.log(data.username + ' joined');
        $('#messages').append($('<li>').text(data.username + ' joined'));
    });


    $("#send").submit(function () {
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    socket.on('chat message', function (msg) {
        $('#messages').append($('<li>').text(' ' + msg));
    });

    $("#upload").submit(function (req, res) {
        console.log(req);
        return false;
    });
});