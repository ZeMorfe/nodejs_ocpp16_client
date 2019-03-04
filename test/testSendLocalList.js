const assert = require('assert');
const authorizationList = require('../src/authorizationList');
const sendLocalList = require('../ocpp/sendLocalList');


describe('SendLocalList Conf', () => {
    let authList;

    beforeEach(() => {
        authList = authorizationList({ type: 'list', version: 1 });
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
    });

    it('full update', () => {
        let user = {
            idTag: '8EBAFJ',
            idTagInfo: {
                expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
                parentIdTag: 5,
                status: 'Accepted'
            }
        };
        let localAuthorizationList = [user];

        let payload = {
            listVersion: 1,
            localAuthorizationList,
            updateType: 'Full'
        };

        sendLocalList.conf(authList, payload);

        assert(authList.get()[0].idTag === user.idTag);
    });

    it('Differential update', () => {
        let user = {
            idTag: '63ela',
            idTagInfo: {
                expiryDate: new Date(new Date().getTime() + 3*60*60*1000).toISOString(),
                parentIdTag: 5,
                status: 'Blocked'
            }
        };
        let localAuthorizationList = [user];

        let payload = {
            listVersion: 1,
            localAuthorizationList,
            updateType: 'Differential'
        };

        sendLocalList.conf(authList, payload);

        assert(authList.get()[1].idTagInfo.status === 'blocked');
    });
})