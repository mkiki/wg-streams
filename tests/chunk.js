/**
 * wg-streams - Chunk unit tests
 */
// (C) Alexandre Morin 2015 - 2016

const assert = require('assert');
const fs = require('fs');
const PullStream = require('../lib/pullstream.js');
const Chunk = require('../lib/chunk.js');

describe('Chunk', function() {

  it('Should read chunk (whole file chunk)', function(done) {
    var file = __dirname + "/./data/file1.txt"
    var stream = new PullStream();
    return stream.fromFile(file, function(err) {
      if (err) return done(err);
      var chunk = stream.chunk("Whole file");
      assert.strictEqual(0x50, chunk.readByte());
      assert.strictEqual(0x75, chunk.readByte());
      assert.strictEqual(0x6C6C, chunk.readShort());
      assert.strictEqual(0x20, chunk.readByte());
      assert.strictEqual(0x636F, chunk.readShort(), "Unaligned short");
      assert.strictEqual(0x64696E67, chunk.readLong());
      assert.strictEqual(0x206F72, chunk.read3Bytes());
      chunk.skip(10);
      assert.strictEqual(0x6C6C2069, chunk.readLong());
      assert.strictEqual('s a', chunk.readASCII3());
      assert.strictEqual(' sty', chunk.readASCII4());
      chunk.skip(705);  // only 3 bytes remaining
      assert.strictEqual(0x65, chunk.readByte(), "Almost at the end of the file");
      assert(chunk.hasMore(2));
      assert(!chunk.hasMore(3));
      assert(chunk.hasMore());
      chunk.readShort();
      assert(!chunk.hasMore());
      assert(!chunk.hasMore(1));
      return done();
    });
  });

  it('Should read chunk (300 bytes)', function(done) {
    var file = __dirname + "/./data/file1.txt"
    var stream = new PullStream();
    return stream.fromFile(file, function(err) {
      if (err) return done(err);
      var chunk = stream.chunk("Small chunk", 300);
      assert.strictEqual(0x50, chunk.readByte());
      assert.strictEqual(0x75, chunk.readByte());
      assert.strictEqual(0x6C6C, chunk.readShort());
      assert.strictEqual(0x20, chunk.readByte());
      assert.strictEqual(0x636F, chunk.readShort(), "Unaligned short");
      assert.strictEqual(0x64696E67, chunk.readLong());
      assert.strictEqual(0x206F72, chunk.read3Bytes());
      chunk.skip(10);
      assert.strictEqual(0x6C6C2069, chunk.readLong());
      assert.strictEqual('s a', chunk.readASCII3());
      assert.strictEqual(' sty', chunk.readASCII4());
      assert(chunk.hasMore(265));
      assert(!chunk.hasMore(266));
      chunk.skip();
      assert(!chunk.hasMore());
      assert.strictEqual(0x6C792069, stream.readLong(), "Read from stream after chunk");
      return done();
    });
  });

});

