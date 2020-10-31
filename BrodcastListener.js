module.exports = function BrodcastListener () {
    const dgram = require('dgram');
    const client = dgram.createSocket('udp4');
    const brodcastListenPort = 12345;
    const brodcastSendPort = 2551;

    client.on('listening', function () {
        var address = client.address();
        console.log('[server]UDP Client listening on ' + address.address + ":" + address.port);
        client.setBroadcast(true);
    });

    client.on('message', function (message, rinfo) {
        //console.log('Message from: ' + rinfo.address + ':' + rinfo.port +' - ' + message);
        if (message == "gimme your ip bro") {
            console.log("[server]" + rinfo.address + " wants my IP");
            var bufferNull = Buffer.from([0x00]);
            //var message = Buffer.from("WiFi-login|Kubas445|Kubas4451593572684");
            var message2 = Buffer.from("ok its me");
            message2 = Buffer.concat([message2, bufferNull]);
            client.send(message2, 0, message2.length, brodcastSendPort, rinfo.address, function () {
                console.log("[server]Send '" + message2 + "'");
            });
        }
    });

    client.bind(brodcastListenPort);
}