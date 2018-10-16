$(function () {
    var socket = io();
    var username = prompt("What's your Username?");
    console.log(username);
    socket.emit('add user', username);
    socket.on('user joined', (data) => {
        console.log(data.username + ' joined');
        $('#messages').hide().append($('<li class="list-group-item active">').text(data.username + ' joined')).fadeIn(300);
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
    });

    $("#send").submit(function () {
        if ($('#m').val().trim()!='') {
            socket.emit('chat message', $('#m').val());
            } else {
                alert("input error");
            }
            $('#m').val('');
            $('#m').focus();
            return false;
    });

    socket.on('chat message', function (msg) {
        $('#messages').hide().append($('<li class="list-group-item active">').text(' ' + msg)).fadeIn(300);
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
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

    siofu.addEventListener("load", function (event) {
        $('#messages').hide().append($('<li class="list-group-item active">').text("File uploaded: " + event.file.name)).fadeIn(300);
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
        console.log(event);
    });
}