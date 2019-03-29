/**
 * Mock-up of authorization list/cache.
 * See page 13 of the 1.6 spec for more details.
 */

const statusMap = {
    /**
     * Definitions per page 13 of the OCPP 1.6 spec.
     * Use the same definitions for both list and cache.
     */
    'Accepted': 'valid',
    'ConcurrentTx': 'valid',
    'Expired': 'expired',
    'Blocked': 'blocked',
    'Invalid': 'blacklisted'
};

function authorizationList({ type = 'list', version = 1, MAX_LENGTH = 10 }) {
    let list = { version, users: [] };

    function getVersion() {
        // see section 5.10 on page 49 in the spec
        return (list.users.length > 0) ? list.version : 0;
    }

    function setVersion(v) {
        list.version = v;
    }

    function get() {
        return [...list.users];
    }

    function add(idTag, { expiryDate, parentIdTag, status }) {
        let newUser = {
            idTag,
            idTagInfo: {
                expiryDate,
                parentIdTag,
                status: statusMap[status]
            }
        };

        if (list.users.length >= MAX_LENGTH) {
            handleListOverflow();
        }

        list.users.push(newUser);
        console.log(`Added user to authorization ${type}`);
    }

    function update(idTag, idTagInfo) {
        let user = list.users.find(u => u.idTag === idTag);
        if (user) {
            user.idTagInfo = {
                ...idTagInfo,
                status: statusMap[idTagInfo.status] || idTagInfo.status
            };
            console.log(`Updated user in authorization ${type}`);
        } else {
            add(idTag, idTagInfo);
        }
    }

    function fullUpdate(newVersion, newList) {
        // per page 94-95 in the OCPP 1.6 spec
        if (newVersion !== list.version) {
            return 'VersionMismatch';
        }
        if (list.version === -1) {
            return 'NotSupported';
        }

        try {
            list.version = newVersion;
            list.users = [...newList];
            console.log('Local authorization list updated');
            return 'Accepted';
        } catch (e) {
            console.log(e);
            return 'Failed';
        }
    }

    function differentialUpdate(newVersion, differentialList) {
        // per page 94-95 in the OCPP 1.6 spec
        if (newVersion !== list.version) {
            return 'VersionMismatch';
        }
        if (list.version === -1) {
            return 'NotSupported';
        }

        try {
            list.version = newVersion;
            differentialList.forEach(userNext => {
                update(userNext.idTag, userNext.idTagInfo);
            })
            console.log('Local authorization list updated');
            return 'Accepted';
        } catch (e) {
            console.log(e);
            return 'Failed';
        }
    }

    function handleListOverflow() {
        let invalidUserIdx = list.users.findIndex(u => u.idTagInfo.status !== 'valid');

        if (invalidUserIdx > -1) {
            list.users.splice(invalidUserIdx, 1);
        } else {
            let inactiveUserIdx = list.users.reduce((res, user, idx, arr) => {
                let earliestExpiryDate = new Date(arr[res].idTagInfo.expiryDate);
                if (new Date(user.idTagInfo.expiryDate) < earliestExpiryDate) {
                    return idx;
                } else {
                    return res;
                }
            }, 0);
            list.users.splice(inactiveUserIdx, 1);
        }
    }

    function remove(idTag) {
        let userIdx = list.users.findIndex(u => u.idTag === idTag);
        if (userIdx > -1) {
            list.users.splice(userIdx, 1);
            console.log(`Removed user from authorization ${type}`);
        }
    }

    function isExpired(idTag) {
        const now = new Date();
        const user = list.users.find(u => u.idTag === idTag);
        if (!user) {
            return true;
        }

        return new Date(user.idTagInfo.expiryDate) < now;
    }

    function isValid(idTag) {
        const user = list.users.find(u => u.idTag === idTag);

        return user && user.idTagInfo.status === 'valid';
    }

    function isOnLocal(idTag) {
        return list.users.some(u => u.idTag === idTag);
    }

    return {
        getVersion,
        get,
        add,
        update,
        fullUpdate,
        differentialUpdate,
        remove,
        isExpired,
        isOnLocal,
        isValid
    };
};

module.exports = authorizationList;
