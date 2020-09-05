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
const brodcastSendPort = 2551;
let macToIpAddress = [];

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
      client.send(message2, 0, message2.length, brodcastSendPort, rinfo.address, function() {
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
      setTargetTempESPCommand(data.key,data.val().targetTemp);
      console.log("executed setTargetTempESPCommand with temp: "+data.val().targetTemp);
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
               setTempCommand(command[1],command[2]);
               ws.send("res|success");
            } else {
               console.log("bad arguments");
               ws.send("res|bad args");
            }
            break;
         case "sendMac":
            if(command.length === 2) {
               assignIpToMac(command[1],_ip,ws);
               ws.send("res|success");
            } else {
               console.log("bad arguments");
               ws.send("res|bad args");
            }
            break;
         default:
            console.log("unknown command");
            ws.send("res|unknown");
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

//#####################################
//          Helper Functions
//#####################################

function findIpAddress(macAddress) {
   return macToIpAddress.filter(item => {
      return item.mac === macAddress;
   });
}

//#####################################
//          Command Functions
//#####################################

function assignIpToMac(mac,ip,ws) {
   let testExist = findIpAddress(mac);
   if(testExist.length > 0) {
      testExist[0].ip = ip;
      testExist[0].ws = ws;
      console.log("ip updated for macaddress");
   } else {
      macToIpAddress.push({
         ip: ip,
         mac: mac,
         ws:ws
      });
   }

   console.log("to mac address: "+mac+" was asigned ip: "+ip);
}

function setTempCommand(mac,temp) {
   console.log("setTemp command executed on "+mac+" with temperature of "+temp);
   database.ref("/users/"+lastUserUID+"/devices/"+mac+"/temp").set(temp);
}

function setTargetTempESPCommand(mac,temp) {
   let target = findIpAddress(mac);
   if(target.length > 0)
   target[0].ws.send("setTargetTemp|"+temp);
}

//#####################################
//             Web interface
//#####################################
/*app.get("/",(req,resp)=>{
   if(authState === 'SIGNED_IN')
      resp.send("temp "+ targetTemp +" "+lastUserUID);
   else
      resp.send("sing in please");
});*/

server.listen(appPort,appIp, () => {
   console.log(`Example app listening at http://${appIp}:${appPort}`)
})