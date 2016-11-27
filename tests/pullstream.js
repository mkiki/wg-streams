/**
 * wg-streams - PullStream unit tests
 */
// (C) Alexandre Morin 2015 - 2016

const assert = require('assert');
const fs = require('fs');
const PullStream = require('../lib/pullstream.js');

describe('PullStream', function() {

  it('Should read different elements', function(done) {
    var file = __dirname + "/./data/file1.txt"
    var stream = new PullStream();
    return stream.fromFile(file, function(err) {
      if (err) return done(err);
      assert.strictEqual(0x50, stream.readByte());
      assert.strictEqual(0x75, stream.readByte());
      assert.strictEqual(0x6C6C, stream.readShort());
      assert.strictEqual(0x20, stream.readByte());
      assert.strictEqual(0x636F, stream.readShort(), "Unaligned short");
      assert.strictEqual(0x64696E67, stream.readLong());
      assert.strictEqual(0x206F72, stream.read3Bytes());
      stream.skip(10);
      assert.strictEqual(0x6C6C2069, stream.readLong());
      assert.strictEqual('s a', stream.readASCII3());
      assert.strictEqual(' sty', stream.readASCII4());
      assert(stream.scan3Bytes(0x2C2077)); // ", w"
      assert.strictEqual(0x68657265, stream.readLong());
      assert(stream.scanLong(0x70756C6C)); // "pull"
      assert.strictEqual(0x20636F64, stream.readLong());
      stream.skip(367);  // only 3 bytes remaining
      assert.strictEqual(0x65, stream.readByte(), "Almost at the end of the file");
      assert(stream.hasMore(2));
      assert(!stream.hasMore(3));
      assert(stream.hasMore());
      stream.readShort();
      assert(!stream.hasMore());
      assert(!stream.hasMore(1));
      return done();
    });
  });

});

