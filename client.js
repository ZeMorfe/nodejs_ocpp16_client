var WebSocket = require('ws');
const url = 'ws://192.234.196.158:8080/ocpp/1.6J/AAE00488 ';//CPG';


	
var auth = "Basic "+ Buffer.from("AAE00488:TempPassword").toString('base64');//("cpg:powertech").toString('base64');

console.log(auth);
var header = { "Authorization":auth };

var msgId = 1;
var idTag = "App-apVkYs5n4/meo";//"00001234"; //

ws = new WebSocket(url, "ocpp1.6", {headers : { Authorization: auth } });
			
ws.on('open', function open() {
	msgId = msgId + 1;
	var bootNot = [2,msgId.toString(),"BootNotification",{"chargePointSerialNumber":"CPG","chargePointVendor":"Matth","chargePointModel":"Ghost 1","chargeBoxSerialNumber":"CPG01","firmwareVersion":"1.0.0"}];
	ws.send(JSON.stringify(bootNot), function ack(error) { 
		console.log(error);
		/*
		*/
		//"StartTransaction", {"connectorId": "1", "idTag":
	});
});	

ws.on("message", function incoming(data) {
	console.log(JSON.parse(data));
	if (JSON.parse(data)[2].status == "Accepted") {
		msgId = msgId + 1;
		var currentDate = new Date();
		var stpTra = [2, msgId.toString(), "StopTransaction", {"connectorId":"1", "meterStop":1200, "idTag":idTag, "timestamp":currentDate.toISOString(), "transactionId": 44}];
							ws.send(JSON.stringify(stpTra), function ack(error) {
								var snVal = [2, msgId.toString(), "StatusNotification", {"connectorId":"1", "errorCode":"NoError", "status":"Finishing"}];
								ws.send(JSON.stringify(snVal), function ack(error) { 
									var snVal = [2, msgId.toString(), "StatusNotification", {"connectorId":"1", "errorCode":"NoError", "status":"Available"}];
									ws.send(JSON.stringify(snVal), function ack(error) { 
									
									});
								});
							});/*
		var ocppAuth = [2, msgId.toString(), "Authorize", {"idTag":"00001234"}];//"App-apVkYs5n4/meo"}];
		ws.send(JSON.stringify(ocppAuth), function ack(error) {
			msgId = msgId + 1;
			var currentDate = new Date();
			var startTra = [2, msgId.toString(), "StartTransaction", {"connectorId":"1", "meterStart":"0", "idTag":idTag, "reservationId":0, "timestamp":currentDate.toISOString()}];
			ws.send(JSON.stringify(startTra), function ack(error) {
				msgId = msgId + 1;
				var snVal = [2, msgId.toString(), "StatusNotification", {"connectorId":"1", "errorCode":"NoError", "status":"Charging"}];
				
				ws.send(JSON.stringify(snVal), function ack(error) { 
					var meterValue = 0.0;
					var metValue = setInterval(function met() {
						msgId = msgId + 1;
						meterValue = meterValue + 200;
						console.log(meterValue);
						if (meterValue < 100) {
							var metVal = [2, msgId.toString(), "MeterValues", {"connectorId":"1", "transactionId": 20, "meterValue":meterValue}];
							ws.send(JSON.stringify(metVal), function ack(error) { });
						}
						else {
							var currentDate = new Date();
							var stpTra = [2, msgId.toString(), "StopTransaction", {"connectorId":"1", "meterStop":meterValue, "idTag":idTag, "timestamp":currentDate.toISOString(), "transactionId": 1}];
							ws.send(JSON.stringify(stpTra), function ack(error) {
								var snVal = [2, msgId.toString(), "StatusNotification", {"connectorId":"1", "errorCode":"NoError", "status":"Finishing"}];
								ws.send(JSON.stringify(snVal), function ack(error) { 
									var snVal = [2, msgId.toString(), "StatusNotification", {"connectorId":"1", "errorCode":"NoError", "status":"Available"}];
									ws.send(JSON.stringify(snVal), function ack(error) { 
									
									});
								});
							});
						}
					}, 60000);
				});
			});
		});*/
	}
});

const interval = setInterval(function ping() {
	msgId = msgId + 1;
	var ocppHB = [2, msgId.toString(), "Heartbeat", {}];
	ws.send(JSON.stringify(ocppHB), function ack(error) {
		console.log(error);
	});
}, 300000);
