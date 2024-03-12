/**
 * Abvos client side Socket
 */
"use strict";

const ts = require('abv-ts')('abv:CSocket');
const fs = require('abv-vfs');
const Socket = require('./Socket.js');
const Msg = require('./Msg.js');

class CSocket extends Socket
{
	constructor(dir=null)
	{
		super(null,dir);
		
		this.queue = new Map();
		this.mid = 1;
	}
	
	connect(url,sock)
	{
		if (!url || !sock){
			return false;
		}else if (sock.name == 'Socket'){
		}else if (!url || !url.startsWith('http')){
			ts.error(27,'No url', url);
			return false;
		}
		
		const me = this;
		const host = url.replace("http", 'ws') + '/abv';
		ts.log(38,host);
		if (this.sock) this.sock.close();

		if (ts.isBrowser){
			this.sock = new sock(host);
		}else if (sock.name == 'WebSocket'){
			this.sock = new sock(host,{origin:url});  
		}else{
			this.sock = new sock();
			this.sock.send = me.sock.write;
			this.sock.connect(8080,'localhost'); // FIXME: ip/port/sock
		}
		
		this.sock.binaryType = 'arraybuffer';
		
		if (ts.isBrowser){
			this.sock.onopen = () => me.start();
			
			this.sock.onmessage = (e) => me.recv(e.data);

			this.sock.onclose = () => me.end();
			
			this.sock.onerror = () => ts.error(60,'Socket error');
			
		}else {
			this.sock.on('open', () => me.start());

			this.sock.on('message', (msg) => me.recv(msg));

			this.sock.on('close', () => me.end());

			this.sock.on('connect', () => me.start()); // net socket

			this.sock.on('data', (msg) => me.recv(msg)); // net socket

			this.sock.on('error', (err) => {
				if (err && err.code === 'ECONNREFUSED'){
					ts.debug(75,'no connection');
				}else{
					ts.error(77,err);
				}
			});
		}
		return true;
	}
	
	start()
	{ 
		this.sendTo('id','',this.SRV);
		this.log('Start conn.'); 
	}
	
	end()
	{ 
		this.dump();
		this.close(); 
		this.log('End conn.');
	}
	
	dump(){ }
	
    call(msg,timeout=0 /* ms */)
    {
		if (!Number.isInteger(timeout) || (timeout < 0)) timeout = 0;
		const ms = timeout;// + 100;
		const tm = new Promise((resolve, reject) => {
			const id = setTimeout(() => {
				clearTimeout(id);
				reject('Timeout: '+ ms + ' ms.');
			}, ms);
		});
		return Promise.race([ this._call(msg,timeout), tm ]);
	}
    
    _call(msg,timeout=0 /* ms */)
    {
		let m = msg;
	
		const me = this;
        return new Promise((resolve, reject) => {
        	if (m === null) return reject("Null msg?");
            if (me.id.startsWith('~')) return reject("Not ready!");
			if (!m.t||!m.t.startsWith(this.PRIV)) return reject("To?");
            if (m.t === me.PRIV + me.id) return reject("Selfcall? " + m.c);
				
			if (timeout > 0) m.m = me.mid++;
			
			me.send(m, (err) => {
                if (err) return reject(err);

				if (m.m){
					me.queue.set(m.m, { 
						resolve: resolve, 
						reject:reject,
						end: Date.now() + timeout});
				}else{
					resolve();
				}			
			}); 
		});
	}
		
	decrypt(msg){}

	encrypt(msg){}

	recv(buf)
	{
		let t = null, fn;
		const msg = new Msg();
		msg.unpack(buf);

		if (!msg.cmd) return ts.error(135,ts.UK + 'msg['+ buf.byteLength +']');

		this._save(msg, buf);

		if (msg.cmd === 'msg') this.decrypt(msg);
		
		fn = 'on' + msg.cmd;
		if (typeof this[fn] !== ts.FN) return ts.error(138,ts.UK + ' cmd: ' + msg.cmd);

		if ((msg.to === this.PRIV + this.id) && msg.call){
			if (this.queue.has(msg.call)){
				const p = this.queue.get(msg.call); 
				const d = Date.now() - p.end;
				if (d > 0){
					 msg.body = 'Timeout: +' + d + 'ms';
					 msg.err = true;
				}
				this.queue.delete(msg.call);
//				delete(msg.call);
				if (msg.err) p.reject(msg); else p.resolve(msg);
			}else{
				try{
					t = this[fn](msg); 
					msg.body = t.body; 
					msg.$ = t.$;
				}catch(e){
					msg.body = String(e);
					msg.err = true;
				}
				msg.to = this.PRIV + msg.from;
				msg.from = this.id;
				const s = msg.src;
				msg.src = msg.dst;
				msg.dst = s;
				this.send(msg);
			}
		}else{
	//		this._save(msg, buf);
			this[fn](msg);
		}
	}

	send(msg, cb)
	{
		if(msg.cmd === 'msg') this.encrypt(msg);
		super.send(msg, cb);
	}
	
} // CSocket

module.exports = CSocket;
