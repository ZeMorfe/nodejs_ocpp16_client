#include "smart-charging.h"


int central_smart_charging_start(char *cmd, struct per_session_data__ocpp *pss) {
    int transactionId;
    char sql_buffer[64];

    json_object *jobj= json_tokener_parse(pss->Q[pss->Q_a].payload);    
    get_int_from_json(jobj, OCPP_TRANSACTIONID, &transactionId);

    printf("central smart charging\ncmd %s, txId: %d\n", cmd, transactionId);

    strncpy(sql_buffer, "call CENTRAL_SMART_CHARGING_ALL_GROUPS()", sizeof(sql_buffer));

    sql_execute(sql_buffer);

    memset(sql_buffer, 0, sizeof(sql_buffer));

    printf("central smart charging");

    return(0);
}

// add ClearChargingProfile requests to the outboundRequest table
int central_smart_charging_clear(struct per_session_data__ocpp *pss) {
    int transactionId;
    char sql_buffer[128];

    printf("clear charging profiles in group\n");

    json_object *jobj= json_tokener_parse(pss->Q[pss->Q_a].payload);    
    get_int_from_json(jobj, OCPP_TRANSACTIONID, &transactionId);

    printf("Transaction id in clear %d\n", transactionId);

    sprintf(sql_buffer, "call CENTRAL_SMART_CHARGING_CLEAR(%d)", transactionId);

    sql_execute(sql_buffer);

    memset(sql_buffer, 0, sizeof(sql_buffer));

    printf("done smart charging clear");

    return(0);
}

// delete assigned profile in chargingProfileAssigned
int drop_assigned_txprofile(struct per_session_data__ocpp *pss) {
    char cp[40];
    int connectorId;
    int chargingProfileId;
    json_object *payload;
    char sql_buffer[128];

    printf("drop assigned profile\n");

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
