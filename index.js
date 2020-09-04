const express = require("express");
const WebSocket = require('ws');
const http = require('http');
const ip = require('ip');
//var admin = require("firebase-admin");
var firebase = require("firebase/app");
require("firebase/auth");
require("firebase/database");
var account = require("./serviceAccount.json");
const app = express();
const port = 3000;
const appIp = ip.address();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

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

server.listen(port,appIp, () => {
   console.log(`Example app listening at http://${appIp}:${port}`)
})