/**
 * Abvos Http socket
 * @module abv-socket
 */
"use strict";

const ts = require('abv-ts')('abv:HSocket');
const Events = require('abv-events');

class HSocket extends Events
{
	constructor() 
	{
		super();
	}
	
	send(msg)
	{
	}
	
	close(){}

}

module.exports = HSocket;
