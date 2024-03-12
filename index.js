/**
 * sockets
 * @module socket
 * github.com/Evelyn556/crypto-socket
 */
"use strict";

const Socket = require('./lib/Socket.js');
const CSocket = require('./lib/CSocket.js');
const SSocket = require('./lib/SSocket.js');
const Pool = require('./lib/Pool.js');
const Msg = require('./lib/Msg.js');

module.exports = {
	CSocket: CSocket,
	SSocket: SSocket,
	Socket:	Socket,
	Pool: Pool,
	Msg:Msg
};
