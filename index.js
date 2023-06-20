(() => {
  // ts/lib.ts
  var alphabets = {
    23: "abcdefghijklmnoprstuvyz",
    24: "abcdefghijklmnopqrstuvyz",
    // +Q
    25: "abcdefghijklmnopqrstuvxyz"
    // +QX
  };
  Number.prototype.mod = function(m) {
    return (this % m + m) % m;
  };
  function computeOffset2(offset1, config2) {
    const { size1, size2 } = config2;
    let offset2 = offset1 * size1 / size2;
    if (offset2 != Math.round(offset2)) {
      return null;
    }
    return offset2;
  }
  function applyMove(state, offset1, offset2, config2) {
    const { value1, value2 } = state;
    const { alphabet } = config2;
    let len = alphabet.length;
    return {
      value1: (value1 + offset1).mod(len),
      value2: (value2 + offset2).mod(len)
    };
  }
  function listMoves(state, config2) {
    const { alphabet } = config2;
    let len = alphabet.length;
    let moves = [];
    let min = -len + 1;
    let max = config2.negativeOnly ? 0 : len - 1;
    for (let offset1 = min; offset1 <= max; offset1++) {
      if (offset1 == 0)
        continue;
      let offset2 = computeOffset2(offset1, config2);
      if (offset2 === null) {
        continue;
      }
      let newState = applyMove(state, offset1, offset2, config2);
      moves.push({ state: newState, offset1, offset2 });
    }
    return moves;
  }
  function checkWord(word, state, config2) {
    let wordMoves = [];
    let letters = word.split("");
    while (letters.length) {
      let letter = letters.shift();
      if (letter == " ") {
        wordMoves.push(null);
        continue;
      }
      let value2 = config2.alphabet.split("").indexOf(letter);
      if (value2 == -1) {
        throw new Error(`Letter ${letter} not in alphabet`);
      }
      let moves = listMoves(state, config2);
      let avail = moves.filter((move2) => move2.state.value2 == value2);
      if (avail.length == 0) {
        return null;
      }
      let move = avail[0];
      wordMoves.push(move);
      state = move.state;
    }
    return wordMoves;
  }
  function findInitialValuesForWord(word, config2) {
    let values = [];
    let len = config2.alphabet.length;
    for (let i = 0; i < len; i++) {
      let state = {
        value1: 0,
        value2: i
      };
      let moves = checkWord(word, state, config2);
      if (moves === null) {
        continue;
      }
      values.push(i);
    }
    return values;
  }
  function countDoableWords(words, config2) {
    let ok = [];
    let ko = [];
    words.forEach((word) => {
      let values = findInitialValuesForWord(word, config2);
      if (values.length > 0) {
        ok.push(word);
      } else {
        ko.push(word);
      }
    });
    return { ok, ko };
  }
  var config = {
    size1: 30,
    size2: 40,
    alphabet: alphabets[25]
  };

  // ts/index.ts
  var countToSize = {
    10: "none",
    20: "small",
    30: "medium",
    40: "large"
  };
  var countToColor = {
    20: "red",
    30: "green",
    40: "#aa0"
  };
  document.body.style.setProperty("--color-small", countToColor[20]);
  document.body.style.setProperty("--color-medium", countToColor[30]);
  document.body.style.setProperty("--color-large", countToColor[40]);
  var printQueue = [];
  function byName(name, parent = document.body) {
    return parent.querySelector(`[name=${name}]`);
  }
  async function loadWordlist(url) {
    let form = byName("wordlist");
    let output = form.querySelector("output");
    output.innerHTML = "";
    let response = await fetch(url);
    let text = await response.text();
    let words = text.split("\n").map((line) => {
      return line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }).filter((w) => w);
    let config2 = createConfig();
    try {
      let result = countDoableWords(words, config2);
      output.innerHTML = `OK: ${result.ok.length}, KO: ${result.ko.length}<br><br>`;
      output.innerHTML += `OK:<br>${result.ok.map((w) => "&nbsp;&nbsp;" + w).join("<br>")}`;
    } catch (e) {
      output.innerHTML = e;
    }
  }
  byName("wordlist").addEventListener("submit", async (e) => {
    e.preventDefault();
    let form = e.target;
    let url = byName("url", form).value;
    if (!url) {
      return alert("Zadej URL");
    }
    loadWordlist(url);
  });
  byName("wordlist").querySelector("[type=file]").addEventListener("change", (e) => {
    let files = e.target.files;
    if (files.length == 0) {
      return;
    }
    let url = URL.createObjectURL(files[0]);
    loadWordlist(url);
  });
  byName("initial-values").addEventListener("submit", async (e) => {
    e.preventDefault();
    let form = e.target;
    let output = form.querySelector("output");
    output.innerHTML = "";
    let word = byName("word", form).value;
    let config2 = createConfig();
    try {
      let result = findInitialValuesForWord(word, config2);
      output.innerHTML = result.length > 0 ? result.map((num) => config2.alphabet[num]).join(", ") : "\u{1F595}";
    } catch (e2) {
      output.innerHTML = e2;
    }
  });
  byName("check-word").addEventListener("submit", async (e) => {
    e.preventDefault();
    let form = e.target;
    let output = form.querySelector("output");
    let wheels = form.querySelector(".wheels");
    output.innerHTML = "";
    wheels.innerHTML = "";
    let word = byName("word", form).value;
    if (!word) {
      return alert("Zadej slovo");
    }
    let value2 = byName("value2", form).value;
    if (!value2) {
      return alert("Zadej po\u010D\xE1te\u010Dn\xED p\xEDsmeno");
    }
    let config2 = createConfig();
    let state = {
      value1: 0,
      value2: config2.alphabet.indexOf(value2)
    };
    try {
      let result = checkWord(word, state, config2);
      if (result) {
        let html = serializeMoves(result, state, config2);
        output.innerHTML = html + "<br>";
        let print = document.createElement("button");
        print.textContent = "\u{1F5B6}";
        print.title = "P\u0159idat k tisku";
        print.addEventListener("click", (_) => {
          printQueue.push(html);
          drawPrint();
        });
        output.append(print, document.createElement("hr"));
        initWheels(wheels, config2, state.value2);
      } else {
        output.innerHTML = "\u{1F595}";
      }
    } catch (e2) {
      output.innerHTML = e2;
    }
  });
  function createConfig() {
    let a = Number(byName("alphabet").value);
    return {
      size1: Number(byName("size1").value),
      size2: Number(byName("size2").value),
      alphabet: alphabets[a],
      negativeOnly: byName("negative-only").checked
    };
  }
  function serializeMoves(moves, initialState, config2) {
    function cellStyle(count) {
      return `width: 40px; height: 40px; border: 2px solid black; background-color: ${countToColor[count]};`;
    }
    function letter(index) {
      return config2.alphabet[index].toUpperCase();
    }
    let midSize = 20;
    if (config2.size1 == midSize || config2.size2 == midSize) {
      midSize = 30;
    }
    if (config2.size1 == midSize || config2.size2 == midSize) {
      midSize = 40;
    }
    let html = ``;
    html += `<table style="border-collapse:collapse; text-align: center; font-weight: bold; font-size: 20px; font-family: monospace;"><tr>`;
    html += `<td style="${cellStyle(config2.size1)}">${letter(initialState.value1)}</td>`;
    html += `<td style="${cellStyle(midSize)}"></td>`;
    html += `<td style="${cellStyle(config2.size2)}">${letter(initialState.value2)}</td>`;
    html += `</tr></table>`;
    html += `<br/>`;
    html += `<table style="text-align: center; font-size: 20px; font-family: monospace;">`;
    html += `<tr>` + moves.map((move) => `<td>${move ? move.offset1 > 0 ? "\u2939" : "\u2938" : "&#160;"}</td>`).join("") + `</tr>`;
    html += `<tr>` + moves.map((move) => `<td>${move ? letter(move.state.value1) : "&#160;"}</td>`).join("") + `</tr>`;
    html += `</table>`;
    return html;
  }
  function initWheels(parent, config2, value2) {
    let wheel1 = buildWheel(config2.size1, config2.alphabet);
    let wheel2 = buildWheel(10, "");
    let wheel3 = buildWheel(config2.size2, config2.alphabet);
    let controls = document.createElement("div");
    controls.className = "controls";
    let ccw = document.createElement("button");
    ccw.type = "button";
    ccw.textContent = "\u2939 (ccw)";
    ccw.addEventListener("click", (e) => rotateBy(1));
    let cw = document.createElement("button");
    cw.type = "button";
    cw.textContent = "\u2938 (cw)";
    cw.addEventListener("click", (e) => rotateBy(-1));
    let angle1 = 0;
    let angle2 = 360 * value2 / config2.alphabet.length;
    function update() {
      wheel1.style.setProperty("--angle", String(angle1));
      wheel3.style.setProperty("--angle", String(angle2));
    }
    update();
    function rotateBy(diff) {
      let step1 = 360 / config2.alphabet.length;
      let step2 = step1 * config2.size1 / config2.size2;
      angle1 += diff * step1;
      angle2 += diff * step2;
      update();
    }
    controls.append(ccw, cw);
    parent.append(controls, wheel1, wheel2, wheel3);
  }
  function buildWheel(size, alphabet) {
    let node = document.createElement("div");
    node.classList.add("wheel", countToSize[size]);
    node.innerHTML = "\u2638";
    let letters = alphabet.split("").map((char, i, all) => {
      let span = document.createElement("span");
      let angle = i / all.length * 360;
      span.style.setProperty("--angle", String(angle));
      span.textContent = char;
      return span;
    });
    node.append(...letters);
    return node;
  }
  function drawPrint() {
    let node = document.querySelector("#print");
    node.innerHTML = "";
    printQueue.forEach((html, i) => {
      let div = document.createElement("div");
      div.className = "row";
      node.append(div);
      let remove = document.createElement("button");
      remove.textContent = "\u2A2F";
      remove.addEventListener("click", (_) => {
        printQueue.splice(i, 1);
        drawPrint();
      });
      let content = document.createElement("div");
      content.innerHTML = html;
      div.append(content, remove);
    });
  }
})();
