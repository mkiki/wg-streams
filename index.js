/**
 * wg-collections - NPM package entry point
 */
// (C) Alexandre Morin 2015 - 2016

const PullStream = require('./lib/pullstream.js');
const Chunk = require('./lib/chunk.js');

/**
 * Public interface
 */
module.exports = {
  PullStream: PullStream,
  Chunk: Chunk
};
