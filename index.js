const path = require('path');
const http = require("http");
const socketIO = require("socket.io");
const fs=require("fs");

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

// Get the content type for a given path
// @param {string} url - url extracted from request.url 
 function getContentType(url) {
    // Set the default content type to application/octet-stream
    let contentType = 'application/octet-stream';
    // Get the file extension
    const extname = path.extname(url);
    // Set the contentType based on the mime type
    for (let key in mimeTypes) {
      if (mimeTypes.hasOwnProperty(key)) {
        if (extname === key) {
          contentType = mimeTypes[key];
        }
      }
    }
    return contentType;
  };

// STATIC PAGES SERVER
const httpServer = http.createServer(function (req, response) {
    var pathname=req.url;
    if(pathname){
        if (pathname=="/")
            pathname="/index.html"
        const contentType = getContentType(pathname);
        // Set the Content-Type response header
        response.setHeader('Content-Type', contentType);
        // Read the file and send the response
        fs.readFile(`${__dirname}/site${pathname}`, (error, data) => {
        if (!error) {
            response.writeHead(200);
            response.end(data);
        } else {
            response.writeHead(404);
            response.end('404 - File Not Found');
        }
        });
    }
});

//RUNNING IN MEMORY:
var userList=[]; //All Users
var roomList=[]; //All rooms

var USER={
    newUser:function(uid,socketId){
        this.userId=uid;
        this.socketId=socketId;
    },
    reconnect:function(uid,socketId) {
        var u=userList.find(a=>a.userId==uid);
        if (u){
            u.socketId=socketId;
            return u;
        }
        else{
            userList.push(new USER.newUser(uid,socketId));
            return userList[userList.length-1];
        }
    }
}

//COMM
const io = socketIO(httpServer, { 
    // Specifying CORS 
    cors: {
        origin: "*",
    }
});

io.on("connection", (socket) => {
    socket.on('disconnect', () => {
        console.log('user disconnected',socket.id);
    });
    socket.on('user-reconnected', async (uid,roomName) => {
        console.log('user-reconnected',uid);
        var u=USER.reconnect(uid,socket.id);
        console.log("USER:", u);
        if (u.roomName){
            console.log("user has room:" + u.roomName)
            socket.join(u.roomName);
            var r=roomList.find(r=>r.roomName==u.roomName);
            socket.emit("roomData",r.data,r.lastUpdate);
            //SendDataToUsersInRoom(u.roomName)
        }
        else
        {
            console.log("User has no room")
        }
        DataDebug()
    });
    socket.on('user-new', () => {
        console.log('user-new');
        socket.emit("user-newid",socket.id);
        DataDebug();
    });

    socket.on('operation', (roomName,data)=>{
        console.log("operation:",roomName);
        socket.to(roomName).emit('recInst',data)
    })

    socket.on('updatemap', async (roomName,map) => {
        var r=roomList.find(r=>r.roomName==roomName);
        if (r){
            r.data=map;
            r.lastUpdate=Date.now();
        }
        else
        {
            console.log("Error: Can't find " + roomName)
        }
    });

    socket.on('join', async (uid,roomName,map,lastMapUpdate) => {
        console.log('join');
        var u=USER.reconnect(uid,socket.id);
        var i=userList.findIndex(u=>u.socketId==socket.id)
        console.log("found user:" + i)
        socket.join(roomName);
        if (u.roomName==roomName){
            //reconnect to room
            console.log("reconnect to room " + roomName)
            SendDataToUsersInRoom(userList[i].roomName);

        }
        else{
            //new to room
            console.log("new to room " + roomName)
            //check if room exists
            var r=roomList.find(r=>r.roomName==roomName);
            if (r){
                //socket.emit("roomData",r.data)
                SendDataToUsersInRoom(roomName)
            }
            else
            {
                //INITIALIZE IT
                roomList.push({roomName:roomName, data:map, lastUpdate:Date.now()});
            }
            u.roomName=roomName;
        }
    });    
});

function SendDataToUsersInRoom(roomName){
    var r=roomList.find(r=>r.roomName==roomName);
    io.to(r.roomName).emit("roomData",r.data,r.lastUpdate);
}

function DataDebug(){
    //UNCOMMENT FOR FULL DEBUG.
    // console.log(userList)
    // console.log(roomList)
}

const PORT = process.env.PORT || 3500;
console.log("Listening to port: ",PORT)
httpServer.listen(PORT);