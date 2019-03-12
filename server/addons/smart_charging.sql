/* Central Smart Charging */

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


/* Central smart charging */
DROP PROCEDURE IF EXISTS CENTRAL_SMART_CHARGING;
DELIMITER $$
CREATE PROCEDURE CENTRAL_SMART_CHARGING (
    IN groupId INT
)
BEGIN
    DECLARE numOfChargepoints INT DEFAULT 0;
    DECLARE numOfActiveTx INT DEFAULT 0;
    DECLARE r_chargepointId INT;
    DECLARE r_chargingProfileId INT;
    DECLARE r_connectorId INT;
    DECLARE r_transactionId INT;
    DECLARE v_finished INT DEFAULT 0;
    DECLARE v_chargepointId INT;
    DECLARE v_chargingProfileId INT;
    DECLARE v_portId INT;
    DECLARE v_transactionLogId INT;
    DECLARE cpCursor CURSOR FOR (
        SELECT tl.chargepointId, tl.portId, tl.transactionLogId
        FROM dummyTransactionLog tl
        WHERE terminateReasonId = 1
        AND tl.chargepointId IN (
            SELECT cpg.chargepointId FROM chargepointGroup cpg
            WHERE cpg.groupId = groupId
        )
    );
    DECLARE CONTINUE HANDLER 
        FOR NOT FOUND SET v_finished = 1;

    SELECT COUNT(*) INTO numOfChargepoints
    FROM chargepointGroup cpg WHERE cpg.groupId = groupId;

    SELECT COUNT(DISTINCT chargepointId) INTO numOfActiveTx
    FROM dummyTransactionLog WHERE terminateReasonId = 1;

    IF numOfActiveTx >= numOfChargepoints THEN
        -- apply when all chargepoints in the group are in use
        OPEN cpCursor;
        
        -- set TxProfile for each connector (connectorId must be > 0)
        setChargingProfile: LOOP

        FETCH cpCursor INTO v_chargepointId, v_portId, v_transactionLogId;
        
        IF v_finished = 1 THEN
            LEAVE setChargingProfile;
        END IF;

        -- set cp
        -- SELECT HTTP_CP INTO chargepointId FROM chargepoint
        -- WHERE chargepointId = v_chargepointId;
        SET r_chargepointId = v_chargepointId;

        -- set connector id (different from port id)
        SELECT p.connectorId INTO r_connectorId FROM `port` p
        WHERE p.portId = v_portId;

        -- set profile id
        SELECT g.chargingProfileId INTO r_chargingProfileId
        FROM centralSmartChargingGroup g
        WHERE g.groupId = groupId;

        -- set transaction id (same as transactionLogId)
        SET r_transactionId = v_transactionLogId;

        -- set charging profile
        INSERT INTO
        dummyOutboundRequest(chargepointId, connectorId, chargingProfileId, transactionId)
        VALUES
        (r_chargepointId, r_connectorId, r_chargingProfileId, r_transactionId);

        END LOOP setChargingProfile;
        CLOSE cpCursor;
    END IF;
END;
$$
DELIMITER ;
