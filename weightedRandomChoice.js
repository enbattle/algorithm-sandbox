/**
 *	A weighted random choice algorithm is a method to randomly select an item from a list
 *		where each item has a specific probability, or weight, of being chosen.
 * 
 *	In standard random choice, all items have an equal chance of being
 *		chosen, but in weighted random choice algorithms, items with a higher weight
 * 		are chosen more frequently.
 * 
 */

/**
 *	Real-world Applications
 *
 *	Game development -> determining loot drops using weights
 * 		(i.e. a common sword drops 70% of the time,
 *			a legendary shield drops 1% of the time).
 * 
 * 	Load balancing -> cloud networks route web traffic via weights
 * 		so that more requests are sent to higher capacity servers
 * 		and less requests are sent to lower capacity servers.
 *
 *	Digital Advertising -> Ad servers use weights to ensure that high-budget ads are shown more frequently 
 * 		than low-budget ads
 *
 */

/**
 *	Implementations
 * 
 *	- Cumulative Sum (Linear Scan) (CSLS)
 *	- Prefix sum with binary search (PSBS)
 * 
 */

/**
 * Find random weighted choice index with cumulative sum (linear scan)
 * @param {*} weights - list of numbers that represent each item's probability of being chosen
 * @param {*} randomVal - random value generated between [0 and 1) using Math.random()
 * @returns index of the weight (which corresponds to the item)
 * 
 */
function findRandomWeightedIndexCSLS(weights, randomVal) {
	let sumOfWeights = 0;
	let runningTotalWeight = 0;

	sumOfWeights = weights.reduce((prevWeight, curWeight) => prevWeight + curWeight, 0);
	let targetWeight = randomVal * sumOfWeights;

	for (let i=0; i<weights.length; i++) {
		runningTotalWeight += weights[i];

		if(runningTotalWeight > targetWeight) {
			return i;
		}
	}

	// Fallback in case weights is an empty array
	return weights.length - 1;
}

/**
 * Find random weighted choice index with prefix sum and binary search
 * 
 * This is a helper function to initialize the target value and prefix sum array
 * 
 * @param {*} weights - list of numbers that represent each item's probability of being chosen
 * @param {*} randomVal - random value generated between [0 and 1) using Math.random()
 * @returns index of the weight (which corresponds to the item) from the main part of the PSBS algorithm
 */
function findRandomWeightedIndexPSBSHelper(weights, randomVal) {
	let currentThreshold = 0;
	let thresholds = weights.map(weight => currentThreshold += weight);
	let targetWeight = randomVal * currentThreshold;

	return findRandomWeightedIndexPSBS(thresholds, targetWeight);
}

/**
 * Find random weighted choice index with cumulative sum (linear scan)
 * 
 * This is a function that utilizes the binary search to find where the targetValue lands in the
 * prefix sum array as thresholds
 * 
 * @param {*} thresholds - list of numbers that represent each item's probability of being chosen
 * @param {*} targetValue - value we are trying to find the threshold for (first instance where the
 * 							value is greater than the threshold)
 * @param {*} start - current starting index in array
 * @param {*} end - current ending index in array
 * @returns index of the weight (which corresponds to the item)
 * 
 */
function findRandomWeightedIndexPSBS(thresholds, targetValue, start=0, end=thresholds.length) {
	// base case
	if(start >= end) return start;

	let mid = Math.floor((start + end) / 2);

	if(thresholds[mid] > targetValue) {
		return findRandomWeightedIndexPSBS(thresholds, targetValue, start, mid);
	} else {
		return findRandomWeightedIndexPSBS(thresholds, targetValue, mid + 1, end);
	}
}

/**
 * Run all the differen weighted random choice algorithms with an items array, weights array, and number of iterations
 * 
 * Random value is calculated beforehand so all algorithms run with the same random value
 * 
 * @param {*} items - array of items ()
 * @param {*} weights - array of weights (probability for each item)
 * @param {*} numberOfIterations - number of iterations to run
 */
function runTests(items, weights, numberOfIterations) {
	console.log();
	console.log("Cumulative Sum (Linear Scan)")
	console.log("Items:", items);
	console.log("Weights:", weights);

	const itemsPickedCountCSLS = Object.fromEntries(items.map(key => [key, 0]));
	const itemsPickedCountPSBS = Object.fromEntries(items.map(key => [key, 0]));

	for (let i=0; i<numberOfIterations; i++) {
		const randVal = Math.random();
		const indexCSLS = findRandomWeightedIndexCSLS(weights, randVal);
		const indexPSBS = findRandomWeightedIndexPSBSHelper(weights, randVal);

		itemsPickedCountCSLS[items[indexCSLS]] = (itemsPickedCountCSLS[items[indexCSLS]] || 0) + 1;
		itemsPickedCountPSBS[items[indexPSBS]] = (itemsPickedCountPSBS[items[indexPSBS]] || 0) + 1;
	}

	console.log("Items picked counts (CSLS):", itemsPickedCountCSLS);
	console.log("Items picked counts (PSBS):", itemsPickedCountPSBS);
	console.log();
}

// Array containing our items (can be anything)
const itemsNumbers = [1, 100, 30, 45, 5];
const itemsFruit = ["orange", "apple", "pear", "grape", "peach"];
const itemsLoot = ["wooden sword", "small shield", "legendary sword", "legendary shield", "small wand"]

//	Weight values don't need to add up to 1 or 10 or 100 or any specific number because when the weights are
//		utilized for calculation, the arbitrary total is 100% (i.e. 160/160 or 1818/1818).
//		However, if it's easier to help visualize and understand, you can definitely use easier values for the weights.
const probabilityWeightsArbitrary = [40, 8, 24, 8, 80]
const probabilityWeightsNonArbitrary = [0.25, 0.05, 0.15, 0.05, 0.5];
const probabilityWeightsWithZeroWeight = [0, 0.1, 0.30, 0.1, 0.5];

// To experiment, you can switch out any of the items or weight arrays,
// and adjust the iterations as you like
runTests(itemsFruit, probabilityWeightsWithZeroWeight, 1000);