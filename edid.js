'use strict';

var bases = require('bases')
var bigInt = require('big-integer')
var objectAssign = require('object-assign')
var BASE = 58

/**
   Specification: https://en.bitcoin.it/wiki/Base58Check_encoding
*/
var ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
var ZERO = ALPHABET.charAt(0)

var timeFn = Date.now ||  function() { return new Date().getTime() }

var DEFAULT = {
  timeLen: 8,
  shardLen: 3,
  counterLen: 2,
  shardCount: 4000,
  maxCounter: 999,
  epoch: 0
}

var MIN_TIME_LEN = 7 //7 base58 digits allows to encode time util 2039 year only

/**
* Encode number and optionally add leading zeros to ensure required length.
*/
function encode(num, length) {
  var res = bases.toAlphabet(num, ALPHABET)
  while (length && res.length < length) res = ZERO + res
  return res
}


function decode(str) {
  return bases.fromAlphabet(str, ALPHABET)
}

function checkValue(opts, key, maxValue) {
  if (opts[key] > maxValue) throw new Error('Too big ' + key + ': ' + opts[key])
  else if (opts[key] > 0) return opts[key]
  else return maxValue
}

/**
   Generator of base58 ids that are made from 3 pars:
   - time in millisecods since 01.01.1970 (8 chars, range:
   [01.01.1970..27.02.6028])
   - logical shard number (3 chars, range: [0, 195111])
   - loopback counter (2 chars, range: [0, 3363])
   Number of uniqie ids that can be generated per second is:
   `shardCount * (maxCounter + 1) * 1000`. In default configuartion it's
   1000*100*1000=10^8.
   Limiting maxCounter and maxShard allows to generate compact base10
   representation of id that fits into 64bit and so can be stored
   in Redis using 8 bytes instead of 91 + id length bytes.
   @param {object} [opts]
   @param {object} [opts.timeLen=8] Legth of time part (in base58 digits). Max
   time for 7 chars is `new Date(Math.pow(58, 7))` or Dec 20, 2039. Max time for
   8 chars is `new Date(Math.pow(58, 8))` or Feb 27, 6028. 
   @param {object} [opts.shardLen=3] Legth of shard part (in base58 digits).
   @param {object} [opts.counterLen=3] Legth of shard part (in base58 digits).
   @param {number} [opts.shardCount=1000] Total number of shards, should be less
   than or equal to Math.pow(58, shardLen). If opts.shardCount is less than 1 maximum possible value
   is used `Math.pow(58, shardLen)`
   @param {number} [opts.maxCounter=99] Max counter, should be less than
   Math.pow(58, counterLen) - 1. If it's less than 1, maximum value is used.
*/

function EDID(opts) {
  // workaround for call without new
  if (!(this instanceof EDID)) return new EDID(opts)
  objectAssign(this, DEFAULT, opts || {})
  if (this.timeLen < MIN_TIME_LEN || this.shardLen < 1 || this.counterLen < 1) throw new Error('Invalid length.')
  this.shardCount = checkValue(this, 'shardCount', Math.pow(BASE, this.shardLen))
  this.maxCounter = checkValue(this, 'maxCounter', Math.pow(BASE, this.counterLen) - 1)
  this.counter = -1
  //console.log('EDID', this)
}


EDID.prototype.nextCounter = function() {
  if (this.counter < this.maxCounter) this.counter += 1
  else this.counter = 0
  return this.counter
}

function no(value, undefined) {
  return value === undefined || value === null
}

EDID.prototype.validate = function(time, shard, counter, done) {
  //console.log('validate', time, shard, counter)
  if (typeof time !== 'number' || time < 0) {
    return done(new Error('Invalid time: ' + time))
  }
  if (typeof shard !== 'number' || shard < 0 || shard >= this.shardCount) {
    return done(new Error('Invalid shard: ' + shard))
  }
  if (typeof counter !== 'number' || counter < 0 || counter > this.maxCounter) {
    return done(new Error('Invalid counter: ' + counter))
  }
  done()
}

/**
   Generate new id. Usually a shard is decoded from id of parent (like blog post
   for a comment). However you can provide shard number manually. 
   If no 'parent' and 'shard' are provided, current time is used to generate
   random shard. It's an error to provide both shard and parent.
   @param {object} [opts]
   @param {number} [opts.time=Date.now()] Time in millisecods.
   @param {number} [opts.counter] Loopback counter.
   @param {id} [opts.parent] An EDID id (to extract shard number from it).
   @param {number} [opts.shard] A shard number.
   @param {callback} done
*/
EDID.prototype.generate = function(opts, done) {
  if (!done) {
    done = opts
    opts = {}
  }

  var self = this, parent = opts.parent, shard = opts.shard, counter = opts.counter, time = opts.time
  if (!no(parent) && !no(shard)) return done(new Error('Both parent and shard are provided.'))
  if (no(time)) time = timeFn()
  time -= this.epoch
  if (no(shard)) {
    // get shard from parent id or generate new from current time
    if (no(parent)) shard = time % this.shardCount
    else shard = this.parse(parent).shard
  }
  if (no(counter)) counter = this.nextCounter()
  
  this.validate(time, shard, counter, function(err) {
    if (err) return done(err)
    done(null, encode(time, self.timeLen) + encode(shard, self.shardLen) + encode(counter, self.counterLen))
  })
}


EDID.prototype.parse = function(id) {
  var time = decode(id.slice(0, -this.shardLen - this.counterLen))
  var shard = decode(id.slice(-this.shardLen - this.counterLen , -this.counterLen))
  var counter = decode(id.slice(-this.counterLen))
  //console.log('parse', id, time, shard, counter)
  if (id.length < this.timeLen + this.shardLen + this.counterLen) throw('Short id: ' + id)
  this.validate(time, shard, counter, function(err) {
    if (err) throw(err)
  })
  return {
    time: this.epoch + time,
    shard: shard,
    counter: counter,
    source: id
  }
}

EDID.prototype.toString = function() {
  return 'EDID shardCount=' + this.shardCount +
    ', maxCounter=' + this.maxCounter +
    ', timeLen=' + this.timeLen
}

EDID.prototype.getMaxTime = function() {
  return new Date(this.epoch + Math.pow(BASE, this.timeLen))
}


/**
   Encode base58 id as compacted Base10 number that will fit into 64bit long
   integer during next several decades. Such numbers can be stored in Redis
   using in several times less memory than original base58 or full base10
   strings.
   Formula: (time*shardCount + shard)*(maxCounter + 1) + counter

   @param {string} id Generated base58 id.
   @return {string} compacted number using base10 encoding.
*/
EDID.prototype.compact = function(id) {
  var p = this.parse(id)
  return bigInt(p.time - this.epoch).multiply(this.shardCount).add(p.shard).multiply(this.maxCounter + 1).add(p.counter).toString(10)
}

/**
   Restore compacted version of id from base10 to base58.
   @param {string} id Compacted version of id in base10 encoding.
   @return {string} Original Base58 version of id.
*/
EDID.prototype.restore = function(id, done) {
  var tsc = bigInt(id).divmod(this.maxCounter + 1)
  var ts = tsc.quotient.divmod(this.shardCount)
  return this.generate({
    time: this.epoch + ts.quotient.toJSNumber(),
    shard: ts.remainder.toJSNumber(),
    counter: tsc.remainder.toJSNumber()
  }, done)
}


module.exports = EDID
