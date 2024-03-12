/**
 * Sockets pool
 */
"use strict";

const ts = require('abv-ts')('abv:Pool');


class Pool
{
	constructor()
	{
		this.db = new Map();
	}
	
	get size()
	{
		return this.db.size;
	}
	
/*	
	set(id, val)
	{
		this.db.set(id, val);
	}	
*/	
	get(id)
	{
		return this.db.get(id);
	}
	
	keys()
	{
		return this.db.keys();
	}
	
	values()
	{
		return this.db.values();
	}
	
	add(sock)
	{
		const pkey = sock.$.pkey;
		const s = this.init(pkey);
		s.twins.set(sock.id, sock);
		s.room.set(pkey, s);
		s.rooms.set(pkey, s);
		sock.home = s;
	}	
	
	init(id)
	{
		let s = this.db.get(id);
		if (!s){
			s = {
				room: new Map(), 
				rooms: new Map(), 
				twins: new Map()
			};
			this.db.set(id, s);
		}
		return s;
	}
	
	update(sock, opt)
	{
		const pkey = sock.$.pkey;
		if (!pkey) return;
		const el = this.db.get(pkey);
		let s;
		
		if (opt.room){
			for (let it of opt.room){
				s = this.init(it);
				el.room.set(it, s);
			}
			el.room.set(pkey, el);
		}
		
		if (opt.rooms){
			for (let it of opt.rooms){
				s = this.init(it);
				el.rooms.set(it, s);
			}
			el.rooms.set(pkey, el);
		}

	}
	
	getById(id)
	{
	}
	
	remove(sock)
	{
		const pkey = sock.$.pkey;
		const s = this.db.get(pkey);
		if (!s) return;
		s.twins.delete(sock.id);
	//	if (s.twins.size < 1)this.db.delete(pkey);
	}
	
}

module.exports = Pool;

	

