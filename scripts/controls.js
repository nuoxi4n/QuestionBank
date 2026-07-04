function populateFilters() {
  const questionTypes = uniqueValues(state.bank.map((question) => question.type));
  const categories = uniqueValues(state.bank.map((question) => question.category));
  const difficulties = uniqueValues(state.bank.map((question) => question.difficulty));

  fillSelect(els.questionTypeSelect, questionTypes, "全部题型", displayQuestionType);
  fillSelect(els.categorySelect, categories, "全部分类", (value) => value);
  fillSelect(els.difficultySelect, difficulties, "全部难度", displayDifficulty);
}

function fillSelect(select, values, allLabel, labeler) {
  const previous = select.value;
  const options = [`<option value="">${escapeHtml(allLabel)}</option>`]
    .concat(
      values.map((value) => {
        const selected = value === previous ? " selected" : "";
        return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(labeler(value))}</option>`;
      }),
    )
    .join("");

  select.innerHTML = options;

  if (previous && values.includes(previous)) {
    select.value = previous;
  }
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function displayDifficulty(value) {
  return DIFFICULTY_LABELS[value] || value;
}

function displayQuestionType(value) {
  return TYPE_LABELS[value] || value;
}

function applyUrlPreset() {
  const params = new URLSearchParams(window.location.search);
  if (!params.size) return false;

  const explicitMode = parseModeParam(getParam(params, ["mode", "m"]));
  const explicitQuestionType = parseQuestionTypeParam(getParam(params, ["qtype"]));
  const hasExamShortcut = params.has("exam");
  const hasRandomShortcut = params.has("random");
  const examShortcut = getParam(params, ["exam"]);
  const randomShortcut = getParam(params, ["random"]);

  if (explicitMode) {
    state.mode = explicitMode;
  } else if (hasExamShortcut) {
    state.mode = "exam";
  } else if (hasRandomShortcut) {
    state.mode = "random";
  }

  setSelectFromParam(els.questionTypeSelect, explicitQuestionType);
  setSelectFromParam(els.categorySelect, getParam(params, ["category"]));
  setSelectFromParam(els.difficultySelect, parseDifficultyParam(getParam(params, ["level"])));

  const count = getPositiveInteger(getParam(params, ["count"]));
  const examCount = getPositiveInteger(getParam(params, ["examCount", "exam_count"])) || getPositiveInteger(examShortcut);
  const randomCount =
    getPositiveInteger(getParam(params, ["randomCount", "random_count"])) || getPositiveInteger(randomShortcut);
  const examMinutes = getPositiveInteger(getParam(params, ["minutes"]));
  const answerShuffle = getBooleanParam(params, [
    "shuffleAnswers",
    "answerShuffle",
    "shuffleOptions",
    "answer_shuffle",
  ]);

  if (count) {
    els.examCount.value = String(count);
    els.randomCount.value = String(count);
  }
  if (examCount) {
    els.examCount.value = String(examCount);
  }
  if (randomCount) {
    els.randomCount.value = String(randomCount);
  }
  if (examMinutes) {
    els.examMinutes.value = String(examMinutes);
    persistExamMinutes();
  }
  if (answerShuffle !== null) {
    state.answerShuffle = answerShuffle;
    els.answerShuffleToggle.checked = answerShuffle;
  }

  updateModeControls();
  return isTrueParam(getParam(params, ["start"]));
}

function getParam(params, names) {
  for (const name of names) {
    if (params.has(name)) {
      return String(params.get(name) || "").trim();
    }
  }
  return "";
}

function parseModeParam(value) {
  const key = String(value || "").trim().toLowerCase();
  return MODE_ALIASES[key] || "";
}

function parseQuestionTypeParam(value) {
  const key = String(value || "").trim().toLowerCase();
  return QUESTION_TYPE_ALIASES[key] || "";
}

function parseDifficultyParam(value) {
  if (!value) return "";
  return normalizeDifficulty(value);
}

function setSelectFromParam(select, value) {
  if (!value) return;
  const option = [...select.options].find((item) => item.value === value);
  if (option) {
    select.value = value;
  }
}

function getPositiveInteger(value) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function getBooleanParam(params, names) {
  for (const name of names) {
    if (params.has(name)) {
      return parseBooleanParam(params.get(name));
    }
  }
  return null;
}

function parseBooleanParam(value) {
  const key = String(value ?? "").trim().toLowerCase();
  if (!key) return true;
  if (["1", "true", "yes", "on", "是"].includes(key)) return true;
  if (["0", "false", "no", "off", "否"].includes(key)) return false;
  return null;
}

function isTrueParam(value) {
  const key = String(value || "").trim().toLowerCase();
  return ["1", "true", "yes", "on", "是"].includes(key);
}

function updateModeControls() {
  els.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.mode);
  });

  els.configFields.forEach((field) => {
    const targetMode = field.dataset.configFor;
    field.classList.toggle("is-hidden", targetMode !== state.mode);
  });

  els.settingsGrid.classList.toggle("is-sequence", state.mode === "sequence");
  els.quantitySettingsGroup.classList.toggle("is-hidden", state.mode === "sequence");
  els.autoNextSetting.classList.toggle("is-hidden", state.mode === "exam");
  els.autoNextDelayField.classList.toggle("is-hidden", state.mode === "exam");
  els.focusLayoutToggle.checked = state.mode === "exam" || state.focusLayout;
  els.focusLayoutToggle.disabled = state.mode === "exam";
  els.focusLayoutSetting.classList.toggle("is-hidden", state.mode === "exam");
  if (state.mode === "exam") {
    clearAutoNextTimer();
  }

  renderHeader();
  updateConfigSummary();
  refreshIcons();
}

function updateQuantityLimits() {
  const poolSize = getFilteredBank().length;
  [els.randomCount, els.examCount].forEach((input) => {
    input.max = String(Math.max(poolSize, 1));
    const current = Number(input.value) || 1;
    input.value = String(clamp(current, 1, Math.max(poolSize, 1)));
  });
}
