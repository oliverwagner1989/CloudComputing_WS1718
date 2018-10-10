$(function () {
    var username = prompt("Username");
    var socket = io();
    $("#send").submit(function () {
        socket.emit('chat message', $('#m').val());
        $('#m').val('');
        return false;
    });
    socket.on('chat message', function (msg) {
        $('#messages').append($('<li>').text(msg));
    });

    $("#upload").submit(function (req, res) {
        console.log(req);
        return false;
    });
});