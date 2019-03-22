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