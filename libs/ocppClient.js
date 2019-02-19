const WebSocket = require('ws');


function OCPPClient({ server, auth, cpProps }, idTag) {
    let msgId = 1;

    const ws = new WebSocket(
        server,
        'ocpp1.6',
        { headers: { Authorization: auth }}
    );

    ws.on('open', function open() {
        msgId += 1;
        const bootNot = [
            2,
            msgId.toString(),
            "BootNotification",
            cpProps
        ];

        ws.send(JSON.stringify(bootNot), function ack(error) { 
            console.log('error', error);
        });
    });

    ws.on("message", function incoming(data) {
        console.log('data', data)
        // console.log(JSON.parse(data));
        // if (JSON.parse(data)[2].status == "Accepted") {
        //     console.log('Accepted')
        // }
    })

    return ws;
}

module.exports = OCPPClient;
