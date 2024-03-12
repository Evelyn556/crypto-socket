/**
 * Abvos socket
 */
"use strict";

const ts = require('abv-ts')('abv:Socket');

const Msg = require('./Msg.js');

let $sid = 1;

const $info = (v) => {
	const r = {info:{}, skey: null, psw: null};
	if (!v || typeof v !== 'object') return r;
	const m = 128;

	try{
		r.info.user = v.user.substr(0,m);
		r.info.pkey = v.pkey.substr(0,2*m);
		r.info.name = v.name ? v.name.substr(0,m) : r.info.user;
		r.info.site = v.site.substr(0,m);
		r.info.loc = v.loc.substr(0,m); 
		r.skey = v.skey.substr(0,m);
	}catch(e){}

	return r;
};

const $dir = (dir) => {
	if (!dir) dir = {};
	const r = typeof dir === ts.STR ? dir : null;
	const d = typeof dir === ts.OBJ ? dir : {};
	if (!d.priv) d.priv = '';
	if (!d.room) d.room = '';
	if (!d.pub) d.pub = '';
	if (r) d.priv = d.room = d.pub = r;
	d.priv += '/s';
	d.room += '/r';
	d.pub += '/@';
	return d;
};

class Socket
{
	constructor(sock, dir=null) 
	{
		this.sock = sock;
		this.id = sock ? this.TMP + $sid++ : '';
		this.pin = null;
		this.db = null;
		this.streams = new Map();
		this._dir = $dir(dir);
	}
     
	info(v)
	{
		return $info(v);
	}

	recv(buf)
	{
		const msg = new Msg();

		try{ 
			msg.unpack(buf); 
			this._save(msg, buf);
			this['on' + msg.cmd](msg); 
		}catch(e){ console.log(e);
			ts.error(69,ts.UK + ' msg['+ buf.byteLength +']');
		}
	}

	send(msg, cb)
	{
		cb = typeof cb === ts.FN ? cb : false;
// FIXME: msg.time
msg.time = Date.now();

		const buf = msg.pack();
	
		if (buf === null){
			const err = 'null';
			if (cb) return cb(err);
			return ts.error(83,err);
		}

		this._save(msg, buf);
		return this._send(buf, cb);
	}
	
	_send(buf, cb)
	{
		if(!this.sock) return ts.error(93,'sock?');

		const me = this;
		let error = false;
		
		if (ts.isBrowser){
			try{ this.sock.send(buf); }catch(e){ error = e; }
			if (error){
				ts.error(200, me.id + ' end');
				this.close();
			}
			if (cb) return cb(error);
		}else {
			this.sock.send(buf, (err) => {
				if (err){
					ts.error(108,err);
					me.close();
				}
				if (cb) return cb(err);
			});
		}
	}
		
	sendTo(cmd,body='',to='', src='', dst='')
	{
		if (!ts.is(cmd,String)) return ts.error(103, ts.UK + ' cmd: ' + cmd);
		if (!to) to = this.PUB + this.id;
		const f = new Msg('',body);
		f.msg(cmd, to, src, dst);
//if (cmd == 'msg')console.log(Object.keys(f));
		this.send(f);
	}

	_save(msg, buf)
	{
		if(!msg) return;
		this.save(msg.name, buf);
	}
	
	save(path, data) { }
	
	log(s) { }
	
	close(s)
	{
		const me = this;
		
		if (s) ts.error(145, s); 
		
		if (this.sock){
			if (this.sock.close === ts.FN) this.sock.close(); // terminate
			else this.sock = null;
		}
		this._close();
		
	}
	_close(){}
	
	d2path(ts)
	{
///TODO: move to ts
		if (ts)ts = parseInt(ts);
		const n = ts ? new Date(ts): new Date();
		let m = n.getMonth() + 1;
		if (m < 10) m = '0' + m;
		let d = n.getDate();
		if (d < 10) d = '0' + d;
		return '/' + n.getFullYear() + '/' + m + '/' + d;
	}
	
	k2path(pkey)
	{
		const r = '/' + pkey.substr(0,5) + 
			'/' + pkey.substr(5,5) +
			'/' + pkey.substr(10,5) +
			'/' + pkey.substr(15);
		return r;
	}
	
	m2path(msg)
	{
		let r = '';
		try{
			const pkey = this.$.pkey;
			const day = this.d2path(msg.time);
			const to = msg.to.substr(1);
			if (msg.to.startsWith(this.PRIV)){
				r = this.k2path(pkey) + '/';
				r += to === pkey ? msg.from : to; 
			}else{
				r = this.k2path(to);
			}
			r += day + '/' + msg.time;
		}catch(e){}
// FIXME: ts.now -> msg.time = getter
		return r;
	}

	t2path(to,time)
	{
		let r = this.m2path({to:to,time:time});
		if (!r) return r;
		r += to.startsWith(this.PUB)?'.json':this.ABV; 
		return r;
	}
	
	get TMP(){ return '~'; }
	get SRV(){ return this.TMP + '0'; }
	get PUB(){ return '@'; }
	get PRIV(){ return '!'; }
	get ROOM(){ return '&'; }
	get EXT(){ return '.abv'; }
	get JSN(){ return '.json'; }
	
}

module.exports = Socket;
