'use strict';

const Homey = require('homey');
const Linkplay = require('../../lib/Linkplay');

class LinkplayDriver extends Homey.Driver {

    onInit() {
        this.log('AudioCastDriver has been initiated');
    }


    async onPairListDevices(data, callback) {
        const discoveryStrategy = this.getDiscoveryStrategy();
        const discoveryResults = discoveryStrategy.getDiscoveryResults();
        const res = [];
        const lp = new Linkplay();
        for (let device of Object.values(discoveryResults)) {
            try {
                lp.setIp(device.address);
                const status = await lp.getStatus().then(res => {
                    return Object.assign(res, {id: device.id, ip: device.address});
                });
                res.push(status);
            }
            catch (e) {
                this.log(device.host + " is probably not the device you're looking for", e)
            }
        }
        const devices = res.map(device => {
            return {
                name: device.DeviceName,
                data: {
                    id: device.id,
                    ip: device.ip
                }
            };
        });
        callback(null, devices);
    }

}

module.exports = LinkplayDriver;


