'use strict';

const Homey = require('homey');

class LinkplayApp extends Homey.App {
	
	onInit() {
		this.log('Linkplay app is running...');
	}
	
}

module.exports = LinkplayApp;