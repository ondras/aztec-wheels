import * as lib from "./lib.ts";


const countToSize = {
	10: "none",
	20: "small",
	30: "medium",
	40: "large"
}

const countToColor = {
	20: "red",
	30: "green",
	40: "#aa0"
}

document.body.style.setProperty("--color-small", countToColor[20]);
document.body.style.setProperty("--color-medium", countToColor[30]);
document.body.style.setProperty("--color-large", countToColor[40]);

let printQueue: string[] = [];

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
			let html = serializeMoves(result, state, config);
			output.innerHTML = html + "<br>";
			let print = document.createElement("button");
			print.textContent = "🖶";
			print.title = "Přidat k tisku";
			print.addEventListener("click", _ => {
				printQueue.push(html);
				drawPrint();
			});
			output.append(print, document.createElement("hr"));
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

function serializeMoves(moves: (lib.Move | null)[], initialState: lib.State, config: lib.Config) {
	function cellStyle(count: number) {
		return `width: 40px; height: 40px; border: 2px solid black; background-color: ${countToColor[count]};`;
	}

	function letter(index) {
		return config.alphabet[index].toUpperCase();
	}

	let midSize = 20;
	if (config.size1 == midSize || config.size2 == midSize) { midSize = 30; }
	if (config.size1 == midSize || config.size2 == midSize) { midSize = 40; }

	let html = ``;

	html += `<table style="border-collapse:collapse; text-align: center; font-weight: bold; font-size: 20px; font-family: monospace;"><tr>`;
	html += `<td style="${cellStyle(config.size1)}">${letter(initialState.value1)}</td>`
	html += `<td style="${cellStyle(midSize)}"></td>`
	html += `<td style="${cellStyle(config.size2)}">${letter(initialState.value2)}</td>`
	html += `</tr></table>`;

	html += `<br/>`;

	html += `<table style="text-align: center; font-size: 20px; font-family: monospace;">`
	html += `<tr>` + moves.map(move => `<td>${move ? (move.offset1 > 0 ? "⤹" : "⤸") : "&#160;"}</td>`).join("") + `</tr>`;
	html += `<tr>` + moves.map(move => `<td>${move ? letter(move.state.value1) : "&#160;"}</td>`).join("") + `</tr>`;
	html += `</table>`

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

function drawPrint() {
	let node = document.querySelector("#print")!;
	node.innerHTML = "";

	printQueue.forEach((html, i) => {
		let div = document.createElement("div");
		div.className = "row";
		node.append(div);

		let remove = document.createElement("button");
		remove.textContent = "⨯";
		remove.addEventListener("click", _ => {
			printQueue.splice(i, 1);
			drawPrint();
		})

		let content = document.createElement("div");
		content.innerHTML = html;

		div.append(content, remove);
	});
}