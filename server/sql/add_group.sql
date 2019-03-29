/* Create smart charging group */
insert into centralSmartChargingGroup(chargingProfileId) values (1);

/* Add charge points to smart charging group */
insert into chargepointGroup(chargepointId, connectorId, groupId) values (1,1,1),(2,1,1);