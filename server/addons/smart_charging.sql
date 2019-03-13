/*
 * Central Smart Charging
 * MySQL 5.7
 */

DROP TABLE IF EXISTS chargepointSmartCharging;
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
    groupId INT NOT NULL,
    PRIMARY KEY (chargepointId, groupId)

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

/* dummy values */
insert into centralSmartChargingGroup(chargingProfileId) values (2);
insert into chargepointGroup(chargepointId, groupId) values (1,1),(3,1);

/* from OpenOCPP 1.1.1 */
DROP TABLE IF EXISTS dummyOutboundRequest;
create table dummyOutboundRequest (
    `outboundRequestId` INTEGER NOT NULL AUTO_INCREMENT,
    `requestTypeId` INTEGER NOT NULL,
    `chargepointId` INTEGER NOT NULL,
    `connectorId` INTEGER(3) UNSIGNED DEFAULT 0,
    `chargingProfileId` INTEGER,
    `transactionId` INTEGER,
    `added` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`outboundRequestId`)
);

/* from OpenOCPP 1.1.1 */
drop table if exists dummyTransactionLog;
create table dummyTransactionLog (
    `transactionLogId` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER DEFAULT 0,
    `chargepointId` INTEGER NOT NULL DEFAULT 0,
    `portId` INTEGER NOT NULL,
    `vehicleId` INTEGER,
    `idtag` VARCHAR(20) NOT NULL,
    `reservationId` INTEGER,
    `meterStart` VARCHAR(40),
    `timestampStart` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NULL,
    `timestampFinish` TIMESTAMP DEFAULT '1970-01-01 00:00:00',
    `meterStop` VARCHAR(40),
    `timestampStop` TIMESTAMP DEFAULT '1970-01-01 00:00:00' NULL,
    `terminateReasonId` INTEGER NOT NULL DEFAULT 1,
    `notified` INTEGER DEFAULT NULL,
    `notifiedBilling` INTEGER DEFAULT NULL,
    `price` FLOAT(8,2),
    `tax1` FLOAT(8,2) NOT NULL DEFAULT 0.00,
    `tax2` FLOAT(8,2) NOT NULL DEFAULT 0.00,
    `tax3` FLOAT(8,2) NOT NULL DEFAULT 0.00,
    `statementId` INTEGER,
    PRIMARY KEY (`transactionLogId`)
);
insert into
dummyTransactionLog(chargepointId,portId,vehicleId,idtag)
values
(1,1,1,'dummyIdTag'),
(3,2,1,'dummyIdTag');

/* from OpenOCPP 1.1.1 */
drop table if exists dummyChargingProfileAssigned;
CREATE TABLE `dummyChargingProfileAssigned` (
    `chargingProfileAssignedId` INTEGER NOT NULL AUTO_INCREMENT,
    `chargingProfileId` INTEGER NOT NULL,
    `chargepointId` INTEGER NOT NULL DEFAULT 0,
    `connectorId` INTEGER(3) UNSIGNED NOT NULL DEFAULT 0,
    `added` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `modified` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`chargingProfileAssignedId`),
    CONSTRAINT `dummy_constraint` UNIQUE (`chargepointId`, `connectorId`, `chargingProfileAssignedId`)
);

/* from OpenOCPP 1.1.1 */
DROP PROCEDURE IF EXISTS `DUMMY_SET_CHARGING_PROFILE`;
DELIMITER $$
CREATE PROCEDURE `DUMMY_SET_CHARGING_PROFILE` (
IN cp VARCHAR(20),IN connectorId INT,IN profileId INT, IN transactionId INT,
OUT status VARCHAR(20))

BEGIN
    SET status='';
    INSERT INTO
    dummyOutboundRequest (requestTypeId,chargepointId,connectorId,chargingProfileId,transactionId)
    values (requestTypeId('SetChargingProfile'),chargepointId(cp),connectorId,profileId,transactionId);
    SELECT LAST_INSERT_ID() into status; 
END;
$$
DELIMITER ;


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


/* Central smart charging */
DROP PROCEDURE IF EXISTS CENTRAL_SMART_CHARGING;
DELIMITER $$
CREATE PROCEDURE CENTRAL_SMART_CHARGING (
    IN groupId INT
)
BEGIN
    DECLARE numOfChargepoints INT DEFAULT 0;
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
        WHERE terminateReasonId = 1
        AND tl.chargepointId IN (
            SELECT cpg.chargepointId FROM chargepointGroup cpg
            WHERE cpg.groupId = groupId
        )
    );
    DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;

    -- number of chargepoints in the group
    SELECT COUNT(*) INTO numOfChargepoints
    FROM chargepointGroup cpg WHERE cpg.groupId = groupId;

    -- number of active transactions related to the group
    SELECT COUNT(DISTINCT chargepointId) INTO numOfActiveTx
    FROM transactionLog
    WHERE terminateReasonId = 1
    AND chargepointId IN (
        SELECT g.chargepointId FROM chargepointGroup g
        WHERE g.groupId = groupId
    );

    -- apply when all chargepoints in the group are in use
    IF numOfActiveTx >= numOfChargepoints THEN
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
