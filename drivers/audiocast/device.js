'use strict';

const Homey = require('homey');
const Linkplay = require('../../lib/Linkplay');

class LinkplayDevice extends Homey.Device {

    onInit() {
        this.log('Linkplay init');
        this.log('Name:', this.getName());
        this.log('Class:', this.getClass());
        this.data = this.getData();
        this.service = new Linkplay(this.data.ip);

        this.registerCapabilities();

        this.image = new Homey.Image();
        this.image.setUrl(null);
        this._currentImage = null;
        this.image.register()
            .then(() => {
                return this.setAlbumArtImage(this.image);
            })
            .catch(this.error);
        this.interval = this.startInterval();
    }

    onDeleted() {
        clearInterval(this.interval);
    }

    registerCapabilities() {
        this.registerCapabilityListener('volume_set', this.onCapabilityVolumeSet.bind(this));
        this.registerCapabilityListener('volume_mute', this.onCapabilityMute.bind(this));
        this.registerCapabilityListener('volume_up', this.onCapabilityVolumeUp.bind(this));
        this.registerCapabilityListener('volume_down', this.onCapabilityVolumeDown.bind(this));
        this.registerCapabilityListener('speaker_playing', this.onCapabilitySpeakerPlaying.bind(this));

    }

    async onCapabilityVolumeSet(value) {
        try {
            await this.service.setVolume(value * 100);
        }
        catch (e) {
            throw new Error('Set volume failed!');
        }
    }

    async onCapabilityMute(value) {
        try {
            await this.service.setMute(value);
        }
        catch (e) {
            throw new Error('Set volume failed!');
        }
    }

    async onCapabilityVolumeUp() {
        this.service.volumeAdjust(5)
    }

    async onCapabilityVolumeDown() {
        this.service.volumeAdjust(-5)
    }

    async onCapabilitySpeakerPlaying(value) {
        if (value) {
            await this.service.play();
        } else {
            await this.service.pause();
        }
        await this.setCapabilityValue('speaker_playing', !value);
    }

    startInterval() {
        return setInterval(this.getPlayerStatus.bind(this), 1000);
    }

    getPlayerStatus() {
        return this.service.getPlayerStatus()
            .then(async res => {
                await this.setCapabilityValue('volume_set', Number.parseFloat(res.vol) / 100);
                await this.setCapabilityValue('speaker_playing', res.status === 'play');
                await this.setCapabilityValue('volume_mute', res.mute === 1);
                await this.setCapabilityValue('speaker_album', res.Album);
                await this.setCapabilityValue('speaker_track', res.Title);
                await this.setCapabilityValue('speaker_artist', res.Artist);

                if (this._currentImage !== res.albumArtUri) {
                    this._currentImage = res.albumArtUri;
                    this.image.setUrl(res.albumArtUri ? res.albumArtUri : null);
                    this.image.update();
                }
                // await this.setCapabilityValue('speaker_duration', res.mute === 0);
                // await this.setCapabilityValue('speaker_position', res.mute === 0);
                return res;
            }).catch(e => {
                this.log("Error getPlayerStatus: ", e)
            });
    }

    getStatus() {
        return this.service.getStatus()
    }


    async playAudioUrl(audio_url) {
        return this.service.playUrl(audio_url)
            .then(() => {
                return true;
            })
            .catch((err) => {
                return false;
            })
    }

    async stop() {
        return this.service.stop()
            .then(() => {
                return true;
            })
            .catch((err) => {
                return false;
            })
    }


    onDiscoveryResult(discoveryResult) {
        // Return a truthy value here if the discovery result matches your device.

        // this.log("onDiscoveryResult",discoveryResult);
        // this.log("this.data",this.data);
        return discoveryResult.id === this.data.id;
    }

    async onDiscoveryAvailable(discoveryResult) {
        // this.log("onDiscoveryAvailable",discoveryResult);
        // This method will be executed once when the device has been found (onDiscoveryResult returned true)
        this.service.setIp(discoveryResult.address);
        this.status = await this.service.getStatus(); // When this throws, the device will become unavailable.
    }

    onDiscoveryAddressChanged(discoveryResult) {
        // this.log("onDiscoveryAddressChanged",discoveryResult);

        // Update your connection details here, reconnect when the device is offline
    }

    onDiscoveryLastSeenChanged(discoveryResult) {
        // this.log("onDiscoveryLastSeenChanged",discoveryResult);

        // When the device is offline, try to reconnect here
    }

}

module.exports = LinkplayDevice;