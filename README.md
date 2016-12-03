# JavaScript utilities to read from streams

## Installation

	npm link wg-log
	npm install

## Pull Streams

A pull stream allows to read files byte by byte and provide common conversion functions

    var file = __dirname + "/test.bin"
    var stream = new PullStream();
    return stream.fromFile(file, function(err) {
      ...

Reading bytes of various sizes (big endian)

	assert.strictEqual(0x75, stream.readByte());
	assert.strictEqual(0x6C6C, stream.readShort());
	assert.strictEqual(0x64696E67, stream.readLong());
	assert.strictEqual(0x206F72, stream.read3Bytes());

Reading character strings

	assert.strictEqual('s a', stream.readASCII3());
	assert.strictEqual(' sty', stream.readASCII4());

It's possible to test if there's more data to read in the stream

	assert(stream.hasMore());
	assert(stream.hasMore(100));

And to skip ranges of data

	stream.skip(10);

Scanning the stream allows to look for patterns. Very useful to find signatures

	assert(stream.scan3Bytes(0x2C2077));
	assert(stream.scanLong(0x70756C6C));

## Chunks

A Chunk is a sort of view on a stream which limits access to a pre determined length. Reading for a chunk therefore allows simple boundaries control. A chunk mostly uses the PullStream inteface with a few slightly different details. Chunks are named to help troubleshooting.

Internally, reading from a chunk actually reads from the underlying stream (even for nested chunk) and will actually move forward the read pointer of the stream itself.

A chunk is created from a PullStream

    var chunk = stream.chunk("8K chunk", 8192);
    var chunk = stream.chunk("Rest of file chunk");

or from a chunk (nested chunks)

	var childChunk = chunk.chunk("Nested 1K chunk", 1024);

Reading bytes of various sizes (big endian)

	assert.strictEqual(0x75, chunk.readByte());
	assert.strictEqual(0x6C6C, chunk.readShort());
	assert.strictEqual(0x64696E67, chunk.readLong());
	assert.strictEqual(0x206F72, chunk.read3Bytes());

Reading character strings

	assert.strictEqual('s a', chunk.readASCII3());
	assert.strictEqual(' sty', chunk.readASCII4());
	
It's possible to decode zero-terminated strings with different encodings. The optional ```allowShortRead``` parameter allows to deal with unterminated strings, i.e. strings which are missing the terminal 0x00 (or 0x0000 for 2 byte encodings) and stopping reading at the end of the chunk without throwing an error.

	var str = chunk.readZString88591(allowShortRead);
	var str = chunk.readZStringUTF16(allowShortRead);
	var str = chunk.readZStringUTF8(allowShortRead);

The following functions will read strings until the end of the chunk (non-zero terminated). 

	var str = chunk.readString88591();
	var str = chunk.readStringUTF16();
	var str = chunk.readStringUTF8();

Reading the whole chunk as a binary buffer

	var buffer = chunk.readBuffer();

It's possible to test if there's more data to read in the stream

	assert(chunk.hasMore());
	assert(chunk.hasMore(100));

And to skip ranges of data

	chunk.skip(10);

or to the end of the chunk

	chunk.skip();



