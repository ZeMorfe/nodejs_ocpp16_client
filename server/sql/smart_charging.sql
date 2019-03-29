/*
 * Central Smart Charging
 * MySQL 5.7
 */

DROP TABLE IF EXISTS centralSmartChargingGroup;
CREATE TABLE centralSmartChargingGroup (
    groupId INT NOT NULL AUTO_INCREMENT,
    chargingProfileId INT NOT NULL,  -- to be applied to each connector
    PRIMARY KEY (groupId)

    -- CONSTRAINT chargingProfile_id
    -- FOREIGN KEY (chargingProfileId)
    -- REFERENCES chargingProfile (chargingProfileId)
    -- ON UPDATE CASCADE
    -- ON DELETE CASCADE
);

DROP TABLE IF EXISTS chargepointGroup;
CREATE TABLE chargepointGroup (
    chargepointId INT NOT NULL,
    connectorId INT NOT NULL,
    groupId INT NOT NULL,
    PRIMARY KEY (chargepointId, connectorId, groupId)

    -- CONSTRAINT chargepoint_id
    -- FOREIGN KEY (chargepointId)
    -- REFERENCES chargepoint (chargepointId)
    -- ON UPDATE CASCADE
    -- ON DELETE CASCADE,

    -- CONSTRAINT group_id
    -- FOREIGN KEY (groupId)
    -- REFERENCES centralSmartChargingGroup (groupId)
    -- ON UPDATE CASCADE
    -- ON DELETE CASCADE
);


DROP FUNCTION IF EXISTS `isInOutboundRequest`;
DELIMITER $$
CREATE FUNCTION `isInOutboundRequest` (
    chargepointId INT, connectorId INT, chargingProfileId INT
) RETURNS INT
BEGIN
    DECLARE ret INT DEFAULT 0;

    IF EXISTS(
        SELECT * FROM outboundRequest r
        WHERE r.requestTypeId = requestTypeId('SetChargingProfile')
        AND r.chargepointId = chargepointId
        AND r.connectorId = connectorId
        AND r.chargingProfileId = chargingProfileId
    ) THEN
        SET ret = 1;
    END IF;

    return ret;
END
$$
DELIMITER ;

DROP FUNCTION IF EXISTS `isChargingProfileAssigned`;
DELIMITER $$
CREATE FUNCTION `isChargingProfileAssigned` (
    chargingProfileId INT, chargepointId INT, connectorId INT
) RETURNS INT
BEGIN
    DECLARE ret INT DEFAULT 0;

    IF EXISTS(
        SELECT * FROM chargingProfileAssigned p
        WHERE p.chargepointId = chargepointId
        AND p.connectorId = connectorId
        AND p.chargingProfileId = chargingProfileId
    ) THEN
        SET ret = 1;
    END IF;

    return ret;
END
$$
DELIMITER ;

DROP FUNCTION IF EXISTS `getNumOfConnectorsInGroup`;
DELIMITER $$
CREATE FUNCTION `getNumOfConnectorsInGroup` (
    groupId INT
) RETURNS INT
BEGIN
    DECLARE n INT DEFAULT 0;

    SELECT COUNT(*) INTO n
    FROM chargepointGroup cpg WHERE cpg.groupId = groupId;

    return n;
END
$$
DELIMITER ;

DROP FUNCTION IF EXISTS `getNumOfActiveTxInGroup`;
DELIMITER $$
CREATE FUNCTION `getNumOfActiveTxInGroup` (
    groupId INT
) RETURNS INT
BEGIN
    DECLARE n INT DEFAULT 0;

    SELECT COUNT(DISTINCT chargepointId)
    INTO n
    FROM transactionLog
    WHERE terminateReasonId = 1
    AND chargepointId IN (
        SELECT g.chargepointId FROM chargepointGroup g
        WHERE g.groupId = groupId
    );

    return n;
END
$$
DELIMITER ;


/* Central smart charging */
DROP PROCEDURE IF EXISTS CENTRAL_SMART_CHARGING;
DELIMITER $$
CREATE PROCEDURE CENTRAL_SMART_CHARGING (
    IN groupId INT
)
BEGIN
    DECLARE numOfConnectors INT DEFAULT 0;
    DECLARE numOfActiveTx INT DEFAULT 0;
    DECLARE r_cp VARCHAR(20);
    DECLARE r_chargingProfileId INT;
    DECLARE r_connectorId INT;
    DECLARE r_transactionId INT;
    DECLARE v_finished INT DEFAULT 0;
    DECLARE v_chargepointId INT;
    DECLARE v_chargingProfileId INT;
    DECLARE v_portId INT;
    DECLARE v_transactionLogId INT;
    DECLARE isInOutboundReq INT DEFAULT 1;
    DECLARE isAssigned INT DEFAULT 1;
    DECLARE s INT;
    DECLARE cpCursor CURSOR FOR (
        SELECT tl.chargepointId, tl.portId, tl.transactionLogId
        FROM transactionLog tl
        WHERE terminateReasonId = 1  -- Not Terminated
        AND tl.chargepointId IN (
            SELECT cpg.chargepointId FROM chargepointGroup cpg
            WHERE cpg.groupId = groupId
        )
    );
    DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;

    -- number of connectors in the group
    SELECT COUNT(*) INTO numOfConnectors
    FROM chargepointGroup cpg WHERE cpg.groupId = groupId;

    -- number of active transactions related to the group
    SELECT COUNT(DISTINCT chargepointId) INTO numOfActiveTx
    FROM transactionLog
    WHERE terminateReasonId = 1  -- Not Terminated
    AND chargepointId IN (
        SELECT g.chargepointId FROM chargepointGroup g
        WHERE g.groupId = groupId
    );

    -- apply when all chargepoints in the group are in use
    IF numOfActiveTx >= numOfConnectors THEN
        OPEN cpCursor;
        
        -- set TxProfile for each connector (connectorId must be > 0)
        setChargingProfile: LOOP

        FETCH cpCursor INTO v_chargepointId, v_portId, v_transactionLogId;
        
        IF v_finished = 1 THEN
            LEAVE setChargingProfile;
        END IF;

        -- set cp
        SELECT HTTP_CP INTO r_cp FROM chargepoint
        WHERE chargepointId = v_chargepointId;

        -- set connector id (different from port id)
        SELECT p.connectorId INTO r_connectorId FROM `port` p
        WHERE p.portId = v_portId;

        -- set profile id
        SELECT g.chargingProfileId INTO r_chargingProfileId
        FROM centralSmartChargingGroup g
        WHERE g.groupId = groupId;

        -- set transaction id (same as transactionLogId)
        SET r_transactionId = v_transactionLogId;

        SET isAssigned = isChargingProfileAssigned(
            r_chargingProfileId, v_chargepointId, r_connectorId
        );
        SET isInOutboundReq = isInOutboundRequest(
            v_chargepointId, r_connectorId, r_chargingProfileId
        );

        -- add to charging profile assigned
        IF isAssigned = 0 THEN
            REPLACE INTO chargingProfileAssigned(chargepointId,connectorId,chargingProfileId)
            VALUES (v_chargepointId, r_connectorId, r_chargingProfileId);
        END IF;

        -- add to outbound request
        IF isInOutboundReq = 0 THEN
            /*
             * `SET_CHARGING_PROFILE` is a stored procedure from OpenOCPP v1.1.1
             * that adds the `setChargingProfile` request to `outboundRequest`
             */
            CALL SET_CHARGING_PROFILE(
                r_cp, r_connectorId, r_chargingProfileId, r_transactionId, s
            );
        END IF;

        END LOOP setChargingProfile;
        CLOSE cpCursor;
    END IF;
END;
$$
DELIMITER ;


DROP PROCEDURE IF EXISTS CENTRAL_SMART_CHARGING_ALL_GROUPS;
DELIMITER $$
CREATE PROCEDURE CENTRAL_SMART_CHARGING_ALL_GROUPS()
BEGIN
    DECLARE v_finished INT DEFAULT 0;
    DECLARE v_groupId INT;
    DECLARE groupCursor CURSOR FOR (
        SELECT DISTINCT groupId FROM centralSmartChargingGroup
    );
    DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;

    OPEN groupCursor;
    applySmartChargingToAllGroups: LOOP

        FETCH groupCursor INTO v_groupId;

        IF v_finished = 1 THEN
            LEAVE applySmartChargingToAllGroups;
        END IF;

        CALL CENTRAL_SMART_CHARGING(v_groupId);

    END LOOP applySmartChargingToAllGroups;
    CLOSE groupCursor;
END
$$
DELIMITER ;


DROP FUNCTION IF EXISTS `getSmartChargingGroupByTxId`;
DELIMITER $$
CREATE FUNCTION `getSmartChargingGroupByTxId` (
    txId INT
) RETURNS INT
BEGIN
    DECLARE cpId INT DEFAULT 0;
    DECLARE groupId INT DEFAULT 0;

    SELECT chargepointId
    INTO  cpId
    FROM transactionLog
    WHERE transactionLogId = txId;

    IF cpId > 0 THEN
        SELECT cpg.groupId
        INTO groupId
        FROM chargepointGroup cpg
        WHERE cpg.chargepointId = cpId;
    END IF;

    return groupId;
END
$$
DELIMITER ;

/*
 * Note this function should only be called in stop transaction req
 * and after the server updates `transactionLog`. This ensures the last
 * log item corresponds to the stop transaction req.
 */
DROP FUNCTION IF EXISTS `getSmartChargingGroupFromLastTx`;
DELIMITER $$
CREATE FUNCTION `getSmartChargingGroupFromLastTx` ()
RETURNS INT
BEGIN
    DECLARE cpId INT DEFAULT 0;
    DECLARE groupId INT DEFAULT 0;

    SELECT chargepointId
    INTO  cpId
    FROM transactionLog
    ORDER BY timestampStop DESC
    LIMIT 1;

    IF cpId > 0 THEN
        SELECT cpg.groupId
        INTO groupId
        FROM chargepointGroup cpg
        WHERE cpg.chargepointId = cpId;
    END IF;

    return groupId;
END
$$
DELIMITER ;


DROP PROCEDURE IF EXISTS `CENTRAL_SMART_CHARGING_CLEAR`;
DELIMITER $$
CREATE PROCEDURE `CENTRAL_SMART_CHARGING_CLEAR`(
    IN txId INT
)
BEGIN
    DECLARE transactionId INT;
    DECLARE chargepointId INT;
    DECLARE cp VARCHAR(20);
    DECLARE portId INT;
    DECLARE connectorId INT;
    DECLARE groupId INT;
    DECLARE chargingProfileId INT DEFAULT 0;
    DECLARE chargingProfilePurposeTypeId INT;
    DECLARE TxProfile INT;
    DECLARE numOfCpsInGroup INT DEFAULT 0;
    DECLARE numOfActiveTxInGroup INT DEFAULT 0;
    DECLARE s VARCHAR(20);

    SET TxProfile = 3;  -- see chargingProfilePurposeType

    IF txId > 0 THEN
        -- if transaction id is provided by the server
        SET groupId = getSmartChargingGroupByTxId(txId);

        SELECT tl.transactionLogId, tl.chargepointId, tl.portId
        INTO  transactionId, chargepointId, portId
        FROM transactionLog tl
        WHERE tl.transactionLogId = txId;
    ELSE
        SET groupId = getSmartChargingGroupFromLastTx();
        
        SELECT tl.transactionLogId, tl.chargepointId, tl.portId
        INTO transactionId, chargepointId, portId
        FROM transactionLog tl
        ORDER BY tl.timestampStop DESC LIMIT 1;
    END IF;

    SELECT p.connectorId INTO connectorId
    FROM port p
    WHERE p.portId = portId;

    SELECT cpa.chargingProfileId INTO chargingProfileId
    FROM chargingProfileAssigned cpa
    WHERE cpa.chargepointId = chargepointId
    AND cpa.connectorId = connectorId;

    SELECT cprofile.chargingProfilePurposeTypeId INTO chargingProfilePurposeTypeId
    FROM chargingProfile cprofile
    WHERE cprofile.chargingProfileId = chargingProfileId;

    -- TxProfile only
    IF chargingProfileId > 0 AND chargingProfilePurposeTypeId = TxProfile THEN
        SET numOfCpsInGroup = getNumOfConnectorsInGroup(groupId);
        SET numOfActiveTxInGroup = getNumOfActiveTxInGroup(groupId);

        SELECT c.HTTP_CP INTO cp
        FROM chargepoint c
        WHERE c.chargepointId = chargepointId;

        /*
         * Add a `claerChargingProfile` request to `outboundRequest` for
         * the cp requested stop transaction
         */
        CALL CLEAR_CHARGING_PROFILE(cp, connectorId, chargingProfileId, s);

        IF (numOfActiveTxInGroup + 1 <= numOfCpsInGroup) THEN
            /* Drop profiles on all other cps in the group */
            CALL CLEAR_OTHER_TXPROFILES_IN_GROUP(groupId);
        END IF;
    END IF;

END
$$
DELIMITER ;

DROP PROCEDURE IF EXISTS `CLEAR_OTHER_TXPROFILES_IN_GROUP`;
DELIMITER $$
CREATE PROCEDURE `CLEAR_OTHER_TXPROFILES_IN_GROUP`(
    IN groupId INT
)
BEGIN
    DECLARE cp VARCHAR(20);
    DECLARE connectorId INT;
    DECLARE chargingProfileId INT DEFAULT 0;
    DECLARE chargingProfilePurposeTypeId INT;
    DECLARE v_chargepointId INT;
    DECLARE v_portId INT;
    DECLARE v_finished INT DEFAULT 0;
    DECLARE s VARCHAR(20);
    DECLARE cpCursor CURSOR FOR (
        SELECT tl.chargepointId, tl.portId
        FROM transactionLog tl
        WHERE terminateReasonId = 1  -- Not Terminated
        AND tl.chargepointId IN (
            SELECT cpg.chargepointId FROM chargepointGroup cpg
            WHERE cpg.groupId = groupId
        )
    );
    DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;

    OPEN cpCursor;
    clearOtherTxProfiles: LOOP

        FETCH cpCursor INTO v_chargepointId, v_portId;

        IF v_finished = 1 THEN
            LEAVE clearOtherTxProfiles;
        END IF;

        SELECT c.HTTP_CP INTO cp
        FROM chargepoint c
        WHERE c.chargepointId = v_chargepointId;

        SELECT p.connectorId INTO connectorId
        FROM port p
        WHERE p.portId = v_portId;

        SELECT cpa.chargingProfileId INTO chargingProfileId
        FROM chargingProfileAssigned cpa
        WHERE cpa.chargepointId = v_chargepointId
        AND cpa.connectorId = connectorId;

        SELECT cprofile.chargingProfilePurposeTypeId INTO chargingProfilePurposeTypeId
        FROM chargingProfile cprofile
        WHERE cprofile.chargingProfileId = chargingProfileId;

        CALL CLEAR_CHARGING_PROFILE(cp, connectorId, chargingProfileId, s);

    END LOOP clearOtherTxProfiles;
    CLOSE cpCursor;
END
$$
DELIMITER ;


DROP PROCEDURE IF EXISTS `CENTRAL_SMART_CHARGING_DROP_ASSIGNED_TXPROFILE`;
DELIMITER $$
CREATE PROCEDURE `CENTRAL_SMART_CHARGING_DROP_ASSIGNED_TXPROFILE`(
    IN CP VARCHAR(40), IN connectorId INT, IN chargingProfileId INT
)
BEGIN
    DECLARE chargingProfilePurposeTypeId INT;
    DECLARE TxProfile INT;
    SET TxProfile = 3;

    SELECT cprofile.chargingProfilePurposeTypeId INTO chargingProfilePurposeTypeId
    FROM chargingProfile cprofile
    WHERE cprofile.chargingProfileId = chargingProfileId;

    -- TxProfile only
    IF chargingProfilePurposeTypeId = TxProfile THEN
        DELETE cpa FROM chargingProfileAssigned AS cpa
        WHERE cpa.chargepointId = chargepointId(CP)
        AND cpa.connectorId = connectorId
        AND cpa.chargingProfileId = chargingProfileId;
    END IF;
END
$$
DELIMITER ;
