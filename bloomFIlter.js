/**
 *	A Bloom filter is a space-efficient, probabilistic data structure used to test
 *		whether an element is a member of a set.
 *
 *	False positives are possible (it may say an item "might be in the set" when it
 *		actually isn't), but false negatives are not (if it says an item is
 * 		"definitely not in the set", that is always true).
 *
 */

/**
 *	Real-world Applications
 *
 *	Databases -> checking whether a key might exist on disk before doing an
 * 		expensive disk read (e.g. Cassandra, LevelDB/RocksDB use this to skip
 * 		SSTables that definitely don't contain a key).
 *
 *	Web browsers -> Chrome used a Bloom filter to check URLs against a list of
 * 		known-malicious sites before doing a full lookup.
 *
 *	Distributed systems -> quickly checking set membership across nodes without
 * 		transferring the full set over the network.
 *
 */

/**
 *	Implementations
 *
 *	- djb2 hash function
 *	- FNV-1a hash function
 *	- BloomFilter class (uses the two hashes above + the Kirsch-Mitzenmacher
 *		double hashing trick to simulate `numHashes` independent hash functions)
 *
 */

/**
 * djb2 string hash
 * @param {*} str - string to hash
 * @returns an unsigned 32-bit integer hash of the string
 *
 */
function djb2Hash(str) {
	// 1. Start `hash` at the seed value 5381.
	// 2. For each character in `str`:
	//      - multiply `hash` by 33
	//      - add (or XOR) the character's char code (str.charCodeAt(i))
	// 3. Force the result to an unsigned 32-bit integer before returning
	//      (JS bitwise math is signed 32-bit, so use `>>> 0`).

	let hash = 5381; // seed value
	for (let i=0; i<str.length; i++) {
		hash *= 33;
		hash ^= str.charCodeAt(i);
	}

	return hash >>> 0;
}

/**
 * FNV-1a string hash
 * @param {*} str - string to hash
 * @returns an unsigned 32-bit integer hash of the string
 *
 */
function fnv1aHash(str) {
	// 1. Start `hash` at the FNV offset basis: 2166136261.
	// 2. For each character in `str`:
	//      - XOR `hash` with the character's char code
	//      - multiply the result by the FNV prime, 16777619
	//        (use Math.imul(a, b) so the multiplication overflows correctly like a 32-bit int)
	// 3. Force the result to an unsigned 32-bit integer before returning.

	let hash = 2166136261;
	for (let i=0; i<str.length; i++) {
		hash ^= str.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}

	return hash >>> 0;
}

/**
 * BloomFilter
 *
 * A fixed-size bit array plus a fixed number of hash functions, supporting:
 * 		add(item): mark an item as present
 * 		mightContain(item): test whether an item may have been added
 *
 */
class BloomFilter {
	/**
	 * @param {*} size - number of bits in the underlying bit array (this is "m")
	 * @param {*} numHashes - number of hash functions to simulate per item (this is "k")
	 */
	constructor(size, numHashes) {
		this.size = size;
		this.numHashes = numHashes;
		this.bitArray = new Uint8Array(size);
	}

	/**
	 * Derive `numHashes` bit-array indices for an item using the
	 * Kirsch-Mitzenmacher double hashing trick, instead of writing
	 * `numHashes` separate hash functions from scratch.
	 * @param {*} item - string to compute indices for
	 * @returns an array of `numHashes` indices into `this.bitArray`
	 *
	 */
	_getHashIndices(item) {
		// 1. Compute two base hashes: hashA = djb2Hash(item), hashB = fnv1aHash(item)
		// 2. For i = 0 to this.numHashes - 1:
		//      - combinedHash = (hashA + i * hashB), forced unsigned with `>>> 0`
		//      - index = combinedHash % this.size
		//      - collect `index` into a results array
		// 3. Return the array of indices

		const hashA = djb2Hash(item);
		const hashB = fnv1aHash(item);
		const results = [];

		for (let i=0; i<this.numHashes; i++) {
			const combinedHash = (hashA + i * hashB) >>> 0;
			results.push(combinedHash % this.size);
		}

		return results;
	}

	/**
	 * Mark an item as present in the filter.
	 * @param {*} item - string to add
	 *
	 */
	add(item) {
		// 1. Get this item's indices via this._getHashIndices(item)
		// 2. For each index, set this.bitArray[index] = 1

		const itemIndices = this._getHashIndices(item);

		for (let i=0; i<itemIndices.length; i++) {
			this.bitArray[itemIndices[i]] = 1;
		}
	}

	/**
	 * Test whether an item may have been added to the filter.
	 * @param {*} item - string to test
	 * @returns false -> item was definitely never added
	 * @returns true -> item was probably added (could be a false positive)
	 *
	 */
	mightContain(item) {
		// 1. Get this item's indices via this._getHashIndices(item)
		// 2. If ANY of those bits in this.bitArray is 0, return false
		// 3. If ALL of those bits are 1, return true

		const itemIndices = this._getHashIndices(item);
		for (let i=0; i<itemIndices.length; i++) {
			if (this.bitArray[itemIndices[i]] === 0) {
				return false;
			}
		}

		return true;
	}
}

// Items to add to the filter, and items to test that were never added
const itemsToAdd = ["apple", "banana", "cherry"];
const itemsNotAdded = ["grape", "mango"];

// To experiment, adjust `size`/`numHashes` above and see how the false-positive
// rate for `itemsNotAdded` changes as the filter fills up.
const filter = new BloomFilter(100, 3);

itemsToAdd.forEach(item => filter.add(item));

itemsToAdd.forEach(item => console.log(`${item} (expect true):`, filter.mightContain(item)));
itemsNotAdded.forEach(item => console.log(`${item} (expect false):`, filter.mightContain(item)));

// Disclaimer: the implementation above is purely for learning purposes. Most languages
// have existing production-ready packages that can be explored and used.
