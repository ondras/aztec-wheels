import * as lib from "./lib.ts";


const countToSize = {
	10: "none",
	20: "small",
	30: "medium",
	40: "large"
}

function byName<T extends HTMLElement = HTMLElement>(name: string, parent=document.body) { return parent.querySelector<T>(`[name=${name}]`)!; }

async function loadWordlist(url: string) {
	let form = byName("wordlist");
	let output = form.querySelector("output")!;
	output.innerHTML = "";

	let response = await fetch(url);
	let text = await response.text();
	let words = text.split("\n").map(line => {
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
}

byName("wordlist").addEventListener("submit", async e => {
	e.preventDefault();
	let form = e.target as HTMLElement;
	let url = byName<HTMLInputElement>("url", form).value;
	if (!url) { return alert("Zadej URL"); }
	loadWordlist(url);
});

byName("wordlist").querySelector("[type=file]")!.addEventListener("change", e => {
	let files = (e.target as HTMLInputElement).files!;
	if (files.length == 0) { return; }
	let url = URL.createObjectURL(files[0]);
	loadWordlist(url);
})

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
	let wheels = form.querySelector(".wheels")!;
	output.innerHTML = "";
	wheels.innerHTML = "";

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
			output.innerHTML = serializeMoves(result, state, config);
			initWheels(wheels, config, state.value2);
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

function initWheels(parent: Element, config: lib.Config, value2: number) {
	let wheel1 = buildWheel(config.size1, config.alphabet);
	let wheel2 = buildWheel(10, "");
	let wheel3 = buildWheel(config.size2, config.alphabet);
	let controls = document.createElement("div");
	controls.className = "controls";

	let ccw = document.createElement("button");
	ccw.type = "button";
	ccw.textContent = "⤹ (ccw)";
	ccw.addEventListener("click", e => rotateBy(1));

	let cw = document.createElement("button");
	cw.type = "button";
	cw.textContent = "⤸ (cw)";
	cw.addEventListener("click", e => rotateBy(-1));

	let angle1 = 0;
	let angle2 = 360*value2/config.alphabet.length;

	function update() {
		wheel1.style.setProperty("--angle", String(angle1));
		wheel3.style.setProperty("--angle", String(angle2));
	}
	update();

	function rotateBy(diff) {
		let step1 = 360/config.alphabet.length;
		let step2 = step1 * config.size1/config.size2;
		angle1 += diff*step1;
		angle2 += diff*step2;
		update();
	}

	controls.append(ccw, cw);
	parent.append(controls, wheel1, wheel2, wheel3);
}

function buildWheel(size: number, alphabet: string) {
	let node = document.createElement("div");
	node.classList.add("wheel", countToSize[size]);
	node.innerHTML = "☸";

	let letters = alphabet.split("").map((char, i, all) => {
		let span = document.createElement("span");
		let angle = i/all.length * 360;
		span.style.setProperty("--angle", String(angle));
		span.textContent = char;
		return span;
	})
	node.append(...letters)

	return node;
}