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

$(function () {
/*    window.onbeforeunload = function(){
        return "Are you sure you want to close the window?";
    };*/
    var socket = io();
    preventDropButtonDefaultBehaviour();
    $("#messageBox").toggle();
    $("#send").toggle();
    $("#onlineusers").toggle();
    $("#login").submit(function () {
        var username = $("#username").val().trim();

        socket.emit('add user', username);
        socket.on('user joined', function(data){
            $('#messages').hide().append($('<li class="list-group-item">').text(data.username + ' joined')).fadeIn(300);
        });

        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');

        $("#login").slideToggle("slow");
        $("#messageBox").slideToggle("slow");
        $("#send").slideToggle("slow");
        changeButtonOnDragover();
        updateOnlineUser();
        $("#onlineusers").toggle("slow");
        $('#m').focus();
        return false;
    });

    //File transfer
    //once a file is picked via input[type=file], the file will be decoded to base64 and sent to the server for further processing
    //$('#upload_btn').on('drop', function () {
    $("#file-upload").on('change', function () {
        var reader = new FileReader();
        reader.onload = function(event) {
            //console.log(event.target.result);
            socket.emit('sendFile', event.target.result);
        };
        reader.readAsDataURL(document.querySelector('input[type=file]').files[0]);
    });


    $("#send").submit(function () {
        var commandList = "\\list";
        //returns the online users to the client
        if ($('#m').val().trim()==commandList) {
            socket.emit('list', function (list) {
                    $('#messages').hide().append($('<li class="list-group-item active">').text('Online sind: ' + list)).fadeIn(300);
                    $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
                    $("#messages").emoticonize();
            });

         //message will be whispered to a single person
        }else if ($('#m').val().trim().match(/^(@)\w+/)){
            socket.emit('whisper', $('#m').val());
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

    //if a users uploads a file via input[type=file], the base64-encoded image will be appended to the messages list
    socket.on('img', (msg, data) => {
        var imgTag = `<img style="width:100%;max-width:200px" id="myImg" src="${data}"/>`;
        $('#messages').append($('<li class="list-group-item active">').html(imgTag));
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
    });

    socket.on('vid', (msg, data) => {
        var vidTag = `<video width="320" height="240" controls><source src="${data}"></video>`;
        $('#messages').append($('<li class="list-group-item active">').html(vidTag));
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
    });

    socket.on('audio', (msg, data) => {
        var audioTag = `<audio controls><source src="${data}"></audio>`;
        $('#messages').append($('<li class="list-group-item active">').html(audioTag));
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
    });

    socket.on('pdf', (data) => {
       var pdfTag = `<embed src="${data}" width="600" height="500" pluginspage="http://www.adobe.com/products/acrobat/readstep2.html">`;
        $('#messages').append($('<li class="list-group-item active">').html(pdfTag));
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
    });

    //constantly updating the list of active users
    function updateOnlineUser() {
        socket.emit('list', function (list) {
            $('#onlineusers').text("Online: "+list);
            updateOnlineUser();
        });
    }
});

function preventDropButtonDefaultBehaviour() {
    $("html").on("dragover", function(event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).addClass('dragging');
    });

    $("html").on("dragleave", function(event) {
        event.preventDefault();
        event.stopPropagation();
        $(this).removeClass('dragging');
    });

    $("html").on("drop", function(event) {
        event.preventDefault();
        event.stopPropagation();
    });
}

function changeButtonOnDragover() {
    $('#upload_btn').on('dragover', function () {
        $('#upload_btn').removeClass("btn btn-warning");
        $('#upload_btn').addClass("btn btn-danger btn-lg");
        $('#upload_btn_icon').html("<br/><font face='verdana'> Drop your file here!</font>");
    });
    $('#upload_btn').on('dragleave drop', function () {
        $('#upload_btn').removeClass("btn btn-danger btn-lg");
        $('#upload_btn').addClass("btn btn-warning");
        $('#upload_btn_icon').html("");
    });

}