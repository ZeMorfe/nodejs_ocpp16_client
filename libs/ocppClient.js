const WebSocket = require('ws');
const config = require('../config');

function OCPPClient(CP, handleConf=()=>{}) {
    let msgId = 1;

    const server = `${config.OCPPServer}/${CP['name']}`;
    const auth = "Basic " + Buffer.from(`${CP['user']}:${CP['pass']}`).toString('base64');

    function getMsgId() {
        return msgId.toString();
    }

    function incMsgId() {
        msgId += 1;
    }

    const ws = new WebSocket(
        server,
        'ocpp1.6',
        { headers: { Authorization: auth }}
    );

    ws.on('open', function open() {
        console.log('ws client open');
    });

    ws.on("message", function incoming(data) {
        console.log('data', data)
        // console.log(JSON.parse(data));
        // if (JSON.parse(data)[2].status == "Accepted") {
        //     console.log('Accepted')
        // }
        handleConf(data);
    })

    return { ws, getMsgId };
}

module.exports = OCPPClient;
