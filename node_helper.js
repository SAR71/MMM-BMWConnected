var NodeHelper = require("node_helper");
const moment = require('moment');

var tokenmanager = require('./lib/tokenmanager.js');
var bmwrequest = require('./lib/bmwrequest.js');

module.exports = NodeHelper.create({

    start: function () {
        console.log("Starting node_helper for module: " + this.name);
        this.bmwInfo = null;
    },

    socketNotificationReceived: function (notification, payload) {

        var self = this;

        switch(notification){
            case "MMM-BMWCONNECTED-CONFIG":
                self.config = payload;
            break;

            case "MMM-BMWCONNECTED-GET":
                    var credConfig = {
                        'username': self.config.email,
                        'password': self.config.password
                    }
        
                    tokenmanager.initialize(credConfig,
                        function onSuccess(token, tokenType) {
        
                            var vin;
                            console.log("Token init completed: " + "\nToken: " + token + "\nTokenType: " + tokenType);
        
                            bmwrequest.call(self.config.apiBase, '/api/me/vehicles/v2', '', token, tokenType,
                                function (data) {
                                    try {
                                        var json = JSON.parse(data);
                                        vin = json[0].vin;
                                    } catch (err) {
                                        console.error("Failed to parse data " + data + ", error " + err);
                                    }
        
                                    var getInfoUri = '/api/vehicle/dynamic/v1/' + vin
                                    bmwrequest.call(self.config.apiBase, getInfoUri, '', token, tokenType,
                                        function (data) {
                                            try {
                                                var json = JSON.parse(data);
                                                var attributes = json.attributesMap;
        
                                                self.bmwInfo = {
                                                    updateTime: moment.unix(attributes.updateTime_converted_timestamp / 1000).format(),
                                                    doorLock: attributes.door_lock_state,
                                                    electricRange: Number(attributes.beRemainingRangeElectricMile).toFixed(),
                                                    fuelRange: Number(attributes.beRemainingRangeFuelMile).toFixed(),
                                                    fuelRemaining: Number(attributes.remaining_fuel).toFixed(),
                                                    fuelMax: Number(attributes.heading).toFixed(),
                                                    mileage: Number(attributes.mileage).toFixed(),
                                                    connectorStatus: attributes.connectorStatus,
                                                    vin: vin,
                                                    chargingLevelHv: Number(attributes.chargingLevelHv).toFixed(),
                                                    imageUrl: null,
                                                    unitOfLength: attributes.unitOfLength
                                                }
        
                                                if (self.config.distance === "km") {
                                                    self.bmwInfo.electricRange = Number(attributes.beRemainingRangeElectricKm).toFixed();
                                                    self.bmwInfo.fuelRange = Number(attributes.beRemainingRangeFuelKm).toFixed();
                                                }
        
        
                                                var getImagesUri = '/api/vehicle/image/v1/' + vin + "?startAngle=0&stepAngle=10&width=640"
                                                bmwrequest.call(self.config.apiBase, getImagesUri, '', token, tokenType, function (data) {
                                                    try {
                                                        var json = JSON.parse(data);
                                                        var angleUrls = json.angleUrls;
                                                        var picked = angleUrls.find(o => o.angle === self.config.vehicleAngle);
                                                    } catch (err) {
                                                        console.error("Failed to parse data " + data + ", error " + err);
                                                    }
                                                    try {
                                                        self.bmwInfo.imageUrl = picked.url;                                                
                                                    }
                                                    catch (err) {
                                                        //Bild meines BMW standardmäßig setzen :-)
                                                        self.bmwInfo.imageUrl = "https://cosy.bmwgroup.com/cdp/cosySec?COSY-EU-100-8074HMrjSho5Ot%25uS8zhpY%25A4qy7PFWJKpvUNuABSZXsRPJdMt6i7ZBDk8RcUtKnLE7fsuayI9UPiSSv34sNct%25Xj%25iof2x6aWcFPQVRmVfubh07ghPe0AmUlANzHngspJoqKKbiZBFOS50ctduTMhuf8De28nRPEnzQEIiN9yqY9l2o4vO54wXF%25XTC%25u2uW62GWaIeVRQrV0Bzh7YwhHUqAU5xAX9OJsC1JLCTBiGbbct2dcr00fnQDfwHHPlYnPxKKNh5yN1SSzICvobMMqTGXF0kkDqr6uHLLPewReKIIZ4x7zS33xh1UqMjTOJbsOka2T20iTLmQ2UHc2IgYQcKfQ3l5Y8SPYjpC58MN5aZGhEkoCmtrgbLFGg8w5kIurlExC33ewp91RbjzxZ4b6oaq1t%250DFmOb8WHnSgT0EVKgEl2H9hkg%25pQK4ALosZYS%25JIgDt5MWB2Fl8CkVdQt3EGLhDYXR9rIAn5u24w3JyCiQ%25xjBvG%25gW1adXxm9VbmD61phh0gnRbwGAHl%25htrcq9xL%25gdFzBvuWMNXqOaxkjNEDhQ%25cuDHdLwYn4%25UR155Ot8nsVzhpn%25m53qoayxnnDOJtvzDRnwx3xHvOak9ll2PfMJuSpjsAXXbsdDggL00rhYuoIsWlyW53qAZP6n9d8dS1BVpN9jk1drtoikF52dUlSXY092kufIMO2piZkpk1FvBCqa08CkMVyKoPNDyF44mOcIwEwY4x";
                                                        console.error("Failed to parse url for car picture, error " + err);
                                                    }
                                                    self.bmwInfo.instanceId = payload.instanceId;
        
                                                    self.parseCarInfo(payload);
        
                                                },
                                                    function onError(err) {
                                                        console.error("Failed to read list of vehicle images:" + err);
                                                    });
        
                                            } catch (err) {
                                                console.error("Failed to parse data " + data + ", error " + err);
                                            }
                                        },
                                        function onError(err) {
                                            console.error("Failed to read vehicle info:" + err);
                                        });
        
                                },
                                function onError(err) {
                                    console.error("Failed to read list of vehicles:" + err);
                                });
                        },
                        function onError(err) {
                            console.error("Failed to read token:" + err);
                        }
                    );
            break;

            case "HTML":
                console.log(this.name + " HTML changed to: " + payload);
            break;
        }
    },

    parseCarInfo: function (payload) {
        this.sendSocketNotification("MMM-BMWCONNECTED-RESPONSE" + payload.instanceId, this.bmwInfo);
    },

});