const STORAGE_KEY = "maths-dragons-save-v1";
const HATCH_COST = {
  coins: 20,
  crystals: 3,
};

const SUCCESS_LINES = [
  "Great job!",
  "You smashed it!",
  "Fantastic maths!",
  "That was dragon-level clever!",
];

const ENCOURAGEMENT_LINES = [
  "Have another go!",
  "You are still learning.",
  "Keep going — you can do this!",
  "Every question helps your brain grow!",
];

const DEFAULT_STATE = {
  coins: 0,
  crystals: 0,
  streak: 0,
  bestStreak: 0,
  solved: 0,
  correct: 0,
  unlockedIds: ["ember"],
};

const state = loadState();
let currentQuestion = null;
let nextQuestionTimer = null;
let questionLocked = false;

const elements = {
  coinsValue: document.getElementById("coinsValue"),
  crystalsValue: document.getElementById("crystalsValue"),
  streakValue: document.getElementById("streakValue"),
  ownedValue: document.getElementById("ownedValue"),
  coinMeterFill: document.getElementById("coinMeterFill"),
  coinMeterText: document.getElementById("coinMeterText"),
  modeSelect: document.getElementById("modeSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  questionText: document.getElementById("questionText"),
  answerInput: document.getElementById("answerInput"),
  checkButton: document.getElementById("checkButton"),
  newQuestionButton: document.getElementById("newQuestionButton"),
  resetButton: document.getElementById("resetButton"),
  feedbackBox: document.getElementById("feedbackBox"),
  coinHatchButton: document.getElementById("coinHatchButton"),
  crystalHatchButton: document.getElementById("crystalHatchButton"),
  hatchMessage: document.getElementById("hatchMessage"),
  collectionGrid: document.getElementById("collectionGrid"),
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) {
      return { ...DEFAULT_STATE };
    }

    return {
      ...DEFAULT_STATE,
      ...saved,
      unlockedIds: Array.isArray(saved.unlockedIds)
        ? Array.from(new Set(["ember", ...saved.unlockedIds]))
        : [...DEFAULT_STATE.unlockedIds],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function pickRandom(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function weightedRandom(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

const TIMES_TABLES = [2, 3, 4, 5, 8, 10];
const THEME_ORDER = ["Starter", "Forest", "Water", "Sky", "Magic", "Legendary"];
const THEME_ICONS = {
  Starter: "🔥",
  Forest: "🌿",
  Water: "🌊",
  Sky: "☁️",
  Magic: "✨",
  Legendary: "👑",
};
const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

function makeQuestion(mode, difficulty) {
  const config = {
    easy: {
      addition: [0, 10],
      subtraction: [0, 10],
      tableFactor: [1, 5],
    },
    medium: {
      addition: [5, 20],
      subtraction: [5, 20],
      tableFactor: [1, 10],
    },
    hard: {
      addition: [10, 50],
      subtraction: [10, 50],
      tableFactor: [1, 12],
    },
  };

  const chosenMode =
    mode === "mixed"
      ? pickRandom(["addition", "subtraction", "multiplication", "division"])
      : mode;

  if (chosenMode === "multiplication" || chosenMode === "division") {
    const tableNumber = pickRandom(TIMES_TABLES);
    const [factorMin, factorMax] = config[difficulty].tableFactor;
    const factor = randomInt(factorMin, factorMax);

    if (chosenMode === "multiplication") {
      return {
        text: `${tableNumber} × ${factor} = ?`,
        answer: tableNumber * factor,
      };
    }

    return {
      text: `${tableNumber * factor} ÷ ${tableNumber} = ?`,
      answer: factor,
    };
  }

  const [min, max] = config[difficulty][chosenMode];
  let left = randomInt(min, max);
  let right = randomInt(min, max);

  if (chosenMode === "addition") {
    return { text: `${left} + ${right} = ?`, answer: left + right };
  }

  if (chosenMode === "subtraction") {
    if (right > left) {
      [left, right] = [right, left];
    }
    return { text: `${left} − ${right} = ?`, answer: left - right };
  }

  return { text: `${left} + ${right} = ?`, answer: left + right };
}

function showFeedback(message, type = "info") {
  elements.feedbackBox.textContent = message;
  elements.feedbackBox.className = `feedback ${type}`;
}

function updateStats() {
  elements.coinsValue.textContent = `${state.coins} 💰`;
  elements.crystalsValue.textContent = `${state.crystals} 💎`;
  elements.streakValue.textContent = `${state.streak} 🔥`;
  elements.ownedValue.textContent = `${state.unlockedIds.length} / ${window.DRAGONS.length}`;

  const coinProgress = Math.min((state.coins / HATCH_COST.coins) * 100, 100);
  const coinsNeeded = Math.max(HATCH_COST.coins - state.coins, 0);

  if (elements.coinMeterFill) {
    elements.coinMeterFill.style.width = `${coinProgress}%`;
  }

  if (elements.coinMeterText) {
    elements.coinMeterText.textContent =
      coinsNeeded === 0
        ? "Your coin hatch is ready — choose a mystery egg!"
        : `${coinsNeeded} more coin${coinsNeeded === 1 ? "" : "s"} until your next hatch`;
  }

  const allUnlocked = state.unlockedIds.length === window.DRAGONS.length;
  elements.coinHatchButton.disabled =
    allUnlocked || state.coins < HATCH_COST.coins;
  elements.crystalHatchButton.disabled =
    allUnlocked || state.crystals < HATCH_COST.crystals;

  if (allUnlocked) {
    elements.hatchMessage.textContent =
      "Amazing! You have collected every creature.";
  }
}

function getDragonVisualMarkup(dragon, unlocked) {
  return `
    <div class="creature-visual ${unlocked ? "" : "is-locked"}">
      <img class="creature-image" data-dragon-id="${dragon.id}" alt="${dragon.name}" loading="eager" decoding="async" />
      <span class="creature-emoji is-fallback">${unlocked ? dragon.emoji : "🥚"}</span>
    </div>
  `;
}

function tryLoadDragonImage(image) {
  const extIndex = Number(image.dataset.extIndex || 0);
  if (extIndex >= IMAGE_EXTENSIONS.length) {
    image.removeAttribute("src");
    return;
  }

  const fileName = `${image.dataset.dragonId}.${IMAGE_EXTENSIONS[extIndex]}`;
  image.src = new URL(`./images/${fileName}`, document.baseURI).href;
}

function handleDragonImageLoad(event) {
  const image = event.currentTarget;
  image.classList.add("is-visible");
  image.closest(".creature-visual")?.classList.add("has-image");
}

function handleDragonImageError(event) {
  const image = event.currentTarget;
  const nextIndex = Number(image.dataset.extIndex || 0) + 1;
  image.dataset.extIndex = String(nextIndex);

  if (nextIndex >= IMAGE_EXTENSIONS.length) {
    image.removeAttribute("src");
    return;
  }

  tryLoadDragonImage(image);
}

function hydrateDragonImages() {
  const images = elements.collectionGrid.querySelectorAll(".creature-image");

  images.forEach((image) => {
    image.dataset.extIndex = "0";
    image.addEventListener("load", handleDragonImageLoad);
    image.addEventListener("error", handleDragonImageError);
    tryLoadDragonImage(image);
  });
}

function renderCollection() {
  const groups = window.DRAGONS.reduce((map, dragon) => {
    const theme = dragon.theme || "Magic";
    if (!map[theme]) {
      map[theme] = [];
    }
    map[theme].push(dragon);
    return map;
  }, {});

  const sections = THEME_ORDER.filter((theme) => groups[theme]?.length)
    .map((theme) => {
      const cards = groups[theme]
        .map((dragon) => {
          const unlocked = state.unlockedIds.includes(dragon.id);
          return `
          <article class="creature-card ${unlocked ? "" : "locked"}" data-dragon-id="${dragon.id}" data-rarity="${dragon.rarity}" data-theme="${theme.toLowerCase()}">
            ${getDragonVisualMarkup(dragon, unlocked)}
            <div class="creature-name">${unlocked ? dragon.name : "Mystery Egg"}</div>
            <div class="creature-rarity">${unlocked ? dragon.rarity : "Locked"}</div>
            <p class="creature-blurb">${unlocked ? dragon.blurb : "Keep answering questions to hatch this creature."}</p>
          </article>
        `;
        })
        .join("");

      return `
        <section class="theme-group theme-${theme.toLowerCase()}" data-theme="${theme.toLowerCase()}">
          <h4 class="theme-heading">${THEME_ICONS[theme] || "🐉"} ${theme}</h4>
          <div class="theme-grid">${cards}</div>
        </section>
      `;
    })
    .join("");

  elements.collectionGrid.innerHTML = sections;
  hydrateDragonImages();
}

function playHatchAnimation(dragonId) {
  const dragonCard = elements.collectionGrid.querySelector(
    `[data-dragon-id="${dragonId}"]`,
  );

  if (dragonCard) {
    dragonCard.classList.remove("just-hatched");
    void dragonCard.offsetWidth;
    dragonCard.classList.add("just-hatched");
    dragonCard.scrollIntoView({ behavior: "smooth", block: "nearest" });

    window.setTimeout(() => {
      dragonCard.classList.remove("just-hatched");
    }, 1600);
  }

  elements.hatchMessage.classList.remove("sparkle");
  void elements.hatchMessage.offsetWidth;
  elements.hatchMessage.classList.add("sparkle");

  window.setTimeout(() => {
    elements.hatchMessage.classList.remove("sparkle");
  }, 1200);
}

function setQuestionLocked(isLocked) {
  questionLocked = isLocked;
  elements.answerInput.disabled = isLocked;
  elements.checkButton.disabled = isLocked;
}

function generateQuestion() {
  clearTimeout(nextQuestionTimer);
  currentQuestion = makeQuestion(
    elements.modeSelect.value,
    elements.difficultySelect.value,
  );
  setQuestionLocked(false);
  elements.questionText.textContent = currentQuestion.text;
  elements.answerInput.value = "";
  elements.answerInput.focus();
}

function awardCorrectAnswer() {
  setQuestionLocked(true);
  currentQuestion = null;
  const coinsByDifficulty = {
    easy: 1,
    medium: 2,
    hard: 3,
  };

  const coinsEarned = coinsByDifficulty[elements.difficultySelect.value];
  state.coins += coinsEarned;
  state.correct += 1;
  state.solved += 1;
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);

  let crystalsEarned = 0;
  if (state.streak > 0 && state.streak % 5 === 0) {
    crystalsEarned = 1;
    state.crystals += 1;
  }

  saveState();
  updateStats();

  const crystalText = crystalsEarned ? ` and +${crystalsEarned} crystal` : "";
  showFeedback(
    `Correct! +${coinsEarned} coins${crystalText}. ${pickRandom(SUCCESS_LINES)}`,
    "success",
  );
  nextQuestionTimer = setTimeout(generateQuestion, 900);
}

function handleWrongAnswer() {
  const correctAnswer = currentQuestion.answer;
  setQuestionLocked(true);
  currentQuestion = null;
  state.solved += 1;
  state.streak = 0;
  saveState();
  updateStats();
  showFeedback(
    `Not quite — the answer was ${correctAnswer}. ${pickRandom(ENCOURAGEMENT_LINES)}`,
    "error",
  );
  nextQuestionTimer = setTimeout(generateQuestion, 1400);
}

function checkAnswer() {
  if (questionLocked) {
    return;
  }

  if (!currentQuestion) {
    generateQuestion();
    return;
  }

  const rawValue = elements.answerInput.value.trim();
  if (rawValue === "") {
    showFeedback("Type a number first.", "info");
    return;
  }

  const answer = Number(rawValue);
  if (answer === currentQuestion.answer) {
    awardCorrectAnswer();
  } else {
    handleWrongAnswer();
  }
}

function hatchCreature(currency) {
  const lockedCreatures = window.DRAGONS.filter(
    (dragon) => !state.unlockedIds.includes(dragon.id),
  );
  if (!lockedCreatures.length) {
    elements.hatchMessage.textContent =
      "You have every creature already — amazing work!";
    updateStats();
    return;
  }

  if (currency === "coins") {
    if (state.coins < HATCH_COST.coins) {
      elements.hatchMessage.textContent = `You need ${HATCH_COST.coins} coins to hatch with coins.`;
      return;
    }
    state.coins -= HATCH_COST.coins;
  }

  if (currency === "crystals") {
    if (state.crystals < HATCH_COST.crystals) {
      elements.hatchMessage.textContent = `You need ${HATCH_COST.crystals} crystals to hatch with crystals.`;
      return;
    }
    state.crystals -= HATCH_COST.crystals;
  }

  const unlocked = weightedRandom(lockedCreatures);
  state.unlockedIds.push(unlocked.id);
  saveState();
  updateStats();
  renderCollection();
  elements.hatchMessage.textContent = `✨ Surprise! You hatched ${unlocked.name} ${unlocked.emoji}.`;
  playHatchAnimation(unlocked.id);
}

function resetProgress() {
  const confirmed = window.confirm(
    "Reset coins, crystals and creature progress?",
  );
  if (!confirmed) {
    return;
  }

  Object.assign(state, {
    ...DEFAULT_STATE,
    unlockedIds: [...DEFAULT_STATE.unlockedIds],
  });

  saveState();
  updateStats();
  renderCollection();
  generateQuestion();
  elements.hatchMessage.textContent =
    "Progress reset. Time to hatch a new collection!";
  showFeedback(
    "Fresh start! Solve a question to earn your first coins.",
    "info",
  );
}

function wireEvents() {
  elements.checkButton.addEventListener("click", checkAnswer);
  elements.newQuestionButton.addEventListener("click", generateQuestion);
  elements.resetButton.addEventListener("click", resetProgress);
  elements.coinHatchButton.addEventListener("click", () =>
    hatchCreature("coins"),
  );
  elements.crystalHatchButton.addEventListener("click", () =>
    hatchCreature("crystals"),
  );
  elements.modeSelect.addEventListener("change", generateQuestion);
  elements.difficultySelect.addEventListener("change", generateQuestion);
  elements.answerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      checkAnswer();
    }
  });
}

function init() {
  wireEvents();
  updateStats();
  renderCollection();
  generateQuestion();
  showFeedback(
    "Welcome to Maths Dragons! Answer correctly to earn rewards.",
    "info",
  );
}

init();
