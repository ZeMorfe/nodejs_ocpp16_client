/**
 * Authorize user based on local authorization cache
 * and list. See page 13 in the 1.6 spec for more details.
 * The list has higher priority than the cache.
 * 
 * @param {object} param0 
 */
function authorize({ idTag, authList, authCache }) {
    if (!idTag) {
        return false;
    }

    const isInList = authList.isOnLocal(idTag);
    const isExpiredInList = authList.isExpired(idTag);
    let isAuthorized = false;
    const isNewUser = !isInList;

    if (isNewUser) {
        isAuthorized = isValidInCache(idTag);
        if (!isAuthorized) {
            updateStatus(idTag, authCache);
        }
    } else {
        isAuthorized = !isExpiredInList;
    }

    function isValidInCache(idTag) {
        return isValidLocal(idTag, authCache);
    }

    function isValidLocal(idTag, auth) {
        const isIncluded = auth.isOnLocal(idTag);
        const isStatusValid = auth.isValid(idTag);
        const isExpired = auth.isExpired(idTag);

        if (isIncluded && isStatusValid && !isExpired) {
            return true;
        } else {
            return false;
        }
    }

    function updateStatus(idTag, auth) {
        const isIncluded = auth.isOnLocal(idTag);
        const isStatusValid = auth.isValid(idTag);
        const isExpired = auth.isExpired(idTag);

        if (isIncluded && isStatusValid && isExpired) {
            // update `status` in `idTagInfo`
            let user = auth.get().find(u => u.idTag === idTag) || {};
            let { idTagInfo } = user;
            auth.update(idTag, { ...idTagInfo, status: 'expired' });
        }
    }

    return isAuthorized;
}

module.exports = authorize;
