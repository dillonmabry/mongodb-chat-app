var express = require('express');
var app = express();
var server = require('http').createServer(app);
var client = require('socket.io').listen(server);
var mongo = require('mongodb').MongoClient;
var database = process.env.MONGOLAB_URI;
var serverLimit = 1000;

var users = [];

server.listen(process.env.PORT || 3000);

console.log('Server running...');

app.get('/', function(req, res){
   res.sendFile(__dirname + '/index.html'); 
});

// CONNECT TO MONGODB
mongo.connect(database,
function(err, db){
    if(err) {
        throw err;
    }
    
    console.log('MongoDB connected...');
    
    // CONNECT TO  SOCKET.IO
    client.on('connection', function(socket){
        // INIT
        var chat = db.collection('chats');
        
        // SEND STATUS
        sendStatus = function(s) {
            socket.emit('status', s);
        };
        
        // GET CHATS FROM COLLECTION
        chat.find().limit(100).sort({_id:1}).toArray(function(err, res){
            if(err) {
                throw err;
            }
            // EMIT MESSAGES TO CLIENT
            socket.emit('output', res);
        });
        
        // HANDLE INPUTS
        socket.on('input', function(data){
            //GET INPUT VARS AND SEND OUTPUT BACK TO ALL CLIENTS
            var name = data.name;
            var message = data.message;
            var time = data.time;
            
            // CHECK INPUT
            if(name == '' || message == '') {
                sendStatus({
                    message:'Please enter a name and message',
                    clear: false
                });
            } else {
                chat.find().count().then(function (value) { 
                    if(value >= serverLimit) {
                        sendStatus({
                            message:'Chat limit reached! Clear the chat to' 
                            +' update with more messages.',
                            clear: true
                        });
                    } else {
                        // INSERT MSG TO DB
                        chat.insert({name: name, message: message, time: time}, function(){
                            client.emit('output', [data]);
                            
                            // SEND STATUS OBJECT
                            sendStatus({
                                message: 'Message sent',
                                clear: true
                            });
                        });
                    }
                });
            }
        });
        
        // HANDLE CLEARING MESSAGE
        socket.on('clear', function(data) {
           // REMOVE ALL CHATS FROM COLLECTION OBJECT
           chat.remove({}, function(){
              // SEND CLEAR RESPONSE
              socket.emit('cleared');
           });
        });
        
    }); 
}); 
