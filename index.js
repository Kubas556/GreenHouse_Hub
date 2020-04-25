const express = require("express");
var admin = require("firebase-admin");
var account = require("./serviceAccount.json");
const app = express();
const port = 3000;

admin.initializeApp({
   credential:admin.credential.cert(account),
   databaseURL: "https://my-website-c179c.firebaseio.com"
});

let temp = 0;

admin.database().ref("greenhouse/temp").on("value",data=>{
   temp = data.val();
});

app.get("/setTemp",(req,res)=>{
   let temp = Number.parseInt(req.query.temp);
   if(isNaN(temp)) {
      res.send("bad request");
   } else {
      admin.database().ref('/greenhouse').child("temp").set(temp);
      res.send("temp set to " + temp);
   }
});

app.get("/",(req,resp)=>{
   resp.send("temp "+ temp);
});

app.listen(port,()=>console.log("started on port "+port));