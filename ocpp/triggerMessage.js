
function conf({ connectorId, requestedMessage }) {
    let implemented = false;

    switch (requestedMessage) {
        case 'BootNotification':
            implemented = true;
            break;
        case 'DiagnosticsStatusNotification':
        case 'FirmwareStatusNotification':
        case 'Heartbeat':
        case 'MeterValues':
        case 'StatusNotification':
        default:
            console.log('Not implemented');
    }

    return implemented;
}

module.exports.conf = conf;
