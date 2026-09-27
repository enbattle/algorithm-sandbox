/**
 *	A topological sort orders the nodes of a directed graph so that every edge
 *		points forward: if A -> B ("A must come before B"), A appears before B.
 *
 *	It only exists for a directed acyclic graph (DAG). If the graph has a cycle
 *		(A before B, B before C, C before A), no valid order exists, and both
 *		algorithms below detect that instead of returning a wrong answer.
 *
 *	A DAG usually has more than one valid order. Both algorithms return one of
 *		them, not necessarily the same one.
 *
 */

/**
 *	Real-world Applications
 *
 *	Build systems -> compiling files or modules only after everything they
 *		depend on has been built (e.g. make, bundlers resolving imports).
 *
 *	Package managers -> installing dependencies before the packages that
 *		need them, and reporting a circular dependency when there is one.
 *
 *	Task schedulers / workflow engines -> running a pipeline's steps in an
 *		order that respects which step needs which step's output.
 *
 *	Spreadsheets -> recalculating a cell only after the cells its formula
 *		references have been recalculated.
 *
 */

/**
 *	Implementations
 *
 *	- Kahn's algorithm (repeatedly take a node with no remaining incoming edges)
 *	- Depth-first search (DFS) with a three-color visited state
 *
 *	Both run in O(V + E) time: every node and every edge is looked at a
 *		constant number of times.
 *
 */

/**
 * Build an adjacency list from a list of nodes and a list of edges
 * @param {*} nodes - array of node names
 * @param {*} edges - array of [from, to] pairs, meaning `from` must come before `to`
 * @returns a Map from each node to the array of nodes it points to
 *
 */
function buildGraph(nodes, edges) {
	const graph = new Map(nodes.map(node => [node, []]));

	for (const [from, to] of edges) {
		if (!graph.has(from) || !graph.has(to)) {
			throw new Error(`Edge ${from} -> ${to} uses a node that isn't in the node list`);
		}
		graph.get(from).push(to);
	}

	return graph;
}

/**
 * Topological sort with Kahn's algorithm
 * @param {*} graph - Map from each node to the array of nodes it points to
 * @returns an array of nodes in a valid order
 * @throws if the graph contains a cycle
 *
 */
function topologicalSortKahn(graph) {
	// 1. Count each node's in-degree (how many edges point INTO it).
	// 2. Put every node with in-degree 0 in a queue: nothing has to come before them.
	// 3. While the queue isn't empty:
	//      - take a node off the queue and append it to the result
	//      - "remove" its outgoing edges by decrementing each neighbor's in-degree
	//      - any neighbor that drops to 0 has all its prerequisites placed, so queue it
	// 4. If the result is shorter than the node count, some nodes never reached
	//      in-degree 0: they're in a cycle, or depend on something in one.
	//      (Kahn's can say THAT a cycle exists, but not which exact edges form it;
	//      the DFS version below can.)

	const inDegree = new Map([...graph.keys()].map(node => [node, 0]));
	for (const neighbors of graph.values()) {
		for (const neighbor of neighbors) {
			inDegree.set(neighbor, inDegree.get(neighbor) + 1);
		}
	}

	const queue = [...graph.keys()].filter(node => inDegree.get(node) === 0);
	const result = [];

	// Advance a head index instead of queue.shift(), which is O(n) per call on arrays
	for (let head = 0; head < queue.length; head++) {
		const node = queue[head];
		result.push(node);

		for (const neighbor of graph.get(node)) {
			inDegree.set(neighbor, inDegree.get(neighbor) - 1);
			if (inDegree.get(neighbor) === 0) {
				queue.push(neighbor);
			}
		}
	}

	if (result.length !== graph.size) {
		const stuck = [...graph.keys()].filter(node => inDegree.get(node) > 0);
		throw new Error(`Cycle detected; nodes that could not be placed: ${stuck.join(", ")}`);
	}

	return result;
}

/**
 * Topological sort with depth-first search
 * @param {*} graph - Map from each node to the array of nodes it points to
 * @returns an array of nodes in a valid order
 * @throws if the graph contains a cycle
 *
 */
function topologicalSortDFS(graph) {
	// 1. Track each node's state:
	//      WHITE = not visited yet
	//      GRAY  = on the current DFS path (we're still exploring below it)
	//      BLACK = finished (everything reachable from it has been placed)
	// 2. Visit each WHITE node. When visiting a node, mark it GRAY, visit all of
	//      its neighbors, then mark it BLACK and append it to `finished`.
	// 3. Reaching a GRAY node again means we followed edges back to a node on
	//      our own path: that's a cycle.
	// 4. A node finishes only after everything it points to has finished, so
	//      `finished` is in reverse order. Reverse it for the answer.
	//
	// Note: this is recursive, so a very long dependency chain (thousands of
	//      nodes deep) can overflow the call stack. Kahn's algorithm has no
	//      such limit.

	const WHITE = 0, GRAY = 1, BLACK = 2;
	const state = new Map([...graph.keys()].map(node => [node, WHITE]));
	const finished = [];

	function visit(node, path) {
		state.set(node, GRAY);
		path.push(node);

		for (const neighbor of graph.get(node)) {
			if (state.get(neighbor) === GRAY) {
				const cycle = path.slice(path.indexOf(neighbor)).concat(neighbor);
				throw new Error(`Cycle detected: ${cycle.join(" -> ")}`);
			}
			if (state.get(neighbor) === WHITE) {
				visit(neighbor, path);
			}
		}

		path.pop();
		state.set(node, BLACK);
		finished.push(node);
	}

	for (const node of graph.keys()) {
		if (state.get(node) === WHITE) {
			visit(node, []);
		}
	}

	return finished.reverse();
}

/**
 * Check that an order respects every edge (each `from` comes before its `to`)
 * @param {*} order - array of nodes
 * @param {*} edges - array of [from, to] pairs
 * @returns true if the order is a valid topological order
 *
 */
function isValidOrder(order, edges) {
	const position = new Map(order.map((node, i) => [node, i]));
	return edges.every(([from, to]) => position.get(from) < position.get(to));
}

/**
 * Run both algorithms on a graph and print their orders (or the cycle they found)
 * @param {*} label - name printed above the results
 * @param {*} nodes - array of node names
 * @param {*} edges - array of [from, to] pairs
 *
 */
function runTests(label, nodes, edges) {
	console.log();
	console.log(label);
	const graph = buildGraph(nodes, edges);

	for (const [name, sort] of [["Kahn", topologicalSortKahn], ["DFS", topologicalSortDFS]]) {
		try {
			const order = sort(graph);
			console.log(`${name}:`, order.join(" -> "), `(valid: ${isValidOrder(order, edges)})`);
		} catch (err) {
			console.log(`${name}:`, err.message);
		}
	}
	console.log();
}

// Getting dressed: each pair means the first item has to go on before the second
const clothes = ["undershorts", "pants", "belt", "shirt", "tie", "jacket", "socks", "shoes"];
const clothesEdges = [
	["undershorts", "pants"],
	["undershorts", "shoes"],
	["pants", "belt"],
	["pants", "shoes"],
	["shirt", "belt"],
	["shirt", "tie"],
	["tie", "jacket"],
	["belt", "jacket"],
	["socks", "shoes"],
];

// A build where each module must be compiled after the modules it imports
const modules = ["utils", "config", "db", "api", "app"];
const moduleEdges = [
	["utils", "db"],
	["config", "db"],
	["db", "api"],
	["utils", "api"],
	["api", "app"],
];

// A circular dependency: no valid order exists
const cyclicModules = ["a", "b", "c", "d"];
const cyclicEdges = [
	["d", "a"],
	["a", "b"],
	["b", "c"],
	["c", "a"],
];

// To experiment, add or remove edges and watch the orders change, or add an
// edge that closes a loop and see which nodes each algorithm reports.
runTests("Getting dressed", clothes, clothesEdges);
runTests("Module build order", modules, moduleEdges);
runTests("Circular dependency", cyclicModules, cyclicEdges);

// Disclaimer: the implementation above is purely for learning purposes. Most languages
// have existing production-ready packages that can be explored and used.
