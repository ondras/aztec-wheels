export const alphabets = {
	23: "abcdefghijklmnoprstuvyz",
	24: "abcdefghijklmnopqrstuvyz", // +Q
	25: "abcdefghijklmnopqrstuvxyz" // +QX
}

export interface Config {
	size1: number;
	size2: number;
	alphabet: string;
	negativeOnly?: boolean;
}

export interface State {
	value1: number;
	value2: number;
}

export interface Move {
	offset1: number;
	offset2: number;
	state: State;
}

declare global {
	interface Number {
		mod(m: number): number;
	}
}

Number.prototype.mod = function(m) {
  return ((((this as number)%m) + m) % m);
}

function computeOffset2(offset1: number, config: Config) {
	const { size1, size2 } = config;
	let offset2 = offset1 * size1/size2;
	if (offset2 != Math.round(offset2)) { return null; }
	return offset2;
}

function applyMove(state: State, offset1: number, offset2: number, config: Config): State {
	const { value1, value2 } = state;
	const { alphabet } = config;
	let len = alphabet.length;

	return {
		value1: (value1 + offset1).mod(len),
		value2: (value2 + offset2).mod(len)
	}
}

function listMoves(state: State, config: Config) {
	const {alphabet} = config;
	let len = alphabet.length;

	let moves: Move[] = [];
	let min = -len+1;
	let max = (config.negativeOnly ? 0 : len-1);

	for (let offset1 = min; offset1 <= max; offset1++) {
		if (offset1 == 0) continue;
		let offset2 = computeOffset2(offset1, config);
		if (offset2 === null) { continue; }

		let newState = applyMove(state, offset1, offset2, config);
		moves.push({state: newState, offset1, offset2});
	}

	return moves;
}

export function checkWord(word: string, state: State, config: Config) {
	let wordMoves: Move[] = [];

	let letters = word.split("");
	while (letters.length) {
		let letter = letters.shift()!;
		let value2 = config.alphabet.split("").indexOf(letter);
		if (value2 == -1) { throw new Error(`Letter ${letter} not in alphabet`); }
		let moves = listMoves(state, config);
		let avail = moves.filter(move => move.state.value2 == value2);
		if (avail.length == 0) { return null; }

		let move = avail[0];
//		console.log(serializeMove(move));
		wordMoves.push(move);
		state = move.state;
	}

	return wordMoves;
}

function serializeState(state: State, config: Config) {
	return `Source: ${config.alphabet[state.value1]}, Target: ${config.alphabet[state.value2]}`;
}

function serializeMove(move: Move, config: Config) {
	return `Move by ${move.offset1}/${move.offset2} to ${serializeState(move.state, config)}`
}

export function findInitialValuesForWord(word: string, config: Config) {
	let values: number[] = [];
	let len = config.alphabet.length;

	for (let i=0;i<len;i++) {
		let state = {
			value1: 0,
			value2: i
		}
		let moves = checkWord(word, state, config);
		if (moves === null) { continue; }
		values.push(i);
	}
	return values;
}

export function countDoableWords(words: string[], config: Config) {
	let ok: string[] = [];
	let ko: string[] = [];
	words.forEach(word => {
		let values = findInitialValuesForWord(word, config);
//		console.log(word, values);
		if (values.length > 0) {
			ok.push(word);
//			console.log(word, values.length);
		} else {
			ko.push(word);
//			console.log(word, ":-(");
		}
	});
//	console.log("CONFIG", config);
//	console.log("ok:", ok, ", ko:", ko);
	return {ok, ko};
}

// blbe kombinace: 20:30, 30:40
const config = {
	size1: 30,
	size2: 40,
	alphabet: alphabets[25]
}


/*
let state = {
	value1: 0,
	value2: 0
}
let moves = listMoves(state, config);
console.log("STATE", serializeState(state));
moves.forEach(move => console.log(serializeMove(move)));
*/

/* *
let state = {value1:0, value2: 0};
let moves = checkWord("NAHROBEK", state, config);
if (moves === null) {
	console.log("sorry");
} else {
	console.log("START", serializeState(state));
	moves.forEach(move => console.log(serializeMove(move)));
}
/**/

/**
let word = "NAHROBEK";
let values = findInitialValuesForWord(word, config);
console.log("initial values for", word, values)
/* */
/*
["PRD", "OKO", "HOVNO", "VILA", "AHOJ", "NOC", "ODVAHA", "SEDMIKRASKA"].forEach(word => {
	let values = findInitialValuesForWord(word, config);
	console.log(word, values.length ? values : ":-(")
})
*/

/* *
let bytes = Deno.readFileSync("cs.txt")
let lines = new TextDecoder().decode(bytes).split("\n");
let words = lines.map(line => {
	return line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
});

let c = { size1: 40, size2: 30, alphabet: alphabets[24], negativeOnly: true };
countDoableWords(words, c);
/* *
[20, 30, 40].forEach(size1 => {
	[20, 30, 40].forEach(size2 => {
		[24, 25, 23].forEach(letters => {
			let config = { size1, size2, alphabet: alphabets[letters as keyof typeof alphabets], negativeOnly: true };
			countDoableWords(words, config);
		})
	})
})
/* */