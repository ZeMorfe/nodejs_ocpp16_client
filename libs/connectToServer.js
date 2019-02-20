const CP = require('../data/chargepoints');
const OCPPClient = require('./ocppClient');
const config = require('../config');

function connectToServer() {
    const server = `${config.OCPPServer}/${CP[0]['name']}`;

    const auth = "Basic " + Buffer.from(`${CP[0]['user']}:${CP[0]['pass']}`).toString('base64');

    const ws = OCPPClient({ server, auth, cpProps: CP[0]['props'] });

    console.log('Started one client');

    return ws;
}

module.exports = connectToServer;
