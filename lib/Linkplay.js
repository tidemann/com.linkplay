const rp = require('request-promise-native'),
    parser = require('fast-xml-parser'),
    he = require('he'),
    UPnPClient = require('node-upnp'),
    _ = require('lodash');


class Linkplay {
    constructor(ip) {
        this.ip = ip;
        this.currentStatus = {};
        this.currentPlayerStatus = {};
        this.upnpClient = new UPnPClient({
            url: `http://${this.ip}:49152/description.xml`
        });

    }

    async getStatus() {
        let status = await this.command('getStatus', true);
        if (status)
            this.currentStatus = status;
        return status;
    }

    async getPlayerStatus() {
        let status = await this.command('getPlayerStatus', true)
            .then(handlePlayerStatus)
            .then(async status => {
                if (status.resolvedMode === 'PLAYER_MODE_SPOTIFY') {
                    const upnpStatus = await this.getPlayerStatusUPnP();
                    if (upnpStatus) {
                        status.Title = _.get(upnpStatus, 'dc:title', 'Unknown');
                        status.Artist = _.get(upnpStatus, 'upnp:artist', 'Unknown');
                        status.Album = _.get(upnpStatus, 'upnp:album', 'Unknown');
                        status.albumArtUri = _.get(upnpStatus, 'upnp:albumArtURI', false);
                    }
                }
                return status;
            });
        if (status)
            this.currentPlayerStatus = status;
        return status;
    }

    async getPlayerStatusUPnP() {
        const xml_tree = await this.upnpClient.call('urn:upnp-org:serviceId:AVTransport', 'GetMediaInfo', {InstanceID: 0});
        try {
            let jsonObjRes = parser.parse(he.decode(xml_tree.CurrentURIMetaData));
            return _.get(jsonObjRes, 'DIDL-Lite.item');
        } catch (error) {
            console.log(error.message);
            return false;
        }
    }

    setVolume(value) {
        return this.setPlayerCommand('vol', value).then(() => this.currentPlayerStatus.vol = value)
    }

    async volumeAdjust(value) {
        if (!this.currentPlayerStatus.vol && this.currentPlayerStatus.vol !== 0) {
            await this.getPlayerStatus();
        }
        let newVol = this.currentPlayerStatus.vol + value > 100 ? 100 : this.currentPlayerStatus.vol + value < 0 ? 0 : this.currentPlayerStatus.vol + value;
        return this.setVolume(newVol)
            .then(() => {
                this.currentPlayerStatus.vol = newVol;
            })
    }

    setMute(value) {
        return this.setPlayerCommand('mute', value ? '1' : '0');
    }

    play() {
        return this.setPlayerCommand('play');
    }

    pause() {
        return this.setPlayerCommand('pause');
    }

    stop() {
        return this.setPlayerCommand('stop');
    }

    setPlayerCommand(command, value) {
        let val = value !== undefined ? ':' + value : '';
        return this.command('setPlayerCmd:' + command + val)
    }

    command(cmd, isJSON) {
        return rp(`http://${this.ip}/httpapi.asp?command=${cmd}`)
            .then(res => isJSON ? JSON.parse(res) : res)
    }

    setIp(ip) {
        this.ip = ip;
    }

}

function handlePlayerStatus(status) {
    return Object.assign({}, status, {
        Title: hex2a(status.Title),
        Artist: hex2a(status.Artist),
        Album: hex2a(status.Album),
        iuri: hex2a(status.iuri),
        uri: hex2a(status.uri),
        resolvedMode: getMode(status.mode),
        vol: Number.parseInt(status.vol)
    });

}

function hex2a(hexx) {
    var hex = hexx.toString();//force conversion
    var str = '';
    for (var i = 0; (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

function getMode(val) {
    const modes = {
        "0": "PLAYER_MODE_NONE",
        "1": "PLAYER_MODE_AIRPLAY",
        "2": "PLAYER_MODE_DLNA",
        "10": "PLAYER_MODE_WIIMU",
        "11": "PLAYER_MODE_WIIMU_LOCAL",
        "12": "PLAYER_MODE_WIIMU_STATION",
        "13": "PLAYER_MODE_WIIMU_RADIO",
        "14": "PLAYER_MODE_WIIMU_SONGLIST",
        "19": "PLAYER_MODE_WIIMU_MAX",
        "20": "PLAYER_MODE_HTTP",
        "21": "PLAYER_MODE_HTTP_LOCAL",
        "29": "PLAYER_MODE_HTTP_MAX",
        "30": "PLAYER_MODE_ALARM",
        "31": "PLAYER_MODE_SPOTIFY",
        "40": "PLAYER_MODE_LINEIN",
        "41": "PLAYER_MODE_BT",
        "42": "PLAYER_MODE_EXT_LOCAL",
        "43": "PLAYER_MODE_OPTICAL",
        "49": "PLAYER_MODE_LINEIN_MAX",
        "50": "PLAYER_MODE_MIRROR",
        "60": "PLAYER_MODE_TALK",
        "99": "PLAYER_MODE_SLAVE"
    };
    return modes[val];
}

module.exports = Linkplay;