$(document).ready(function () {
    /*
     var MyWorm = {
     id: null,
     alive: 1, //0=dead,1=alive
     colour: null,
     setWormId: function(id) {
     this.wormId = id;
     },
     sendWormStatus: function(socket, data) { //use socket
     socket.send();
     },
     allWorms: null

     };
     */
    var socket;
    streamConnect = function () {

        if (socket) {
            try {
                socket.emit('disconnect');
            } catch (e) {
            }
        }

        socket = new io.connect('http://192.168.56.12:8090');

        //socket.connect();

        socket.on('connect', function () {
            console.log('connected');
            Game.addMessage('You have been connected to the server');

            Game.setSocket(socket);
        });

        var processRespons = function (response) {
            console.log(response);
            switch (response.action) {
                case 'yourID':
                    Game.setId(response.values);
                    Game.sendName();
                    break;

                case 'allWorms':
                    console.log('allWorms');
                    Game.setWorms(response.values);
                    break;

                case 'map':
                    console.log('map data received');

                    Game.init(response.values);
                    break;

                case 'message':
                    console.log(response.values);
                    Game.addMessage(response.values);
                    break;

                case 'deleteWorm':
                    Game.testDie(response.values);
                    break;

                case 'wormsChanges':
                    Game.step(response.values);
                    break;

                default:
                    break;
            }
        };

        socket.on('message', function (data) {
            var i;
            $("#box").html(data);
            var response = JSON.parse(data);

            if (response.constructor === Array) {
                for (i = 0; i < response.length; i++) {
                    processRespons(response[i]);
                }
            } else {
                processRespons(response);
            }


        });


        socket.on('disconnect', function () {
            console.log('disconected');
            Game.addMessage('You have been disconnected from the server');
        });


        $(function () {
            $("#send2").click(function () {
                socket.emit('message', $("#send").val());
            })
        })
    }
});
