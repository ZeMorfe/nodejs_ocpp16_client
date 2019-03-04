const assert = require('assert');
const authorizationList = require('../src/authorizationList');
const authorize = require('../ocpp/authorize');

describe('authorizatoin list', () => {
    let authList = [];

    before(() => {
        authList = authorizationList({ type: 'list' });
        const idTagInfo = {
            expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
            parentIdTag: 5,
            status: 'Accepted'
        };
        const idTag = '920EB';
        authList.add(idTag, idTagInfo);
    });

    it('add new user to list', () => {
        const idTag = '920EB';
        const list = authList.get();
        const isInList = list.some(u => u.idTag === idTag);

        assert(isInList);
    });

    it('update user', () => {
        const idTagInfo = {
            expiryDate: new Date().toISOString(),
            parentIdTag: 5,
            status: 'Expired'
        };
        const idTag = '920EB';
        authList.update(idTag, idTagInfo);
        const user = authList.get().find(u => u.idTag === idTag);

        assert(user.idTagInfo.status === 'expired');
    });

    it('remove user', () => {
        const idTag = '920EB';
        authList.remove(idTag);
        const user = authList.get().find(u => u.idTag === idTag);

        assert(!user);
    });

    it('is expired', () => {
        const idTag = '920EB';

        assert(authList.isExpired(idTag) === true);
    });

    it('remove oldest entry if list/cache is full', () => {
        const authList = authorizationList({ type: 'list', MAX_LENGTH: 2 });
        const users = [
            {
                idTag: '920EB',
                idTagInfo: {
                    expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
                    parentIdTag: 5,
                    status: 'Accepted'
                }
            },
            {
                idTag: '63ela',
                idTagInfo: {
                    expiryDate: new Date(new Date().getTime() + 2*60*60*1000).toISOString(),
                    parentIdTag: 5,
                    status: 'Accepted'
                }
            }
        ];
        users.forEach(u => authList.add(u.idTag, u.idTagInfo));

        const newUser = {
            idTag: 'JEAB9',
            idTagInfo: {
                expiryDate: new Date(new Date().getTime() + 1*60*60*1000).toISOString(),
                parentIdTag: 5,
                status: 'Accepted'
            }
        };
        authList.add(newUser.idTag, newUser.idTagInfo);

        const idTagsInList = authList.get().map(u => u.idTag);

        assert(idTagsInList.length === 2);
        assert(idTagsInList.includes(newUser.idTag));
        assert(idTagsInList.includes(users[0].idTag));
    });

    it('remove user with invalid status if list/cache is full', () => {
        const authList = authorizationList({ type: 'list', MAX_LENGTH: 2 });
        const users = [
            {
                idTag: '920EB',
                idTagInfo: {
                    expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
                    parentIdTag: 5,
                    status: 'Invalid'
                }
            },
            {
                idTag: '63ela',
                idTagInfo: {
                    expiryDate: new Date(new Date().getTime() + 2*60*60*1000).toISOString(),
                    parentIdTag: 5,
                    status: 'Accepted'
                }
            }
        ];
        users.forEach(u => authList.add(u.idTag, u.idTagInfo));

        const newUser = {
            idTag: 'JEAB9',
            idTagInfo: {
                expiryDate: new Date(new Date().getTime() + 1*60*60*1000).toISOString(),
                parentIdTag: 5,
                status: 'Accepted'
            }
        };
        authList.add(newUser.idTag, newUser.idTagInfo);

        const idTagsInList = authList.get().map(u => u.idTag);

        assert(idTagsInList.length === 2);
        assert(idTagsInList.includes(newUser.idTag));
        assert(idTagsInList.includes(users[1].idTag));
    });
});

describe('authorize', () => {

    const authList = authorizationList({ type: 'list' });
    const idTagInfo = {
        expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
        parentIdTag: 5,
        status: 'Accepted'
    };
    const idTag = '920EB';
    authList.add(idTag, idTagInfo);

    it('authorized by list', () => {
        const idTag = '920EB';
        const authCache = authorizationList({ type: 'cache' });

        const isAuthorized = authorize({ idTag, authList, authCache });

        assert(isAuthorized === true);
    });

    it('authorized by cache', () => {
        const idTag = 'OUE923';
        const authCache = authorizationList({ type: 'cache' });
        const idTagInfo = {
            expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
            parentIdTag: 5,
            status: 'Accepted'
        };
        authCache.add(idTag, idTagInfo);

        const isAuthorized = authorize({ idTag, authList, authCache });

        assert(isAuthorized === true);
    });

    it('not authorized', () => {
        const idTag = 'OUE923';
        const authCache = authorizationList({ type: 'cache' });
        const idTagInfo = {
            expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
            parentIdTag: 5,
            status: 'Accepted'
        };
        authCache.add(idTag, idTagInfo);

        const isAuthorized = authorize({ idTag: 'foo', authList, authCache });

        assert(isAuthorized === false);
    });

    it('list has higher priority', () => {
        const idTag = 'OUE923';
        const authCache = authorizationList({ type: 'cache' });
        const idTagInfo = {
            expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
            parentIdTag: 5,
            status: 'Accepted'
        };
        authCache.add(idTag, idTagInfo);

        const authList = authorizationList({ type: 'list' });
        const idTagInfoList = {
            expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
            parentIdTag: 5,
            status: 'Invalid'
        };
        authList.add(idTag, idTagInfoList);

        const isAuthorized = authorize({ idTag: 'foo', authList, authCache });

        assert(isAuthorized === false);
    })
});
