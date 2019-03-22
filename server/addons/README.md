# Smart charging

Smart charging implementation on BCIT's OpenOCPP v1.1.1. Download OpenOCPP from [here](http://files.mgrid-bcit.ca/download/evid.php).

The implementation only covers the _Central Smart Charging_ scenario (see OCPP 1.6 specs for more details) when the central system balances the load between Level-2 charge points using `TxProfile` typed charging profiles.

Smart charging is implemented in SQL procedures and the C code only invokes the procedures. This allows live update of the procedures without recompiling the OpenOCPP server.

## How it works

Smart charging is initiated when all the charge points in a smart _charging group_ are in use. You need to define, in a MySQL table, the smart charging group and the charging profile on each charge point. The central system sends a `SetChargingProfile` request to each charge point and adds the profiles to the `chargingProfileAssigned` table. Note the profiles are `TxProfile` typed, meaning they should be cleared after transaction.

When a charge point in the group stops transaction, the central system sends a `ClearChargingProfile` request to each charge point in the group.

The composition of profiles, `ChargePointMaxProfile` and `TxDefaultProfile`/`TxProfile`, are implemented on the client side following the OCPP specs.

## Installation

1. Download and install OpenOCPP
1. Create an `addons` folder in `source` in the OpenOCPP download
1. Copy `smart-charging.c` and `smart-charging.h` to the `addons` folder
1. add `addons/smart-charging.o` to the end of line 17 in `source/makefile` to include smart charging in the `ocpp_server` binary
1. add procedure invocation in `source/server/ocpp-server-ocpp.c`:

```c
#include "../addons/smart-charging.h"

...

// add this in the `LWS_CALLBACK_SERVER_WRITEABLE` callback
// after the first `lws_write`
central_smart_charging(cmds[i].cmd, pss);

// add this in the `LWS_CALLBACK_RECEIVE` callback
// in the `MessageCallResult` case after the `callresults` function
if (!strcasecmp(callresults[i].cmd, OCPP_CLEARCHARGINGPROFILE)) {
    drop_assigned_txprofile(pss);
}
```

6. recompile and start the ocpp server
7. run `cat smart_charging.sql | mysql -uocpp -pocpp ocpp` to load the SQL procedures that implement smart charging
8. add smart charging groups to `centralSmartChargingGroup` and `chargepointGroup` tables. The charge points in the same group are assumed to, virtually, share the same circuit. Smart charging is only triggered when all the charge points in a group are in use
