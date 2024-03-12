/**
 * Message
 */
"use strict";

const ts = require('abv-ts')('abv:Msg');
const File = require('abv-vfs/File');

class Msg extends File
{// TODO: mv the Message stuff here
	constructor(name='', body='', type=null)
 	{
		super(name, body, type);
	}
	
	get cmd(){ return this.c; }
	set cmd(v){ this.c = v; }

	get from(){ return this.f; }
	set from(v){ this.f = v; }

	get to(){ return this.t; }
	set to(v){ this.t = v;}

	get src(){ return this.s; }
	set src(v){ this.s = v; }

	get dst(){ return this.d; }
	set dst(v){ this.d = v; }

	get call(){ return this.m; }
	set call(v){ this.m = v; }

	get err(){ return this.e; }
	set err(v){ this.e = v; }
	
}

module.exports = Msg;

	

