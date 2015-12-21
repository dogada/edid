'use strict';

var bigInt = require('big-integer')
var EDID = require('../edid')

function bitCount(base10Str) {
  return bigInt(base10Str, 10).toString(2).length
}

function compactAndRestore(edid, id, bits, done) {
  var compacted = edid.compact(id)
  expect(bitCount(compacted)).equals(bits)
  edid.restore(compacted, function(err, restored) {
    expect(restored).equals(id)
    done(err)
  })
}

describe('default EDID (length of ids is 13, time until 6028 year)', function () {

  var edid = new EDID();
  var parentId

  before(function(done) {
    edid.generate({shard: 7, time: new Date(2015, 1, 1).getTime(), counter: 10}, function(err, id) {
      parentId = id // save for future in closure
      done()
    })
  })

  it('properties of the generator', function() {
    expect(edid).property('shardCount', 4000)
    expect(edid).property('maxCounter', 999)
    expect(edid).property('timeLen', 8)
    expect(edid).property('shardLen', 3)
    expect(edid).property('counterLen', 2)
    expect(edid.getMaxTime().getFullYear()).equals(6028)
  })

  it('should generate id without known shard', function(done) {
    edid.generate(function(err, id) {
      expect(id).length(13)
      done()
    })
  })

  it('should generate and parse id with a shard', function(done) {
    edid.generate({shard: 312}, function(err, id) {
      expect(id).length(13)
      expect(edid.parse(id)).property('shard', 312)
      done()
    })
  })

  it('should generate and parse id with a parent and time', function(done) {
    edid.generate({parent: parentId, time: 0}, function(err, id) {
      expect(id).length(13)
      expect(edid.parse(id)).property('time', 0)
      expect(edid.parse(id)).property('shard', 7)
      done()
    })
  })

  it('should generate and parse id with shard, time and counter', function(done) {
    edid.generate({parent: parentId, time: new Date('2015-01-01').getTime(), counter: 10}, function(err, id) {
      expect(id).length(13)
      expect(edid.parse(id)).eql({shard: 7,
                                  counter: 10,
                                  time: 1420070400000,
                                  source: '1eJZkzQo1181B'})
      done()
    })
  })

  it('should compact base58 int to 64bit base10 int until 2116 year', function(done) {
    edid.generate({parent: parentId, time: new Date(2116, 1, 1).getTime(), counter: 99}, function(err, id) {
      compactAndRestore(edid, id, 64, done)
    })
  })

  
  function expectError(opts, done) {
    edid.generate(opts, function(err, id) {
      expect(err)
      done()
    })
  }

  it('should send error when both parent and shard are provided', function(done) {
    expectError({parent: parentId, shard: 1}, done)
  })

  it('should send error when shard isn\'t number', function(done) {
    expectError({shard: 'Something'}, done)
  })

  it('should send error when shard is negative', function(done) {
    expectError({shard: -1}, done)
  })

  it('should send error when shard is too big', function(done) {
    expectError({shard: 58 * 58 * 58}, done)
  })

  it('should send error when time isn\'t number', function(done) {
    expectError({time: '20150121'}, done)
  })

  it('should send error when time is negative', function(done) {
    expectError({time: -1}, done)
  })

  it('should send error when counter isn\'t number', function(done) {
    expectError({counter: '42'}, done)
  })

  it('should send error when counter is negative', function(done) {
    expectError({counter: -1}, done)
  })

  it('should send error when counter is too big', function(done) {
    expectError({counter: 58 * 58}, done)
  })

})

describe('default EDID with custom epoch since 2015', function () {

  var epoch = new Date(2015, 0, 1).getTime()
  var edid = new EDID({
    epoch: epoch
  })
  var parentId

  before(function(done) {
    edid.generate({shard: 1001, time: new Date(2015, 7, 1).getTime(), counter: 5}, function(err, id) {
      parentId = id // save for future in closure
      done()
    })
  })

  it('properties of the generator', function() {
    expect(edid).property('timeLen', 8)
    expect(edid).property('shardLen', 3)
    expect(edid).property('counterLen', 2)
    expect(edid).property('epoch', epoch)
    expect(edid.getMaxTime().getFullYear()).equals(6073)
  })

  it('should generate id without known shard', function(done) {
    edid.generate(function(err, id) {
      expect(id).length(13)
      done()
    })
  })

  it('should generate and parse id with a shard', function(done) {
    edid.generate({parent: parentId}, function(err, id) {
      expect(id).length(13)
      expect(edid.parse(id)).property('shard', 1001)
      done()
    })
  })

  it('should compact base58 int to 64bit base10 int until 2161 year', function(done) {
    edid.generate({parent: parentId, time: new Date(2161, 1, 1).getTime(), counter: 99}, function(err, id) {
      compactAndRestore(edid, id, 64, done)
    })
  })

})

describe('EDID with shardCount=100, maxCounter=9999', function () {

  var edid = new EDID({shardCount: 100, counterLen: 3, maxCounter: 9999})
  var parentId

  before(function(done) {
    edid.generate({shard: 11, time: new Date(2015, 1, 1).getTime(), counter: 5}, function(err, id) {
      parentId = id // save for future in closure
      done()
    })
  })

  it('properties of the generator', function() {
    expect(edid).property('shardCount', 100)
    expect(edid).property('maxCounter', 9999)
    expect(edid).property('timeLen', 8)
    expect(edid).property('shardLen', 3)
    expect(edid).property('counterLen', 3)
    expect(edid.getMaxTime().getFullYear()).equals(6028)
  })

  it('should generate id without known shard', function(done) {
    edid.generate(function(err, id) {
      expect(id).length(14)
      done()
    })
  })

  it('should generate and parse id with a shard', function(done) {
    edid.generate({parent: parentId}, function(err, id) {
      expect(id).length(14)
      expect(edid.parse(id)).property('shard', 11)
      done()
    })
  })

  it('should compact base58 int to 64bit base10 int until 2084 year', function(done) {
    edid.generate({parent: parentId, time: new Date(2085, 1, 1).getTime(), counter: 99}, function(err, id) {
      compactAndRestore(edid, id, 62, done)
    })
  })

})

describe('EDID with shardCount=0, maxCounter=0', function () {

  var edid = new EDID({shardCount: 0, maxCounter: 0})

  var parentId

  before(function(done) {
    edid.generate({shard: 1001, time: new Date(2015, 7, 1).getTime(), counter: 5}, function(err, id) {
      parentId = id // save for future in closure
      done()
    })
  })

  it('properties of the generator', function() {
    expect(edid).property('shardCount', 195112)
    expect(edid).property('maxCounter', 3363)
    expect(edid).property('timeLen', 8)
    expect(edid).property('shardLen', 3)
    expect(edid).property('counterLen', 2)
    expect(edid.getMaxTime().getFullYear()).equals(6028)
  })

  it('should generate id without known shard', function(done) {
    edid.generate(function(err, id) {
      expect(id).length(13)
      done()
    })
  })

  it('should generate and parse id with a shard', function(done) {
    edid.generate({parent: parentId}, function(err, id) {
      expect(id).length(13)
      expect(edid.parse(id)).property('shard', 1001)
      done()
    })
  })

  it('should compact base58 int to base10 int using 72 bits', function(done) {
    edid.generate({parent: parentId, time: new Date(2100, 1, 1).getTime(), counter: 99}, function(err, id) {
      compactAndRestore(edid, id, 72, done)
    })
  })

})

describe('EDID with timeLen=7 (id length is 12, time until 2039 year)', function () {

  var edid = new EDID({timeLen: 7})
  var parentId

  before(function(done) {
    edid.generate({shard: 1001, time: new Date(2015, 7, 1).getTime(), counter: 5}, function(err, id) {
      parentId = id // save for future in closure
      done()
    })
  })

  it('properties of the generator', function() {
    expect(edid).property('shardCount', 4000)
    expect(edid).property('maxCounter', 999)
    expect(edid).property('timeLen', 7)
    expect(edid).property('shardLen', 3)
    expect(edid).property('counterLen', 2)
    expect(edid.getMaxTime().getFullYear()).equals(2039)
  })

  it('should generate id without known shard', function(done) {
    edid.generate(function(err, id) {
      expect(id).length(12)
      done()
    })
  })

  it('should generate and parse id with a shard', function(done) {
    edid.generate({parent: parentId}, function(err, id) {
      expect(id).length(12)
      expect(edid.parse(id)).property('shard', 1001)
      done()
    })
  })

})

describe('EDID with timeLen=7 and custom epoch since 2015 (id length is 12, time until 2084 year)', function () {


  var edid = new EDID({
    timeLen: 7,
    epoch: new Date(2015, 0, 1).getTime()
  })
  var parentId

  before(function(done) {
    edid.generate({shard: 1001, time: new Date(2015, 7, 1).getTime(), counter: 5}, function(err, id) {
      parentId = id // save for future in closure
      done()
    })
  })

  it('properties of the generator', function() {
    expect(edid).property('timeLen', 7)
    expect(edid).property('shardLen', 3)
    expect(edid).property('counterLen', 2)
    expect(edid.getMaxTime().getFullYear()).equals(2084)
  })

  it('should generate id without known shard', function(done) {
    edid.generate(function(err, id) {
      expect(id).length(12)
      done()
    })
  })

  it('should generate and parse id with a shard', function(done) {
    edid.generate({parent: parentId}, function(err, id) {
      expect(id).length(12)
      expect(edid.parse(id)).property('shard', 1001)
      compactAndRestore(edid, id, 57, done)
    })
  })

})

