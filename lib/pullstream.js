/**
 * @file wg-streams - Pull Streams
 *
 * Pull-streams provide a synchronous simplified interface where one can read character
 * by character, or skip chunks of data...
 */
// (C) Alexandre Morin 2015 - 2016

const fs = require('fs');
const Log = require('wg-log').Log;
const Exception = require('wg-log').Exception;

const log = Log.getLogger('wg-streams::PullStream');

const Chunk = require('./chunk.js');



// ================================================================================
// Pull Streams
// ================================================================================

/**
 * Create a new pull-stream
 */
function PullStream() {
  this.buffer = undefined;
  this.position = 0;
  this.maxPosition = undefined;
}
/**
 * Create pull-stream for file
 * @param {string} fileName - is the file name (fully qualified)
 */
PullStream.prototype.fromFile = function(fileName, callback) {
  var that = this;
  that.fileName = fileName;
  that.buffer = undefined;
  that.position = 0;
  log.debug({fileName:fileName}, "Reading file");
  return fs.readFile(fileName, function(err, data) {
    if (err) return callback(err);
    that.buffer = data;
    that.maxPosition = data.length;
    return callback();
  });
}

/**
 * Create a chunk (slice) from the current position and with given length
 * @param {string} name - is the chunk name, used for troubleshooting
 * @param {integer} length - is the chunk length, or undefined for an unlimited chunk (taking the whole file)
 * @param {Chunk} - the newly created chunk
 */
PullStream.prototype.chunk = function(name, length) {
  return new Chunk(name, this, length);
}

/**
 * Is there any more data in this stream?
 * @param {integer} n - the expected number of bytes, or undefined. If undefined, we'll check there's at least one byte
 * @return {boolean} - a boolean value indicating whether there's more data too read or not
 */
PullStream.prototype.hasMore = function(n) {
  var that= this;
  if (n === undefined) n = 1;
  var remaining = that.maxPosition - that.position;
  if (n > remaining) return false;
  return true;
}

/**
 * Skip a certain number of bytes
 * @param {integer} length - is the number of bytes to skip
 */
PullStream.prototype.skip = function(length) {
  var that = this;
  if (length <=0) return;
  that.ensureCapacity(length);
  that.position = that.position + length;
}

/**
 * Ensures that there's more bytes to read. If not, will throw an exception
 * @param {integer} n - the expected number of bytes
 */
PullStream.prototype.ensureCapacity = function(n) {
  var that = this;
  var remaining = that.maxPosition - that.position;
  if (n > remaining) throw new Exception({position:that.position, maxPosition:that.maxPosition, n:n}, "Short read (stream end boundary reached)");
}

/**
 * Read a single byte from the stream. Throws an error if trying to read past the end of the stream
 * @return {integer} - The next byte in the stream
 */
PullStream.prototype.readByte = function() {
  var that = this;
  that.ensureCapacity(1);
  var byte = that.buffer[that.position];
  that.position = that.position + 1;
  return byte;
}

/**
 * Read a single short from the stream. Throws an error if trying to read past the end of the stream
 * @return {integer} - The next short in the stream (big endian)
 */
PullStream.prototype.readShort = function() {
  var that = this;
  that.ensureCapacity(2);
  var b1 = that.buffer[that.position];
  var b2 = that.buffer[that.position+1];
  that.position = that.position + 2;
  return (b1<<8)+b2;
}

/**
 * Read a single 3-bytes from the stream. Throws an error if trying to read past the end of the stream
 * @return {integer} - The next 3-bytes in the stream (big endian)
 */
PullStream.prototype.read3Bytes = function() {
  var that = this;
  that.ensureCapacity(3);
  var b1 = that.buffer[that.position];
  var b2 = that.buffer[that.position+1];
  var b3 = that.buffer[that.position+2];
  that.position = that.position + 3;
  return (((b1<<8)+b2)<<8)+b3;
}

/**
 * Read a single long from the stream. Throws an error if trying to read past the end of the stream
 * @return {integer} - The next long in the stream (big endian)
 */
PullStream.prototype.readLong = function() {
  var that = this;
  that.ensureCapacity(4);
  var b1 = that.buffer[that.position];
  var b2 = that.buffer[that.position+1];
  var b3 = that.buffer[that.position+2];
  var b4 = that.buffer[that.position+3];
  that.position = that.position + 4;
  return (((((b1<<8)+b2)<<8)+b3)<<8)+b4
}

/**
 * Read a single 3-bytes from the stream as a string. Throws an error if trying to read past the end of the stream
 * @return {string} - The 3-characters string
 */
PullStream.prototype.readASCII3 = function() {
  var that = this;
  that.ensureCapacity(3);
  var b1 = that.buffer[that.position];
  var b2 = that.buffer[that.position+1];
  var b3 = that.buffer[that.position+2];
  that.position = that.position + 3;
  return String.fromCharCode(b1, b2, b3);
}

/**
 * Read a single 4-bytes from the stream as a string. Throws an error if trying to read past the end of the stream
 * @return {string} - The 4-characters string
 */
PullStream.prototype.readASCII4 = function() {
  var that = this;
  that.ensureCapacity(4);
  var b1 = that.buffer[that.position];
  var b2 = that.buffer[that.position+1];
  var b3 = that.buffer[that.position+2];
  var b4 = that.buffer[that.position+3];
  that.position = that.position + 4;
  return String.fromCharCode(b1, b2, b3, b4);
}

/**
 * Scan the stream looking for a "magic" 3-bytes number
 * @return {boolean} - A boolean indicating whether the magic number was found. If so the stream is left at the
 *             position right after the magic number is found.
 */
PullStream.prototype.scan3Bytes = function(expected) {
  var that = this;
  var magic = 0;
  while (that.hasMore()) {
    var b = that.readByte();
    magic = ((magic & 0XFFFF) << 8) + b;
    if (magic === expected) return true;
  }
  return false;
}

/**
 * Scan the stream looking for a "magic" long (4 bytes) number
 * @return {boolean} - A boolean indicating whether the magic number was found. If so the stream is left at the
 *             position right after the magic number is found.
 */
PullStream.prototype.scanLong = function(expected) {
  var that = this;
  var magic = 0;
  while (that.hasMore()) {
    var b = that.readByte();
    magic = ((magic & 0XFFFFFF) << 8) + b;
    if (magic === expected) return true;
  }
  return false;
}



/**
 * Public module interface
 */
if (typeof(module) !== "undefined") {
  module.exports = PullStream;
}
