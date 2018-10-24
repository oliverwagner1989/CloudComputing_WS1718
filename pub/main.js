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
    window.onbeforeunload = function(){ //prevents closing/refreshing the chat window on accident
        return "Are you sure you want to close the window?";
    };
    var socket = io();
    var reader = new FileReader();
    //preventDropButtonDefaultBehaviour();

    //hiding the chat elements on login
    $("#messageBox").hide();
    $("#send").hide();
    $("#onlineusers").hide();


    $("#login").submit(function () {
        var username = $("#username").val().trim(); //removing blank spaces at the end of username input


        if(username.length > 0){ //in case entered username is not empty, username will be sent to server
            socket.emit('add user', username);

            socket.on('user joined', function(data){ //displaying message that the user has joined the chat
                $('#messages').hide().append($('<li class="list-group-item">').text(data.username + ' joined')).fadeIn(300);
            });

            socket.on('enter chatroom', function () {
                $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');

                //hiding the login elements after sucessful login and show the chat elements
                $("#login").hide("slow");
                $("#messageBox").show("slow");
                $("#send").show("slow");

                //changeButtonOnDragover();
                updateOnlineUser();
                $("#onlineusers").show("slow"); //showing the navbar displaying the active user
                $('#m').focus();
            });
        }else{
            //in case entered username is empty
            alert("Please enter a Username!");
        }
        return false;
    });

    //File transfer
    //once a file is picked via input[type=file], the file will be decoded to base64 and sent to the server for further processing
    //$('#upload_btn').on('drop', function () {
    $("#file-upload").on('change', function () {
        reader.onload = function(event) {
            socket.emit('sendFile', event.target.result);
        };
        reader.readAsDataURL(document.querySelector('input[type=file]').files[0]);
    });


    $("#send").submit(function () {
        var commandList = "\\list";
        //returns the online users to the client when user is sending the message "\list"
        if ($('#m').val().trim()==commandList) {
            socket.emit('list', function (list) {
                    $('#messages').hide().append($('<li class="list-group-item active">').text('Online sind: ' + list)).fadeIn(300);
                    $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
                    //$("#messages").emoticonize();
            });

         //message will be whispered to a single person when user is sending a message '@user message'
        }else if ($('#m').val().trim().match(/^(@)\w+/)){
            socket.emit('whisper', $('#m').val());
         //empty messages cannot be send
        } else if ($('#m').val().trim()!='') {
            socket.emit('chat message', $('#m').val());
        } else {
            alert("input error");
        }
        $('#m').val(''); //emptying the input form after a messae is sent
        $('#m').focus();
        return false;

    });

    //appending a new message to the message list
    socket.on('chat message', function (msg) {
            $('#messages').hide().append($('<li class="list-group-item active">').text(' ' + msg).emoticonize()).fadeIn(300);
            $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
            $("#messages").animate({ scrollTop: $("#messages")[0].scrollHeight});
    });

    //if a users uploads a file via input[type=file], the base64-encoded image will be appended to the messages list
    socket.on('img', (msg, data) => { //for images
        var imgTag = `<img style="width:100%;max-width:200px" id="myImg" src="${data}"/>`;
        $('#messages').hide().append($('<li class="list-group-item active">').html(msg + ' ' + imgTag)).fadeIn(300);
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
        $("#messages").animate({ scrollTop: $("#messages")[0].scrollHeight});
    });

    socket.on('vid', (msg, data) => { //for videos
        var vidTag = `<video width="320" height="240" controls><source src="${data}"></video>`;
        $('#messages').hide().append($('<li class="list-group-item active">').html(msg + ' ' + vidTag)).fadeIn(300);
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
        $("#messages").animate({ scrollTop: $("#messages")[0].scrollHeight});
    });

    socket.on('audio', (msg, data) => { //for audio files
        var audioTag = `<audio controls><source src="${data}"></audio>`;
        $('#messages').hide().append($('<li class="list-group-item active">').html(msg + ' ' + audioTag)).fadeIn(300);
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
        $("#messages").animate({ scrollTop: $("#messages")[0].scrollHeight});
    });
    socket.on('pdf', (msg, data) => { //for pdf documents
        var pdfTag = `<embed src="${data}" width="600" height="500" pluginspage="http://www.adobe.com/products/acrobat/readstep2.html">`;
        $('#messages').hide().append($('<li class="list-group-item active">').html(msg + ' ' + pdfTag)).fadeIn(300);
        $("li.active").prev().removeClass('list-group-item active').addClass('list-group-item');
        $("#messages").animate({ scrollTop: $("#messages")[0].scrollHeight});
    });

    //in case an alert is needed
    socket.on('alert', (msg) => {
        alert(msg);
    });

    //constantly updating the list of active users
    function updateOnlineUser() {
        socket.emit('list', function (list) {
            $('#onlineusers').text("Online: "+list);
            updateOnlineUser();
        });
    }
});

/*function preventDropButtonDefaultBehaviour() {
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
}*/

/*
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

}*/
