/**
 * Update local authorization list
 * @param {object} authList list version and users on local list
 * @param {object} param1 payload from server's `SendLocalList.req`
 */
function conf(authList, { listVersion, localAuthorizationList, updateType }) {
    let updateStatus;

    switch (updateType) {
        case 'Full':
            updateStatus = authList.fullUpdate(listVersion, localAuthorizationList);
            break;
        case 'Differential':
            updateStatus = authList.differentialUpdate(listVersion, localAuthorizationList);
            break;
        default:
            console.log('Unknown update type. No op');
            updateStatus = 'Failed';
    }

    const payloadConf = { status: updateStatus };

    return payloadConf;
}

module.exports.conf = conf;
