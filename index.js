const express = require("express");
const firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
//const account = require("./serviceAccount.json");
//app var
const ip = require('ip');
const app = express();
const appPort = 3000;
const appIp = ip.address();
//websocket var
const WebSocket = require('ws');
const http = require('http');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
//brodcast var
const dgram = require('dgram');
const client = dgram.createSocket('udp4');
const brodcastListenPort = 12345;
const sendSendPort = 2551;
//#####################################
//          Brodcast Listener
//#####################################

client.on('listening', function () {
   var address = client.address();
   console.log('UDP Client listening on ' + address.address + ":" + address.port);
   client.setBroadcast(true);
});

client.on('message', function (message, rinfo) {
   //console.log('Message from: ' + rinfo.address + ':' + rinfo.port +' - ' + message);
   if(message == "gimme your ip bro"){
      console.log(rinfo.address+" wants my IP");
      var bufferNull = Buffer.from([0x00]);
      //var message = Buffer.from("WiFi-login|Kubas445|Kubas4451593572684");
      var message2 = Buffer.from("ok its me");
      message2 = Buffer.concat([message2, bufferNull]);
      client.send(message2, 0, message2.length, sendSendPort, rinfo.address, function() {
         console.log("Send '" + message2 + "'");
      });
   }
});

client.bind(brodcastListenPort);

//#####################################
//          Firebase Setup
//#####################################

const config = {
   apiKey: 'AIzaSyBjjKTJrHGT6IYaLRTtiuRfRIUt5QWMWYc',
   authDomain: 'my-website-c179c.firebaseapp.com',
   databaseURL: 'https://my-website-c179c.firebaseio.com',
   projectId: 'my-website-c179c',
   storageBucket: 'my-website-c179c.appspot.com',
   messagingSenderId: 141034843850
};

if (!firebase.apps.length) {
   firebase.initializeApp(config);
}

const auth = firebase.auth();
const database = firebase.database();
var authState = 'SIGNED_OUT';
var lastUserUID;
let targetTempListener;

function refreshOrCreateTargetTempListener(userID) {
   if(targetTempListener) {
      targetTempListener.off("child_changed");
   }

   targetTempListener = database.ref("/users/"+userID+"/devices/")
   targetTempListener.on("child_changed",data => {
      //targetTemp = data.val().targetTemp;
      console.log(data.val().targetTemp);
   });
}

/*admin.initializeApp({
   credential:admin.credential.cert(account),
   databaseURL: "https://my-website-c179c.firebaseio.com"
});*/

auth.onAuthStateChanged(authUser => {
   if(authUser) {
      authState = 'SIGNED_IN';
      lastUserUID = authUser.uid;
      refreshOrCreateTargetTempListener(lastUserUID);
   } else {
      authState = 'SIGNED_OUT'
   }
});

auth.signInWithEmailAndPassword("jakubsedlak102@gmail.com","1593572684").catch(error => console.log(error));

//#####################################
//          WebSocket Setup
//#####################################

wss.on('connection', (ws,request) => {
   //connection is up, let's add a simple simple event
   ws.on('message', (message) => {
      const _ip = request.socket.remoteAddress;
      message = message.replace("\n","");
      message = message.trim();
      const command = message.split("|");
      switch (command[0]) {
         case "setTemp":            //setTemp|ID|temp value
            if(command.length === 3) {
               console.log("setTemp command");
               ws.send("res|success");
            } else {
               console.log("bad arguments");
               ws.send("res|bad args");
            }
            break;
      }
      //log the received message and send it back to the client
      console.log('received from '+_ip+': %s', message);
      //ws.send(`Hello, you sent -> ${message}`);
   });

   //send immediatly a feedback to the incoming connection
   ws.send('Hi there, I am a WebSocket server');
   console.log("sending message");
});

/*app.get("/",(req,resp)=>{
   if(authState === 'SIGNED_IN')
      resp.send("temp "+ targetTemp +" "+lastUserUID);
   else
      resp.send("sing in please");
});*/

server.listen(appPort,appIp, () => {
   console.log(`Example app listening at http://${appIp}:${appPort}`)
})