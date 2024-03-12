/**
 * Test socket.js
 */
"use strict";

const log = console.log.bind(console);
const assert = require('assert');
const Socket = require('../lib/Socket.js');
const CSocket = require('../lib/CSocket.js');
const WebSocket = require('ws');

const port = 8888;
const greeting = 'Hello server';

const wss = new WebSocket.Server({ port: port });

wss.on('connection', function (ws) {
	ws.on('message', function (msg) {
//    	const m = JSON.parse(msg);log(m);
    	ws.send(msg);
  	});

  	
});

describe('Abvos Socket', function() {
	describe('create new socket', function() {
		it('returns socket', function() {
	    	const sock = new Socket(); 
	    	assert(sock, 'No Socket?');
	  	});
	});
});

describe('Abvos Client Socket', function() {
	describe('create new socket', function() {
		it('returns socket', function() {
	    	const sock = new CSocket('http://127.0.0.1:' + port,WebSocket); 
	    	assert(sock, 'No Socket?');
	  	});
		it('returns false if fake host', function() {
	    	const sock = new CSocket(); 
	    	const r = sock.connect('blah',WebSocket);
	    	assert.equal(r,false, 'fake host');
	  	});
	});

	describe('send message', function() {
		it('greeting', function(done) {
	    	const sock = new CSocket('http://127.0.0.1:' + port,WebSocket);
	    	sock.on('msg',(msg) => { 
//	    		log('> ' + msg.b);	
	    		assert.equal(msg.b, greeting, 'msg: ' + greeting);
	    		done();
	    		setTimeout(() => { 
	    			sock.close();
	    			process.exit();
	    		}, 500);
	    	}); 
	    	sock.opened = () => {
					sock.send('msg', greeting, '');
				}
	  });
	});
});
