$(function () {
    var socket = io();
    var username = prompt("What's your Username?");
    console.log(username);
    socket.emit('add user', username);
    socket.on('user joined', (data) => {
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

    upload(socket);
});

function upload(socketio) {
    // Initialize instances:
    var socket = socketio.connect();
    var siofu = new SocketIOFileUpload(socket);
    console.log(siofu);

    // Configure the three ways that SocketIOFileUpload can read files:
    document.getElementById("upload_btn").addEventListener("click", siofu.prompt, false);
    //siofu.listenOnInput(document.getElementById("upload_input"));
    //siofu.listenOnDrop(document.getElementById("file_drop"));

    // Do something on upload progress:
    siofu.addEventListener("progress", function (event) {
        var percent = event.bytesLoaded / event.file.size * 100;
        console.log("File is", percent.toFixed(2), "percent loaded");
    });

    // Do something when a file is uploaded:
    siofu.addEventListener("complete", function (event) {
        console.log(event.success);
        console.log(event.file);
    });
}