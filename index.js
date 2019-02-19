const CP = require('./data/chargepoints');
const OCPPClient = require('./libs/ocppClient');
const config = require('./config');

const server = `${config.OCPPServer}/${CP[0]['name']}`;

const auth = "Basic " + Buffer.from(`${CP[0]['user']}:${CP[0]['pass']}`).toString('base64');

const ws1 = OCPPClient({ server, auth, cpProps: CP[0]['props'] });

console.log('Started one client');
