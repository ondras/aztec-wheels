import * as lib from "./lib.ts";


function byName<T extends HTMLElement = HTMLElement>(name: string, parent=document.body) { return parent.querySelector<T>(`[name=${name}]`)!; }

byName("wordlist").addEventListener("submit", async e => {
	e.preventDefault();
	let form = e.target as HTMLElement;
	let output = form.querySelector("output")!;

	output.innerHTML = "";

	let files = byName<HTMLInputElement>("file", form).files;
	if (!files || !files.length) { return alert("Vyber soubor"); }

	let data = await readFile(files[0]);
	let words = data.split("\n").map(line => {
		return line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
	}).filter(w => w);

	let config = createConfig();
	try {
		let result = lib.countDoableWords(words, config);
		output.innerHTML = `OK: ${result.ok.length}, KO: ${result.ko.length}<br><br>`;
		output.innerHTML += `OK:<br>${result.ok.map(w => "&nbsp;&nbsp;" + w).join("<br>")}`;
	} catch (e) {
		output.innerHTML = e;
	}
});

byName("initial-values").addEventListener("submit", async e => {
	e.preventDefault();
	let form = e.target as HTMLElement;
	let output = form.querySelector("output")!;
	output.innerHTML = "";

	let word = byName<HTMLInputElement>("word", form).value;
	let config = createConfig();

	try {
		let result = lib.findInitialValuesForWord(word, config);
		output.innerHTML = (result.length > 0 ? result.map(num => config.alphabet[num]).join(", ") : "🖕");
	} catch (e) {
		output.innerHTML = e;
	}
});

byName("check-word").addEventListener("submit", async e => {
	e.preventDefault();
	let form = e.target as HTMLElement;
	let output = form.querySelector("output")!;
	output.innerHTML = "";

	let word = byName<HTMLInputElement>("word", form).value;
	if (!word) { return alert("Zadej slovo"); }
	let value2 = byName<HTMLInputElement>("value2", form).value;
	if (!value2) { return alert("Zadej počáteční písmeno"); }
	let config = createConfig();
	let state = {
		value1: 0,
		value2: config.alphabet.indexOf(value2)
	}

	try {
		let result = lib.checkWord(word, state, config);
		if (result) {
			output.innerHTML = serializeMoves(result, state, config)
		} else {
			output.innerHTML = "🖕";
		}
	} catch (e) {
		output.innerHTML = e;
	}
});

function createConfig() {
	let a = Number(byName<HTMLSelectElement>("alphabet").value);
	return {
		size1: Number(byName<HTMLSelectElement>("size1").value),
		size2: Number(byName<HTMLSelectElement>("size2").value),
		alphabet: lib.alphabets[a],
		negativeOnly: byName<HTMLInputElement>("negative-only").checked
	}
}

async function readFile(file: File): Promise<string> {
	let fr = new FileReader();
	fr.readAsText(file);
	return new Promise(resolve => {
		fr.addEventListener("load", e => resolve(fr.result as string));
	})
}

function serializeMoves(moves: lib.Move[], initialState: lib.State, config: lib.Config) {
	let html = "";
	const countToSize = {
		20: "small",
		30: "medium",
		40: "large"
	}

	html += `<span class="wheel ${countToSize[config.size1]}">${config.alphabet[initialState.value1]}</span>`
	html += `<span class="wheel ${countToSize[config.size2]}">${config.alphabet[initialState.value2]}</span>`
	html += `<br/><br/>`
	html += moves.map(move => serializeMove(move, config)).join("<br>");

	return html;
}

function serializeMove(move: lib.Move, config: lib.Config) {
	//	let symbol = (move.offset1 > 0 ? "⥀" : "⥁");
		let symbol = (move.offset1 > 0 ? "⤹" : "⤸");
		let letter = config.alphabet[move.state.value1];
		return `${symbol} ${letter}`;
	}
