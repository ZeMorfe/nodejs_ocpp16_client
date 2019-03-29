# Smart charging

Smart charging implementation on BCIT's OpenOCPP v1.1.1. Download OpenOCPP from [here](http://files.mgrid-bcit.ca/download/evid.php).

The implementation only covers the _Central Smart Charging_ scenario (see OCPP 1.6 specs for more details) when the central system balances the load between Level-2 charge points using `TxProfile` typed charging profiles.

Smart charging is implemented in SQL procedures and the C code only invokes the procedures. This allows live update of the procedures without recompiling the OpenOCPP server.

## How it works

Logics are implemented in `sql/smart_charging.sql` as sql procedures. `ocpp-server-ocpp.c` invokes the procedures in LWS writeable and receive callbacks.

The number of active transactions and number of connectors in a smart charging group determine when to start smart charging. You need to create a smart charging group with a `TxProfile` to be applied to each connector in the group. E.g. if you have two single-port charge points in the group, the limit of the profile should be half of the total limit.

The `TxProfile` should have a relative start time (i.e. starts when a transaction starts). The duration can be 0 since the profile will be deleted after the transaction. You need to define a charging period for the limit. The period can have a delayed start time but it should be 0 if you want start the limit right after the transaction starts.

In `StartTransaction` event, the server checks if all the connectors in the smart charging group are in use. If so, it adds two `SetChargingProfile` requests to the `outboundRequest` table (one request for each charge point). On the next LWS writeable event, it sends the `SetChargingProfile` requests to the OCPP client.

In `StopTransaction` event, if the connectors have ongoing TxProfile, the server adds two `ClearChargingProfile` requests to `outboundRequest` which are sent to the OCPP client on the next LWS writeable callback.

Once the client acknowledges the `ClearChargingProfile` request and responds with `ClearChargingProfile` confirmation, the server removes the assigned TxProfile from the table `chargingProfileAssigned`. Charging profiles, e.g. max or default profiles, in `chargingProfileAssigned` will be sent to the OCPP client when the client reconnects to the server.

The OCPP client stores all the assigned charging profiles and computes the composite profile that combines `ChargePointMaxProfile`, `TxDefaultProfile` and `TxProfile`. Real-time charging limit, e.g. amperage, is the limit in the composite profile at the current time. The client sets up schedulers for all the limit changes in the composite profile. E.g. if you setup a default profile with aboslute start time at 9am, a scheduler will update the limit at 9am.

## Add smart charging group

1. Create two charge points and users and a `TxProfile` from the admin portal `localhost/admin.cgi`. The `TxProfile` should have a relative start time so it's applied right after a transaction starts. The duration can be 0 since the profile will be cleared after the transaction. You also need to create a charging period with a current limit (amperage). The start time of the period should be 0 if you want the limit to apply at the start of the transaction.
1. Look up `chargepointId`, `connectorId` and `chargingProfileId` from the tables `chargepoint` and `chargingProfile`.
1. Create a new smart charging group following the example in `sql/add_group.sql`. The charge point connectors in the same group are assumed to, virtually, share the same circuit. Smart charging is only triggered when all the charge point connectors in a group are in use.
