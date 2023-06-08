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
  function byName(name, parent = document.body) {
    return parent.querySelector(`[name=${name}]`);
  }
  byName("wordlist").addEventListener("submit", async (e) => {
    e.preventDefault();
    let form = e.target;
    let output = form.querySelector("output");
    output.innerHTML = "";
    let files = byName("file", form).files;
    if (!files || !files.length) {
      return alert("Vyber soubor");
    }
    let data = await readFile(files[0]);
    let words = data.split("\n").map((line) => {
      return line.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    }).filter((w) => w);
    let config2 = createConfig();
    try {
      let result = countDoableWords(words, config2);
      output.innerHTML = `OK: ${result.ok.length}, KO: ${result.ko.length}<br><br>`;
      output.innerHTML += `OK:<br>${result.ok.map((w) => "&nbsp;&nbsp;" + w).join("<br>")}`;
    } catch (e2) {
      output.innerHTML = e2;
    }
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
        output.innerHTML = serializeMoves(result, state, config2);
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
  async function readFile(file) {
    let fr = new FileReader();
    fr.readAsText(file);
    return new Promise((resolve) => {
      fr.addEventListener("load", (e) => resolve(fr.result));
    });
  }
  function serializeMoves(moves, initialState, config2) {
    let html = "";
    html += `<span class="wheel ${countToSize[config2.size1]}">${config2.alphabet[initialState.value1]}</span>`;
    html += `<span class="wheel ${countToSize[config2.size2]}">${config2.alphabet[initialState.value2]}</span>`;
    html += `<br/><br/>`;
    html += moves.map((move) => serializeMove(move, config2)).join("<br>");
    return html;
  }
  function serializeMove(move, config2) {
    let symbol = move.offset1 > 0 ? "\u2939" : "\u2938";
    let letter = config2.alphabet[move.state.value1];
    return `${symbol} ${letter}`;
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
})();
