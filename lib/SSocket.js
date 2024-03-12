/**
 * Abvos server side socket
 */
"use strict";

const ts = require('abv-ts')('abv:SSocket');
const Socket = require('./Socket.js');

const os = require('os');
const fs = require('abv-vfs');
const $crypto = fs.Crypto();

const $props = new WeakMap();

const $online = (socks,pkey) => {
	const max = 100;
	let t, i = 0;
	const a = [];
	for (let it of socks){
		t = Array.from(it.twins.values());
		if (!t[0]) continue;
		if (pkey !== t[0].$.pkey) a.push(t[0].$);
		i++; if (i > max) break;
	}
	return a;
};

class SSocket extends Socket
{
	constructor(sock, owner)
	{
		super(sock);
		$props.set(this, this.info());
		this.owner = owner;
		this.db = owner.db;
		this.home = null;
	}
	
	get $()
	{
		const p = $props.get(this).info;
		const r = {
			user: p.user,
			name: p.name,
			pkey: p.pkey,
			site: p.site,
			loc: p.loc
		};
		return r;
	}
	
	set $(v)
	{
		const p = this.info(v);
		if (p.info.user) $props.set(this, p);
	}
	
	onroom(msg)
	{
		let to;
		const t = ts.fromString(msg.body);
		if (!t) return ts.error(31,'room info?');
		this.db.update(this, t);
	}
		
	onwho(msg)
	{
		let t, a = [];
		const pkey = this.$.pkey;
		const to = msg.to ? msg.to.substr(1):pkey;
		if (to === pkey){
			a = $online(this.db.values(), pkey);
		}else if (msg.to.startsWith(this.PRIV)){
			t = this.db.get(to);
			if (t) a = $online([t], pkey);
		}else{
			t = this.db.get(to);
			if (t) a = $online(t.room.values(), pkey);
		}

		msg.from = this.SRV;
		msg.to = this.PRIV + this.$.pkey;
		msg.body = ts.toString({size: this.db.size, data: a});
		this.send(msg);
	}

	onid(msg)
	{
		msg.f = this.SRV;
		msg.t = this.id;
		msg.body = this.pin = String(Math.floor(Math.random() * 1000000));
		this.send(msg);
	}

	onauth(msg)
	{
		let v = null, t;
		try{
			t = ts.fromString(msg.body);
			const s = t.pkey + t.user + t.name + t.site +
				t.loc + this.pin;
			v = $crypto.verify(t.pkey, s, t.sign); 
		}catch(e){ }
		if (!v) return this.close('sign?');
		
		this.$ = t;
		this.db.add(this);
	//	ts.warn(87,this.$);
	/*	msg.f = this.SRV;
		msg.body = '';
		msg.c = 'room';
		this.send(msg);*/
	}

	onstream(msg)
	{
//console.log(msg.name,msg.size);
		this.sendTo(msg);
	}

	onmsg(msg)
	{
		this.sendTo(msg);
	}

	onsyn(msg)
	{
		this.sendTo(msg);
	}

	oncp(msg)
	{
		this.sendTo(msg);
	}

	onjoin(msg)
	{
		let f, t, clients, twins;
		const to = msg.to.substr(1);
		t = this.db.get(to);
		if (!t) return ts.error(140,'to?');
		if (msg.to.startsWith(this.ROOM)){
			msg.to = this.PRIV + to;
			msg.body = ts.toString(this.$);
			twins = t.twins.values();
		}else if (msg.to.startsWith(this.PRIV)){
		//console.log(t);
			t.rooms.set(this.$.pkey, this.home);
			f = this.home;
			f.room.set(to, t);
			clients = [t];
			twins = f.twins.values();
		}	
		msg.from = this.$.pkey;
		this.broadcast(msg, clients, twins);
	}
	
	onleave(msg)
	{
		let t, twins;
		const to = msg.to.substr(1);
		const pkey = this.$.pkey;
		
		if (msg.to.startsWith(this.ROOM)){
			t = this.home.rooms.get(to);
			if (!t) return;
			t.room.delete(pkey);
			this.home.rooms.delete(to);
			msg.from = pkey;
			twins = t.twins.values();
		}else if (msg.to.startsWith(this.PRIV)){
			t = this.home.room.get(to);
			if (!t) return;
			t.rooms.delete(pkey);
			this.home.room.delete(to);
			msg.body = pkey;
			msg.from = this.SRV;
			twins = t.twins.values();
		}		
		msg.to = this.PRIV + to;
		this.broadcast(msg, null, twins);
	}

	onsys(msg)
	{
		msg.from = this.SRV;
		const a = [];
		for (let it of this.db.values()) a.push(it.room.size);
		const r = {
			ids:this.db.size,
			rooms: a,
			run:process.memoryUsage(),
			mem: {
				total: os.totalmem(),
				free: os.freemem()},
			avg: os.loadavg(),
			cpu: os.cpus().length,
			node: process.version
			};
		msg.body = ts.toString(r);
		this.send(msg);
	}

	sendTo(msg)
	{
		const pkey = this.$.pkey;
		if (!ts.is(msg.to,String)) msg.to = this.PUB + pkey;

		let clients = null, twins = null, a;

		msg.from = pkey;

		if (msg.to === this.SRV) return this.owner.recv(msg);

		let to = this.home.rooms.get(msg.to.substr(1));
		if (!to) return ts.error(188,'To?',msg.to);
	
		const isPal = to.room.has(pkey);
		
		if (msg.to.startsWith(this.PUB)){
			if(!(isPal || to.rooms.has(pkey))) return;
			clients = to.room.values();
		}else if (!isPal){
			return ts.error(228,'Pal?');
		}else if (msg.dst && msg.dst.startsWith(this.TMP)){
			msg.src = this.id;
			clients = [{twins:[to.twins.get(msg.dst)]}];
		}else if (msg.to.startsWith(this.PRIV)){
			a = Array.from(to.twins.values());
			if (msg.call){
				msg.src = this.id;
				msg.dst = a[0].id;
				clients = [{twins:[a[0]]}];
			}else{
				clients = [to];
			}
		}else if (msg.to.startsWith(this.ROOM)){
			clients = to.room.values();
		}else{
			return ts.error(151, 'To?', msg.t);
		}
		
		this.broadcast(msg, clients, twins);
	}
	
	broadcast(msg, clients, twins=null)
	{
		const m = msg.pack();	
		if (m === null) return ts.error(220,'null');
	//	ts.debug(221, msg.c, this.$.user, msg.t.substr(0,6));

		if (twins) this._broadcast(m, twins);

		if (!clients) return;
//console.log(233,clients);		
		for (let to of clients){
		//	console.log(234,to.twins.values());
			this._broadcast(m, to.twins.values());
		 }
	}
	
	_broadcast(buf, clients)
	{
		for (let it of clients){
	
			if (it.sock && (this.sock !== it.sock)){
				it.sock.send(buf, err => {
					if (err) it.close(err);		
				});
	//			if (it.sock.readyState === WebSocket.CLOSED) it.close();	
			}	
		}
	}
	
	_close()
	{
		this.db.remove(this);
	}
	
	_save(msg, buf)
	{
		if(!msg) return;
		if (msg.cmd !== 'msg') return;
/*		let path = this.t2path(msg.to,msg.time);
		if (path === '') return ts.error(285,'path?');
		if (!path.endsWith('.json')) this.owner.save(path, buf);
		else this.owner.save(path, ts.toJson(msg)); */
	}
	
	diag()
	{
		let t, a;
		const r = {id: this.id, room:[],rooms:[]};

		if (this.$.user) r.user = this.$.user;
		
		if (!this.home) return r;
		
		const h = this.home;
		
		if (h.twins) r.twins = Array.from(h.twins.keys());
//console.log(h.room.keys());		
		if (h.room){
			for (let it of h.room.keys()){
				t = this.db.get(it);
				if (!t)continue;
				a = Array.from(t.twins.values());
				if (a[0]) r.room.push(a[0].$.user);
			}
		}
		if (h.rooms){
			for (let it of h.rooms.keys()){
				t = this.db.get(it);
				if (!t)continue;
				a = Array.from(t.twins.values());
				if (a[0]) r.rooms.push(a[0].$.user);
			}
		}
		return r;
	}
	
}

module.exports = SSocket;

	

