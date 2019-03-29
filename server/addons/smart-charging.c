/*
 * Smart charging per section 3.13 in the OCPP 1.6 specs.
 * 
 * The implementation only covers the Central Smart Charging use case
 * (3.13.4 Central Smart Charging) where the central system assigns charging profile
 * on the chargepoint level.
 * 
 * The implementation assumes chargepoints share the same circuit are stored in 
 * the same `smart charging group` on the central system.
 * 
 * Central Smart Charging starts when all the chargepoints in a smart charging group
 * are in use. Central Smart Charging stops when at least one chargepoint stops the
 * transaction.
 * 
 * The charging profiles are `TxProfile` typed, meaning they are deleted, per the
 * OCPP specs, by `setChargingProfile` requests from the server, from each
 * chargepoint after the transaction is done.
 * 
 * The implementation is built on top of BCIT's OpenOCPP v1.1.1. Changes may be
 * required for a different version of OpenOCPP.
 */

#include "smart-charging.h"


int central_smart_charging(char *cmd, struct per_session_data__ocpp *pss) {
    int transactionId;
    char sql_buffer[128];

    json_object *jobj= json_tokener_parse(pss->Q[pss->Q_a].payload);    
    get_int_from_json(jobj, OCPP_TRANSACTIONID, &transactionId);

    printf("Central Smart Charging input\ncmd %s, txId: %d\n", cmd, transactionId);

    if (!strcasecmp(cmd, OCPP_STARTTRANSACTION)) {
        printf("Starting smart charging\n");
        strncpy(sql_buffer, "call CENTRAL_SMART_CHARGING_ALL_GROUPS()", sizeof(sql_buffer));
        sql_execute(sql_buffer);
    } else if (!strcasecmp(cmd, OCPP_STOPTRANSACTION)) {
        printf("Clearing charging profile\n");
        sprintf(sql_buffer, "call CENTRAL_SMART_CHARGING_CLEAR(%d)", transactionId);
        sql_execute(sql_buffer);
    }

    memset(sql_buffer, 0, sizeof(sql_buffer));

    return(0);
}

/*
 * Delete assigned profile (`TxProfile` typed) in `chargingProfileAssigned`
 * when a transaction finishes.
 */
int drop_assigned_txprofile(struct per_session_data__ocpp *pss) {
    char cp[40];  // HTTP_CP
    int connectorId;
    int chargingProfileId;
    json_object *payload;
    char sql_buffer[128];

    printf("Drop assigned profile\n");

    strncpy(cp, pss->CP, sizeof(cp));
    payload = json_tokener_parse(pss->Q[pss->Q_a].payload);
    get_int_from_json(payload, OCPP_CONNECTORID, &connectorId);
    get_int_from_json(payload, "id", &chargingProfileId);

    printf("cp %s\n", cp);
    printf("payload %s\n", pss->Q[pss->Q_a].payload);
    printf("connectorId %d, chargingProfileId %d\n", connectorId, chargingProfileId);

    sprintf(
        sql_buffer,
        "call CENTRAL_SMART_CHARGING_DROP_ASSIGNED_TXPROFILE(\"%s\", %d, %d)",
        cp, connectorId, chargingProfileId
    );
    sql_execute(sql_buffer);

    memset(sql_buffer, 0, sizeof(sql_buffer));
    memset(cp, 0, sizeof(cp));

    return(0);
}
