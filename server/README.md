# OCPP Server

This is a modification of BCIT's [OpenOCPP](http://files.mgrid-bcit.ca/download/evid.php) v1.1.1.

The modification runs the MySQL DB and OCPP server separately on two docker containers. The modification aims to provide easier installation and deployment of OpenOCPP and to add smart charging functionality. See [here](./addons/README.md) for more information about the smart charging implementation.

To install:

1. Download the source code (v1.1.1) from BCIT: http://files.mgrid-bcit.ca/download/evid.php and put the `ocpp` folder here.
1. Move the `addons` folder to `ocpp/source`.
1. Add `addons/smart-charging.o` to the end of line 17 in `ocpp/source/makefile` to include smart charging in the `ocpp_server` binary
1. Add smart charging function in `ocpp/source/server/ocpp-server-ocpp.c`:

```c
#include "../addons/smart-charging.h"

...

// add this in the `LWS_CALLBACK_SERVER_WRITEABLE` callback
// after the first `lws_write`
central_smart_charging(cmds[i].cmd, pss);

...

// add this in the `LWS_CALLBACK_RECEIVE` callback
// in the `MessageCallResult` case after the `callresults` function
if (!strcasecmp(callresults[i].cmd, OCPP_CLEARCHARGINGPROFILE)) {
    drop_assigned_txprofile(pss);
}
```
5. Copy `run-ocpp.sh` to `ocpp/`.
1. Update the db host name in `ocpp/evportal/php/incl.php` and `ocpp/config_files/evportal.db` from `localhost` to `ocpp-mysql`
1. Copy `create.sql`, `alter_from_1.1.0.sql`, `enumerated.sql`, `setup_CPO.sql` from `ocpp/sql` to the `sql` folder on root. Note you may need to modify the `create.sql` script to avoid some timestamp error when creating tables.
1. Create a folder named `db` on root for data persistance.
1. Install Docker and Docker Compose
1. Run `docker-compose up` to start the MySQL db and OCPP server
1. Go to `localhost/admin.cgi` on your browser for the admin portal. Log in to create charge points, users and charging profiles.
1. Add a smart charging group using e.g. MySQL workbench (the MySQL container exposes port 3306. See `sql/add_group.sql` for how to add new groups). You may need to look up `chargepointId`, `connectorId` and `chargingProfileId` from the tables `chargepoint` and `chargingProfile`.

The server exposes port 8080 for websocket connections.

Notes:

- If you see error related to SOAP or client during docker build and if you don't need SOAP, remomve all the commands related to SOAP and client in the makefiles
- If the server you setup does not respond to the message from client, try install _libwebsockets_ from git
