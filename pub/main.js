$(function () {
    var socket = io();
    $("#chat").toggle();
    $("#send").toggle();
    $("#onlineusers").toggle();
    $("#login").submit(function () {
        var username = $("#username").val();
        console.log(username);
        socket.emit('add user', username);
        socket.on('user joined', (data) => {
            console.log(data.username + ' joined');
            $('#messages').hide().append($('<li class="list-group-item">').text(data.username + ' joined')).fadeIn(300);
            $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
        });
        $("#login").slideToggle("slow");
        $("#chat").slideToggle("slow");
        $("#send").slideToggle("slow");
        updateOnlineUser();
        $("#onlineusers").toggle("slow");
        $('#m').focus();
        return false;
    });

    $("#send").submit(function () {
        updateOnlineUser();
        var commandList = "\\list";
        //returns the online users to the client
        if ($('#m').val().trim()==commandList) {
            socket.emit('list', function (list) {
                    updateOnlineUser();
                    $('#messages').hide().append($('<li class="list-group-item active">').text('Online sind: ' + list)).fadeIn(300);
                    $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
                    $("#messages").emoticonize();
            });
            //message will be sent if input is not empty
        } else if ($('#m').val().trim()!='') {
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
        $("#messages").emoticonize();
    });

    function updateOnlineUser() {
        socket.emit('list', function (list) {
            $('#onlineusers').replaceWith("Online: " + list);
        });
    }

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