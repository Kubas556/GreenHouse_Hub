const express = require("express");
const firebase = require('firebase');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
let db = new sqlite3.Database('/home/pi/greenhouse.db', (err) => {
   if (err) {
      return console.error(err.message);
   }
   console.log('Connected to the greenhouse SQlite database.');
});

db.serialize(function() {
  db.get("SELECT email,password FROM LogedIn", function(err, row) {
     if(row)
      if(row.email)
      loginUser(row.email,row.password);
      else
      console.log("no loged user yet");
  });
});

function loginUser(email,password,webResponse) {
   if(authState === "SIGNED_IN" )
      auth.signOut().then(()=>{
         auth.signInWithEmailAndPassword(email,password).catch(error => error).then(resp=>{
         if(resp)
            if(resp.user)
            db.run("INSERT INTO LogedIn (ID,email,password) VALUES (1,$email,$password) ON CONFLICT (ID) DO UPDATE SET email=$email,password=$password;",{
               $email:email,
               $password:password
               },function (call,err) {
               console.log(call,err);
            });
               
               if(webResponse)
               webResponse.redirect("http://"+appIp+":3300/status");
         });
      });
   else
      auth.signInWithEmailAndPassword(email,password).catch(error => error).then(resp=>{
         if(resp)
            if(resp.user)
            db.run("INSERT INTO LogedIn (ID,email,password) VALUES (1,$email,$password) ON CONFLICT (ID) DO UPDATE SET email=$email,password=$password;",{
               $email:email,
               $password:password
               },function (call,err) {
               console.log(call,err);
            });

         if(webResponse)
            webResponse.redirect("http://"+appIp+":3300/status");
      });
}

//const account = require("./serviceAccount.json");
//app var
const ip = require('ip');
const app = express();
const appPort = 3300;
const appIp = ip.address();
//websocket var
const WebSocket = require('ws');
const http = require('http');
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const BrodcastListener = require('./BrodcastListener');
const GenerateStatusPage = require('./GenerateStatusPage');
let macToIpAddress = [];


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
let brodcastListener;
var lastUserUID;
var lastUserName;
let targetTempListeners = [];
let irrigationListeners = [];
let irrigationSoilHumidityListeners = [];

function removeTargetTempListener(mac) {
   targetTempListeners[mac].off("value");
   targetTempListeners[mac] = undefined;
}

function removeIrrigationListener(mac) {
   irrigationListeners[mac].off("value");
   irrigationListeners[mac] = undefined;
}

function removeIrrigationSoilHumidityListener(mac) {
   irrigationSoilHumidityListeners[mac].off("value");
   irrigationSoilHumidityListeners[mac] = undefined;
}

function refreshOrCreateTargetTempListener(mac) {
   if(targetTempListeners[mac]) {
      targetTempListeners[mac].off("value");
   }

   targetTempListeners[mac] = database.ref("/users/"+lastUserUID+"/devices/"+mac+"/targetTemp");
   targetTempListeners[mac].on("value",data => {
      //targetTemp = data.val().targetTemp;
      try {
         if (setTargetTempESPCommand(mac, data.val().temp, data.val().tempTolerantN, data.val().tempTolerantP))
            console.log("[server]executed setTargetTempESPCommand with temp: " + data.val().temp + " and tolerants: " + data.val().tempTolerantN + " and " + data.val().tempTolerantP);
      } catch (e) {
         console.log(e);
      }
   });
}

function refreshOrCreateIrrigationListener(mac) {
   if(irrigationListeners[mac]) {
      irrigationListeners[mac].off("value");
   }

   irrigationListeners[mac] = database.ref("/users/"+lastUserUID+"/devices/"+mac+"/irrigation");
   irrigationListeners[mac].on("value",data => {
      //targetTemp = data.val().targetTemp;
      try {
         if (setIrrigationESPCommand(mac, data.val().fertiliser, data.val().water, data.val().ratio, data.val().total))
            console.log("[server]executed setIrrigationESPCommand with fertiliser: " + data.val().fertiliser + " and water: " + data.val().water + " and total: " + data.val().total);
      } catch (e) {
         console.log(e);
      }
   });
}

function refreshOrCreateIrrigationSoilHumidityListener(mac) {
   if(irrigationSoilHumidityListeners[mac]) {
      irrigationSoilHumidityListeners[mac].off("value");
   }

   irrigationSoilHumidityListeners[mac] = database.ref("/users/"+lastUserUID+"/devices/"+mac+"/irrigationSoilHumidity");
   irrigationSoilHumidityListeners[mac].on("value", data => {
      try {
         if(setIrrigationSoilHumidityESPCommand(mac,data.val()))
            console.log("[server]executed setIrrigationSoilHumidityESPCommand with value: "+ data.val());
      } catch (e) {
         console.log(e);
      }
   });
}

auth.onAuthStateChanged(authUser => {
   if(authUser) {
      authState = 'SIGNED_IN';
      lastUserUID = authUser.uid;
      /*if(server.listening)
         server.close();*/

      database.ref("/users/"+lastUserUID+"/profile/username").once("value",data => {
         /*server.listen(appPort,appIp, () => {
            console.log(`[server]Example app listening at http://${appIp}:${appPort}`);
         })*/
         
         if(!brodcastListener)
         brodcastListener = BrodcastListener();
         
         lastUserName = data.val();
         console.log("signed as "+data.val());
      });
   } else {
      /*if(server.listening)
         server.close();*/

      if(brodcastListener) {
         brodcastListener.close();
         brodcastListener = undefined;
      }

      wss.clients.forEach(function each(client) {
         if (client.readyState === WebSocket.OPEN) {
           client.terminate();
         }
      });

      /*server.listen(3200,appIp, () => {
         console.log(`[server]Example app listening at http://${appIp}:${3200}`);
      });*/
      authState = 'SIGNED_OUT'
   }
});

//#####################################
//          WebSocket Setup
//#####################################

wss.on('connection', (ws,request) => {
   if(authState !== "SIGNED_IN")
   return ws.terminate();
  
   ws.on('message', (message) => {
      const _ip = request.socket.remoteAddress;
      message = message.replace('\n','');
      message = message.replace('\r','');
      message = message.trim();
      const command = message.split("|");
      switch (command[0]) {
         case "getIrrigation":
            if(command.length === 2) {
               getIrrigationCommand(ws,command[1]);
            } else {
               console.log("[server]bad arguments");
               //ws.send("res|bad args");
            }
            break;
         case "getIrrigationSoilHumidity":
            if(command.length === 2) {
               getIrrigationSoilHumidity(ws,command[1]);
            } else {
               console.log("[server]bad arguments");
            }
            break;
         case "getTemp":
            if(command.length === 2) {
               getTargetTempCommand(ws,command[1]);
            } else {
               console.log("[server]bad arguments");
               //ws.send("res|bad args");
            }
            break;
         case "setTemp":            //setTemp|ID|temp value
            if(command.length === 3) {
               setTempCommand(command[1],command[2]);
            } else {
               console.log("[server]bad arguments");
               //ws.send("res|bad args");
            }
            break;
         case "setSoilHumidity":
            if(command.length === 3) {
               setSoilHumidityCommand(command[1],command[2]);
            } else {
               console.log("[server]bad arguments");
            }
            break;
         case "setAirHumidity":
         if(command.length === 3) {
            setAirHumidityCommand(command[1],command[2]);
         } else {
            console.log("[server]bad arguments");
         }
         break;
         case "sendMac":
            if(command.length === 2) {
               findUserDevice(command[1]).once("value",data => {
                  let device = data.val();
                  if(device) {
                     console.log("device found");
                     assignIpToMac(command[1], _ip, ws);
                     refreshOrCreateTargetTempListener(command[1]);
                     refreshOrCreateIrrigationListener(command[1]);
                     refreshOrCreateIrrigationSoilHumidityListener(command[1]);
                  }
               });
            } else {
               console.log("[server]bad arguments");
               //ws.send("res|bad args");
            }
            break;
         case "getLoginStatus":
            ws.send(JSON.stringify({status:authState}));
            break;
         case "notify":
            if(command.length === 4) {
               if(command[2] === "outOfWater")
               setLowWaterNotify(command[1], command[3]);
            } else {
               console.log("[server]bad arguments");
            }
            break;
         default:
            console.log("[server]unknown command");
            //ws.send("res|unknown");
            break;
      }
      //log the received message and send it back to the client
      console.log('[server]received from '+_ip+': %s', message);
      //ws.send(`Hello, you sent -> ${message}`);
   });
   ws.on('error', function close() {
      let ws = macToIpAddress.filter(value => value.ws == ws);
      if(ws.length > 0)
         removeTargetTempListener(ws.mac);
         removeIrrigationListener(ws.mac);
         removeIrrigationSoilHumidityListener(ws.mac);
      console.log('disconnected');
   });
   //send immediatly a feedback to the incoming connection
   //ws.send('Hi there, I am a WebSocket server');
   //console.log("sending message");
});

//#####################################
//          Helper Functions
//#####################################

function findIpAddress(macAddress) {
   return macToIpAddress.filter(item => {
      return item.mac === macAddress;
   });
}

function findUserDevice(macAddress) {
   return database.ref("/users/"+lastUserUID+"/devices").child(macAddress);
}

//#####################################
//          Command Functions
//#####################################

function assignIpToMac(mac,ip,ws) {
   let testExist = findIpAddress(mac);
   if(testExist.length > 0) {
      testExist[0].ip = ip;
      testExist[0].ws = ws;
      console.log("[server]ip updated for macaddress");
   } else {
      macToIpAddress.push({
         ip: ip,
         mac: mac,
         ws:ws
      });
   }

   console.log("[server]to mac address: "+mac+" was asigned ip: "+ip);
}
//###########################################
//manual get commands (work in progress)
function getTargetTempCommand(ws,mac) {
   try {
      database.ref("/users/" + lastUserUID + "/devices/" + mac + "/targetTemp").once('value', data => {
         ws.send("res|" + data.val().temp + "|" + data.val().tempTolerantN + "|" + data.val().tempTolerantP);
      });
   }catch (e) {
      console.log(e);
   }
}

function getIrrigationCommand(ws,mac) {
   try {
      database.ref("/users/" + lastUserUID + "/devices/" + mac + "/irrigation").once('value', data => {
         ws.send("res|" + data.val().fertiliser + "|" + data.val().water + "|" + data.val().ratio + "|" + data.val().total);
      });
   } catch (e) {
      console.log(e);
   }
}

function getIrrigationSoilHumidity(ws,mac) {
   try {
      database.ref("/users/" + lastUserUID + "/devices/" + mac + "/irrigationSoilHumidity").once('value', data => {
         ws.send("res|" + data.val());
      });
   } catch (e) {
      console.log(e);
   }

}

//###########################################

//send new temp to firebase
function setTempCommand(mac, temp) {
   if(findIpAddress(mac).length > 0) {
      console.log("[server]setTemp command executed on " + mac + " with temperature of " + temp);
      database.ref("/users/" + lastUserUID + "/devices/" + mac + "/temp").set(temp.toString()).catch(error => {
         console.log("[server]bad command");
      });
      //ws.send("res|success");
   } else {
      console.log("[server]invalid parameters value!");
      //ws.send("res|invalid params");
   }
}

function setLowWaterNotify(mac, val) {
   if(findIpAddress(mac).length > 0) {
      console.log("[server]set notification for low water on " + mac + " value: " + val);
      database.ref("/users/" + lastUserUID + "/devices/" + mac + "/notifications/lowWater").set(val).catch(error => {
         console.log("[server]bad command");
      });
   } else {
      console.log("[server]invalid parameters value!");
   }
}

//send new soil humidity to firebase
function setSoilHumidityCommand(mac,hum) {
   if(findIpAddress(mac).length > 0) {
      console.log("[server]setSoilHumidityCommand command executed on " + mac + " with humidity of " + hum);
      database.ref("/users/" + lastUserUID + "/devices/" + mac + "/soilHumidity").set(hum.toString()).catch(error => {
         console.log("[server]bad command");
      });
      //ws.send("res|success");
   } else {
      console.log("[server]invalid parameters value!");
      //ws.send("res|invalid params");
   }
}

//send new air humidity to firebase
function setAirHumidityCommand(mac,hum) {
   if(findIpAddress(mac).length > 0) {
      console.log("[server]setAirHumidityCommand command executed on " + mac + " with humidity of " + hum);
      database.ref("/users/" + lastUserUID + "/devices/" + mac + "/airHumidity").set(hum.toString()).catch(error => {
         console.log("[server]bad command");
      });
      //ws.send("res|success");
   } else {
      console.log("[server]invalid parameters value!");
      //ws.send("res|invalid params");
   }
}

//send new target temp info to ESP
function setTargetTempESPCommand(mac,temp,toleranceN,toleranceP) {
   let target = findIpAddress(mac);
   if(target.length > 0) {
      target[0].ws.send("setTargetTemp|" + temp + "|" + toleranceN + "|" + toleranceP);
      return true;
   } else {
      return false;
   }
}

//send new irrigation info to ESP
function setIrrigationESPCommand(mac,fert,water,ratio,total) {
   let target = findIpAddress(mac);
   if(target.length > 0) {
      target[0].ws.send("setIrrigation|" + fert + "|" + water + "|" + ratio + "|" + total);
      return true;
   } else {
      return false;
   }
}

//send new irrigation soil humidity value to ESP
function setIrrigationSoilHumidityESPCommand(mac,val) {
   let target = findIpAddress(mac);
   if(target.length > 0) {
      target[0].ws.send("setIrrigationSoilHumidity|" + val);
      return true;
   } else {
      return false;
   }
}

//#####################################
//             Web interface
//#####################################
app.use('/static',express.static("server_sites/build/static"));
app.use(express.urlencoded({
   extended: true
}));
app.get("/status",(req,resp)=>{
   if(authState === 'SIGNED_IN')
      resp.send(GenerateStatusPage(lastUserName,macToIpAddress));
   else
      resp.send("sing in please <a href='/login'>Login page</a>");
});

app.get("/",(req, resp) => {
   resp.redirect("http://"+appIp+":3300/status");
});

app.get("/login", (req,resp)=>{
   resp.sendFile(path.join(__dirname+"/server_sites/build/index.html"));
});

app.post("/login", (req, resp) => {
   loginUser(req.body.email,req.body.password,resp);
});

app.post("/discDev", (req, resp) => {
   let targetDevice = macToIpAddress.filter(device=>device.mac === req.body.mac);
   targetDevice[0].ws.send("disconnectWiFi");
   resp.redirect("http://"+appIp+":3300/status");
});


app.post("/logout", (req, resp) => {
   auth.signOut().then(()=>{
      resp.redirect("http://"+appIp+":3300/status");
   });
});


server.listen(appPort,appIp, () => {
            console.log(`[server]Example app listening at http://${appIp}:${appPort}`);
         })

//#####################################
//             Exit program
//#####################################
function onExit() {
   db.close((err) => {
      if (err) {
         console.error(err.message);
      }
      console.log('Close the database connection.');
      process.exit();
   });
}

//ctrl+c event
process.on('SIGINT', onExit);

//"kill pid"
process.on('SIGUSR1', onExit);
process.on('SIGUSR2', onExit);

//uncaught exceptions
process.on('uncaughtException', onExit);
