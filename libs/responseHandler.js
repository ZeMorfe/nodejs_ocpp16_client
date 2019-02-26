const chargePointRequests = require('./chargePointRequests');

function responseHandler(wsBrowser, wsOcppClient, response) {
    function handleCall() {
        console.log('Handling server call');
    }

    function handleCallResult() {
        console.log('Handling call result');
        const [messageType, messageId, payload] = response;
        const isAccepted = payload.status === 'Accepted';
    }

    function handleCallError() {
        console.log('Handling call error');
    }

    return { handleCall, handleCallResult, handleCallError };
}

module.exports = responseHandler;
