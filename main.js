var http = require('http'),
    io = require('socket.io'),
    express = require('express'),
    path = require('path'),
    app = express(),
    server = http.createServer(app);

server.listen(8090);

require('./utils/worm');
require('./utils/table');


app.use(express.static(path.join(__dirname, 'public')));

var messages = ["bites the dust", "killed himself", "fallowed bin laden", ",die die!", "didn't have 9 lives", " see you in hell", "jabber wobber", " has been undefined", "sleeps with the fish", " equals null"];

var timeout = 500,
    worms = {},
    clients = [],
    wormsNumber = 0,
    table1 = new table();

var tableToSend = JSON.stringify({
    "action" : "map" ,
    "values" : table1.getSpace()
});

var socket = io.listen(server);

setInterval(function(){
    var positions = [];

    var wormsToKill = [];

    var tmpFields = worms;

    var wormX, wormY, tmpEach;

    for(wormX in worms) {

        if(worms[wormX] == undefined) {
            continue;
        }

        worms[wormX].move();

        pieces = worms[wormX].getPieces();

        /**
         *
         * check if worm head has hit a wall
         *
         */
        if(table1.checkLimit(pieces[0][0],pieces[0][1])){

            wormsToKill.push(wormX);

        } else {
            wormY = {
                "id":worms[wormX].getId(),
                "pieces":pieces
            };
            positions.push(wormY);
        }

        for(tmpEach in tmpFields){
            if(tmpEach != wormX) {
                intersectWorms(tmpEach, wormX);
            }
        }
    }

    for(var i = 0; i <  wormsToKill.length; i++){
        syncronizedAction('deleteWorm',wormsToKill[i]);
    }


    socket.emit('message', JSON.stringify({
        "action":"wormsChanges",
        "values":positions
    }));

}, timeout);

function intersectWorms(worm1, worm2){

    if(worms[worm1] == undefined || worms[worm2] == undefined) {
        return;
    }

    var sl1 =  worms[worm1].getPieces();
    var sl2 =  worms[worm2].getPieces();

    for(var i = 0; i < sl1.length; i++) {
        if(sl1[i][0] == sl2[0][0] &&  sl1[i][1] == sl2[0][1]){

            if(i == 0) {
                if(sl1.length == sl2.length){
                    deleteWorm(worm1);
                    deleteWorm(worm2);
                } else if(sl1.length < sl2.length) {
                    deleteWorm(worm1);
                    worms[worm2].addPieces(sl1.length);
                } else {
                    deleteWorm(worm2);
                    worms[worm1].addPieces(sl2.length);
                }
                return ;
            }

            if(worms[worm1] != undefined) {
                var toAdd = worms[worm1].remove(i);
            }

            worms[worm2].addPieces(toAdd);

            if(worms[worm1] != undefined && worms[worm1].toSmall()){
                deleteWorm(worm1);
            }

        }
    }
}

function syncronizedAction(action, id)
{
    if(worms[id] == undefined){
        return ;
    }

    switch(action){
        case 'deleteWorm':
            deleteWorm(id);
            break;
        case 'moveWorm':
            moveWorm(id, arguments[2]);
            break;
        case 'nameWorm':

            worms[id].setName(arguments[2]);
            break;
        case 'getName':
            return worms[id].getName();
            break;
    }
}

function moveWorm(id,direction){
    worms[id].changeDestination(direction);
}


function deleteWorm(id){

    socket.emit('message', JSON.stringify([{
        "action":"deleteWorm",
        "values":id
    },{
        "action":"message",
        "values": syncronizedAction('getName',id) + '  ' + getRandKillMessage()
    },{
        "action" : "allWorms",
        "values" : getWormsCredentials()
    }]));

    delete worms[id];
}

function getRandKillMessage(){
    var i = Math.round(Math.random() * messages.length - 1 );

    return messages[i];
}
/**
 *
 * returns worm credentials
 */
function getWormsCredentials (){
    var retunedArray = [];
    for(wormX in worms){
        retunedArray.push({
            "id":worms[wormX].getId(),
            "color":worms[wormX].getColor(),
            "nume" : worms[wormX].getName()
        });
    }

    return retunedArray;
}

socket.on('connection', function(client){

    wormsNumber++;
    clients.push(client);

    client.wormId = wormsNumber;

    worms[wormsNumber]= new worm(wormsNumber);

    /**
     * sending welcome message
     */
    client.send(JSON.stringify({
        "action" : "yourID",
        "values" : wormsNumber
    }));

    client.send(tableToSend);

    client.on('message', function(message){
        var decoded = JSON.parse(message);

        switch(decoded.action) {
            case 'keypressed':
                //moveWorm(decoded.values.id, decoded.values.direction);
                syncronizedAction('moveWorm',decoded.values.id, decoded.values.direction);
                break;
            case 'name':
                syncronizedAction('nameWorm',decoded.id, decoded.nume);
                /**
                 * hack
                 */
                socket.emit('message', JSON.stringify({
                    "action" : "allWorms",
                    "values" : getWormsCredentials()
                }));
                break;
        }
    });

    client.on('disconnect', function(){
        syncronizedAction('deleteWorm',client.wormId);
    });
});
