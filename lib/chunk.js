/**
 * @file wg-streams - Chunks
 *
 * A Chunk is a light overlay on Pull Stream which allows to provide a reading window and
 * prevent reading past the chunk boundaries. Chunks can be hierarchical
 *
 */
// (C) Alexandre Morin 2015 - 2016

const fs = require('fs');
const Log = require('wg-log').Log;
const Exception = require('wg-log').Exception;

const log = Log.getLogger('wg-streams::Chunk');




// ================================================================================
// Chunks
// ================================================================================

/**
 * Create a chunk
 * A chunk is like a windows on a buffered Stream that prevents reading past the chunk boundaries
 *
 * @param {string} name - is a friendly name for the chunk, used to troubleshoot
 * @param {PullStream} stream - is the underlying buffered stream
 * @param {integer} length - is the length of the chunk. Reads will fail beyond this limit
 *                           If left undefined, the chunk is unbounded (or more accurately bounded by the file end)
 */
function Chunk(name, stream, length) {
  var that = this;
  that.name = name;
  that.stream = stream;
  if (length === undefined)
    that.maxPosition = stream.maxPosition;
  else
    that.maxPosition = stream.position + length;
  log.debug({name:name, maxPosition:that.maxPosition, position:that.stream.position}, "New chunk");
}

/**
 * Create a sub-chunk (slice) from the current position and with given length
 * @param {string} name - is the chunk name, used for troubleshooting
 * @param {integer} length - is the chunk length, or undefined for an unlimited chunk (taking the whole file)
 * @param {Chunk} - the newly created chunk
 */
Chunk.prototype.chunk = function(name, length) {
  return new Chunk(name, this.stream, length);
}

/**
 * Is there any more data in this chunk?
 * @param {integer} n - the expected number of bytes, or undefined. If undefined, we'll check there's at least one byte
 * @return {boolean} - a boolean value indicating whether there's more data too read or not
 */
Chunk.prototype.hasMore = function(n) {
  var that = this;
  log.debug({n:n, maxPosition:that.maxPosition, position:that.stream.position}, "Chunk has more?");
  if (n === undefined) n = 1;
  var remaining = that.maxPosition - that.stream.position;
  if (n > remaining) return false;
  return true;
}

/**
 * Skip to the end of the chunk
 * @param {integer} length - is the number of bytes to skip. If undefined, then skip the whole chunk
 */
Chunk.prototype.skip = function(n) {
  var that = this;
  if (n === undefined) {
    var remaining = that.maxPosition - that.stream.position;
    if (remaining <= 0) return;
    that.ensureCapacity(remaining);
    that.stream.skip(remaining);
  }
  else {
    if (n<=0) return;
    that.ensureCapacity(n);
    that.stream.skip(n);
  }
}

/**
 * Extend the chunk
 * @param {integer} n - the number of bytes to extend to
 */
Chunk.prototype.extend = function(n) {
  var that = this;
  if (that.maxPosition) that.maxPosition = that.maxPosition + n;
}

/**
 * Ensures that there's more bytes to read. If not, will throw an exception
 * @param {integer} n - the expected number of bytes
 */
Chunk.prototype.ensureCapacity = function(n) {
  var that = this;
  var remaining = that.maxPosition - that.stream.position;
  if (n > remaining) throw new Exception({position:that.stream.position, maxPosition:that.maxPosition, n:n}, "Short read (chunk end boundary reached)");
}

/**
 * Read a single byte from the chunk. Throws an error if trying to read past the end of the chunk
 * @return {integer} - The next byte in the chunk
 */
Chunk.prototype.readByte = function() {
  var that = this;
  that.ensureCapacity(1);
  return that.stream.readByte();
}

/**
 * Read a single short from the chunk. Throws an error if trying to read past the end of the chunk
 * @return {integer} - The next short in the chunk (big endian)
 */
Chunk.prototype.readShort = function() {
  var that = this;
  that.ensureCapacity(2);
  return that.stream.readShort();
}

/**
 * Read a single 3-bytes from the chunk. Throws an error if trying to read past the end of the chunk
 * @return {integer} - The next 3-bytes in the chunk (big endian)
 */
Chunk.prototype.read3Bytes = function() {
  var that = this;
  that.ensureCapacity(3);
  return that.stream.read3Bytes();
}

/**
 * Read a single long from the chunk. Throws an error if trying to read past the end of the chunk
 * @return {integer} - The next long in the chunk (big endian)
 */
Chunk.prototype.readLong = function() {
  var that = this;
  that.ensureCapacity(4);
  return that.stream.readLong();
}

/**
 * Read a single 3-bytes from the chunk as a string. Throws an error if trying to read past the end of the chunk
 * @return {string} - The 3-characters string
 */
Chunk.prototype.readASCII3 = function() {
  var that = this;
  that.ensureCapacity(3);
  return that.stream.readASCII3();
}

/**
 * Read a single 4-bytes from the chunk as a string. Throws an error if trying to read past the end of the chunk
 * @return {string} - The 4-characters string
 */
Chunk.prototype.readASCII4 = function() {
  var that = this;
  that.ensureCapacity(4);
  return that.stream.readASCII4();
}

/**
 * Read a ISO-8859-1 null terminated string from the chunk. This will read as much bytes as possible,
 * until reaching a terminal 0. If there's no terminal 0, then an exception will be thrown trying to read
 * pas the chunk boundaries.
 *
 * @param {boolean} allowShortRead - Optionally set to true to accept strings without a final 0 (will read till end of stream)
 * @return {string} - The decoded string (without the termination 0)
 */
Chunk.prototype.readZString88591 = function(allowShortRead) {
  var that = this;
  var str = "";
  var buffer = that.stream.buffer;
  while ((that.maxPosition - that.stream.position) > 0) {
    var b = buffer[that.stream.position];
    that.stream.position = that.stream.position + 1;
    if (b === 0) return str;
    str = str + String.fromCharCode(b);
  }
  if (allowShortRead === true) return str;
  throw new Exception("Short read (chunk end boundary reached) when reading ISO-8859-1 string");
}

/**
 * Read a UNICODE null terminated string from the chunk. This will read as much bytes as possible,
 * until reaching a terminal 0. If there's no terminal 0, then an exception will be thrown trying to read
 * pas the chunk boundaries.
 *
 * @param {boolean} allowShortRead - Optionally set to true to accept strings without a final 0 (will read till end of stream)
 * @return {string} - The decoded string (without the termination 0)
 */
Chunk.prototype.readZStringUTF16 = function(allowShortRead) {
  var that = this;
  var str = "";
  var buffer = that.stream.buffer;
  var from = that.stream.position;
  var bigEndian = false;
  while ((that.maxPosition - that.stream.position) > 1) {
    var b1 = buffer[that.stream.position];
    var b2 = buffer[that.stream.position+1];
    that.stream.position = that.stream.position + 2;
    if (b1 === 0xFF && b2 === 0x00) {
      // Some ID3 tags have malformed BOMs. In this case, the BOM is 0xFF 0x00 0xFE which should be read 0xFE 0xFF 0x00
      b2 = b1;
      b1 = buffer[that.stream.position];
      buffer[that.stream.position] = 0;
      buffer[that.stream.position-1] = b1;
    }
    if (b1 === 0xFF && b2 === 0xFE) { from = from + 2; continue; }
    if (b1 === 0xFE && b2 === 0xFF) { bigEndian = true; from = from + 2; continue; }
    if (b1 === 0x00 && b2 === 0x00) {
      return _ucs2(buffer, from, that.stream.position-2, false);
    }
    if (bigEndian) {
      buffer[that.stream.position-2] = b2;
      buffer[that.stream.position-1] = b1;
    }
  }
  if (allowShortRead === true) {
    return _ucs2(buffer,from, that.maxPosition, bigEndian);
  }
  throw new Exception("Short read (chunk end boundary reached) when reading UTF-16 string");
}

function _ucs2(buffer, from, to, bigEndian) {
  if (!bigEndian)
    return buffer.toString('ucs2',from, to);
  var len = to-from;
  var b2 = new Buffer(len);
  for (var i=0; i<len-1; i+=2) {
    b2[i] = buffer[from+i];
    b2[i+1] = buffer[from+i+1];
  }
  return b2.toString('ucs2');
}


/**
 * Read a UTF-8 null terminated string from the chunk. This will read as much bytes as possible,
 * until reaching a terminal 0. If there's no terminal 0, then an exception will be thrown trying to read
 * pas the chunk boundaries.
 *
 * @param {boolean} allowShortRead - Optionally set to true to accept strings without a final 0 (will read till end of stream)
 * @return {string} - The decoded string (without the termination 0)
 */
Chunk.prototype.readZStringUTF8 = function(allowShortRead) {
  var that = this;
  var str = "";
  var buffer = that.stream.buffer;
  var from = that.stream.position;
  while ((that.maxPosition - that.stream.position) >= 1) {
    var b = buffer[that.stream.position];
    that.stream.position = that.stream.position + 1;
    if (b === 0) {
      return buffer.toString('utf8',from, that.stream.position-1); 
    }
  }
  if (allowShortRead === true) return buffer.toString('utf8',from, that.maxPosition); 
  throw new Exception("Short read (chunk end boundary reached) when reading UTF-8 string");
}

/**
 * Read a ISO-8859-1 string from the chunk. This will read as much bytes as possible until the end of the chunk.
 *
 * @return {string} - The decoded string
 */
Chunk.prototype.readString88591 = function() {
  var that = this;
  var str = "";
  var buffer = that.stream.buffer;
  while ((that.maxPosition - that.stream.position) > 0) {
    var b = buffer[that.stream.position];
    that.stream.position = that.stream.position + 1;
    str = str + String.fromCharCode(b);
  }
  return str;
}

/**
 * Read a UTF-8 string from the chunk. This will read as much bytes as possible until the end of the chunk.
 *
 * @return {string} - The decoded string
 */
Chunk.prototype.readStringUTF8 = function() {
  var that = this;
  return that.stream.buffer.toString('utf8', that.stream.position, that.maxPosition);
}

/**
 * Read a UTF-8 string from the chunk. This will read as much bytes as possible until the end of the chunk.
 *
 * @return {string} - The decoded string
 */
Chunk.prototype.readStringUTF16 = function() {
  var that = this;
  return that.stream.buffer.toString('ucs2', that.stream.position, that.maxPosition);
}

/**
 * Read a buffer from the chunk. This will read as much bytes as possible until the end of the chunk.
 *
 * @return {Buffer} - The buffer
 */
Chunk.prototype.readBuffer = function() {
  var that = this;
  return that.stream.buffer.slice(that.stream.position, that.maxPosition);
}



/**
 * Public module interface
 */
if (typeof(module) !== "undefined") {
  module.exports = Chunk;
}
