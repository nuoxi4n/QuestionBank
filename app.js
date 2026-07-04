const TYPE_LABELS = {
  single: "单选",
  multiple: "多选",
  truefalse: "判断",
  qa: "问答",
};

const MODE_LABELS = {
  sequence: "顺序刷题",
  random: "随机刷题",
  exam: "模拟考试",
};

const DIFFICULTY_LABELS = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

const DEFAULT_BANK_SOURCES = [
  {
    id: "default",
    title: "前端综合题库",
    url: "./question-bank.json",
  },
];

const FALLBACK_QUESTIONS = [
  {
    id: "F001",
    type: "single",
    category: "前端基础",
    difficulty: "easy",
    stem: "HTML 中用于引入外部样式表的标签是？",
    options: [
      { key: "A", text: "<script>" },
      { key: "B", text: "<link>" },
      { key: "C", text: "<style-src>" },
      { key: "D", text: "<css>" },
    ],
    answer: ["B"],
    explanation: "<link rel=\"stylesheet\" href=\"...\"> 用于引入外部 CSS 文件。",
  },
  {
    id: "F002",
    type: "multiple",
    category: "JavaScript",
    difficulty: "medium",
    stem: "以下哪些方法会返回一个新数组？",
    options: [
      { key: "A", text: "map" },
      { key: "B", text: "filter" },
      { key: "C", text: "push" },
      { key: "D", text: "slice" },
    ],
    answer: ["A", "B", "D"],
    explanation: "map、filter、slice 都会返回新数组，push 会修改原数组并返回新长度。",
  },
  {
    id: "F003",
    type: "truefalse",
    category: "JavaScript",
    difficulty: "easy",
    stem: "const 声明的变量不能被重新赋值。",
    answer: true,
    explanation: "const 声明的绑定不可重新赋值，但对象或数组内部成员仍可能被修改。",
  },
  {
    id: "F004",
    type: "qa",
    category: "浏览器",
    difficulty: "medium",
    stem: "简述 localStorage 与 sessionStorage 的主要区别。",
    answer: "localStorage 数据长期保存，除非主动清除；sessionStorage 只在当前页面会话中保存，标签页关闭后通常会被清除。",
    keywords: ["localStorage", "sessionStorage", "关闭"],
    explanation: "二者都属于 Web Storage，同源隔离，容量通常比 Cookie 更大。",
  },
];

const state = {
  bank: [],
  bankSources: [],
  selectedBankId: "",
  mode: "sequence",
  session: null,
  source: "",
  urlPresetApplied: false,
  autoNext: false,
  autoNextDelayMs: 3000,
  autoNextTimer: 0,
  examTimerInterval: 0,
  focusLayout: false,
  optionShortcutMode: "number",
  submitShortcutMode: "enter-space",
  navigationShortcutMode: "arrows",
  toastTimer: 0,
};

let els = {};

document.addEventListener("DOMContentLoaded", init);

function init() {
  collectElements();
  loadSettings();
  bindEvents();
  updateModeControls();
  loadBankCatalog();
}

function collectElements() {
  els = {
    bankFile: document.querySelector("#bankFile"),
    bankSelect: document.querySelector("#bankSelect"),
    reloadBankBtn: document.querySelector("#reloadBankBtn"),
    startBtn: document.querySelector("#startBtn"),
    workspace: document.querySelector(".workspace"),
    settingsPanel: document.querySelector(".settings-panel"),
    topSettingsBtn: document.querySelector("#topSettingsBtn"),
    openSettingsBtn: document.querySelector("#openSettingsBtn"),
    settingsDialog: document.querySelector("#settingsDialog"),
    closeSettingsBtn: document.querySelector("#closeSettingsBtn"),
    applySettingsBtn: document.querySelector("#applySettingsBtn"),
    modeButtons: [...document.querySelectorAll(".mode-button")],
    settingsGrid: document.querySelector(".settings-grid"),
    quantitySettingsGroup: document.querySelector("#quantitySettingsGroup"),
    configFields: [...document.querySelectorAll("[data-config-for]")],
    configSummary: document.querySelector("#configSummary"),
    autoNextSetting: document.querySelector("#autoNextSetting"),
    autoNextToggle: document.querySelector("#autoNextToggle"),
    autoNextDelayField: document.querySelector("#autoNextDelayField"),
    autoNextDelayMs: document.querySelector("#autoNextDelayMs"),
    focusLayoutSetting: document.querySelector("#focusLayoutSetting"),
    focusLayoutToggle: document.querySelector("#focusLayoutToggle"),
    optionShortcutSelect: document.querySelector("#optionShortcutSelect"),
    submitShortcutSelect: document.querySelector("#submitShortcutSelect"),
    navigationShortcutSelect: document.querySelector("#navigationShortcutSelect"),
    questionTypeSelect: document.querySelector("#questionTypeSelect"),
    categorySelect: document.querySelector("#categorySelect"),
    difficultySelect: document.querySelector("#difficultySelect"),
    randomCount: document.querySelector("#randomCount"),
    examCount: document.querySelector("#examCount"),
    examMinutes: document.querySelector("#examMinutes"),
    bankSize: document.querySelector("#bankSize"),
    answeredCount: document.querySelector("#answeredCount"),
    correctCount: document.querySelector("#correctCount"),
    accuracyRate: document.querySelector("#accuracyRate"),
    bankSource: document.querySelector("#bankSource"),
    modeLabel: document.querySelector("#modeLabel"),
    sessionTitle: document.querySelector("#sessionTitle"),
    prevBtn: document.querySelector("#prevBtn"),
    nextBtn: document.querySelector("#nextBtn"),
    examTimer: document.querySelector("#examTimer"),
    examTimerText: document.querySelector("#examTimerText"),
    progressBar: document.querySelector("#progressBar"),
    questionCard: document.querySelector("#questionCard"),
    palette: document.querySelector("#palette"),
    progressText: document.querySelector("#progressText"),
    submitExamBtn: document.querySelector("#submitExamBtn"),
    resultDialog: document.querySelector("#resultDialog"),
    closeResultBtn: document.querySelector("#closeResultBtn"),
    resultTitle: document.querySelector("#resultTitle"),
    resultAnswered: document.querySelector("#resultAnswered"),
    resultCorrect: document.querySelector("#resultCorrect"),
    resultReview: document.querySelector("#resultReview"),
    reviewBtn: document.querySelector("#reviewBtn"),
    retryBtn: document.querySelector("#retryBtn"),
    toast: document.querySelector("#toast"),
  };
}

function bindEvents() {
  els.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.mode = button.dataset.mode;
      updateModeControls();
      updateQuantityLimits();
    });
  });

  els.categorySelect.addEventListener("change", () => {
    updateQuantityLimits();
    renderStats();
  });

  els.questionTypeSelect.addEventListener("change", () => {
    updateQuantityLimits();
    renderStats();
  });

  els.difficultySelect.addEventListener("change", () => {
    updateQuantityLimits();
    renderStats();
  });

  [els.randomCount, els.examCount, els.examMinutes].forEach((input) => {
    input.addEventListener("input", () => updateConfigSummary());
    input.addEventListener("change", () => {
      updateQuantityLimits();
      persistExamMinutes();
      updateConfigSummary();
    });
  });

  els.startBtn.addEventListener("click", () => startSession());
  els.topSettingsBtn.addEventListener("click", openSettingsDialog);
  els.openSettingsBtn.addEventListener("click", openSettingsDialog);
  els.closeSettingsBtn.addEventListener("click", closeSettingsDialog);
  els.applySettingsBtn.addEventListener("click", closeSettingsDialog);
  els.settingsDialog.addEventListener("click", (event) => {
    if (event.target === els.settingsDialog) {
      closeSettingsDialog();
    }
  });
  els.autoNextToggle.addEventListener("change", () => {
    state.autoNext = els.autoNextToggle.checked;
    state.autoNextDelayMs = getAutoNextDelayMs();
    writeStoredBoolean("questionbank.autoNext", state.autoNext);
    writeStoredString("questionbank.autoNextDelayMs", String(state.autoNextDelayMs));
    clearAutoNextTimer();
    renderAll();
    if (state.autoNext && state.session) {
      const question = getCurrentQuestion();
      const record = getRecord(question);
      if (record.checked && !record.revealed) {
        scheduleAutoNext(question, record);
      }
    }
    showToast(state.autoNext ? "已开启自动下一题" : "已关闭自动下一题");
  });
  els.autoNextDelayMs.addEventListener("change", () => {
    state.autoNextDelayMs = getAutoNextDelayMs();
    writeStoredString("questionbank.autoNextDelayMs", String(state.autoNextDelayMs));
    rescheduleAutoNextForCurrentQuestion();
  });
  els.optionShortcutSelect.addEventListener("change", () => {
    state.optionShortcutMode = els.optionShortcutSelect.value;
    writeStoredString("questionbank.optionShortcutMode", state.optionShortcutMode);
    showToast("已更新选项快捷键");
  });
  els.submitShortcutSelect.addEventListener("change", () => {
    state.submitShortcutMode = els.submitShortcutSelect.value;
    writeStoredString("questionbank.submitShortcutMode", state.submitShortcutMode);
    showToast("已更新提交快捷键");
  });
  els.navigationShortcutSelect.addEventListener("change", () => {
    state.navigationShortcutMode = els.navigationShortcutSelect.value;
    writeStoredString("questionbank.navigationShortcutMode", state.navigationShortcutMode);
    showToast("已更新切题快捷键");
  });
  els.focusLayoutToggle.addEventListener("change", () => {
    if (state.mode === "exam") {
      els.focusLayoutToggle.checked = true;
      return;
    }

    state.focusLayout = els.focusLayoutToggle.checked;
    writeStoredBoolean("questionbank.focusLayout", state.focusLayout);
    renderAll();
    showToast(state.focusLayout ? "已开启专注布局" : "已关闭专注布局");
  });
  els.bankSelect.addEventListener("change", () => loadSelectedBank(els.bankSelect.value));
  els.reloadBankBtn.addEventListener("click", () => reloadSelectedBank());
  els.bankFile.addEventListener("change", handleBankFile);
  els.prevBtn.addEventListener("click", () => goRelative(-1));
  els.nextBtn.addEventListener("click", () => goRelative(1));
  els.submitExamBtn.addEventListener("click", submitExam);
  els.closeResultBtn.addEventListener("click", closeResultDialog);
  els.retryBtn.addEventListener("click", () => {
    closeResultDialog();
    startSession();
  });
  els.reviewBtn.addEventListener("click", () => {
    closeResultDialog();
    jumpToReviewTarget();
  });

  els.palette.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    goToIndex(Number(button.dataset.index));
  });

  els.questionCard.addEventListener("click", handleQuestionClick);
  els.questionCard.addEventListener("input", handleQuestionInput);
  document.addEventListener("keydown", handleGlobalShortcut);
}

function loadSettings() {
  state.autoNext = readStoredBoolean("questionbank.autoNext", false);
  state.autoNextDelayMs = readStoredClampedNumber("questionbank.autoNextDelayMs", 3000, 0, 10000);
  state.focusLayout = readStoredBoolean("questionbank.focusLayout", false);
  state.optionShortcutMode = readStoredChoice("questionbank.optionShortcutMode", "number", [
    "number",
    "letter",
    "both",
    "off",
  ]);
  state.submitShortcutMode = readStoredChoice("questionbank.submitShortcutMode", "enter-space", [
    "enter-space",
    "enter",
    "space",
    "off",
  ]);
  state.navigationShortcutMode = readStoredChoice("questionbank.navigationShortcutMode", "arrows", ["arrows", "off"]);
  els.autoNextToggle.checked = state.autoNext;
  els.autoNextDelayMs.value = String(state.autoNextDelayMs);
  els.focusLayoutToggle.checked = state.focusLayout;
  els.optionShortcutSelect.value = state.optionShortcutMode;
  els.submitShortcutSelect.value = state.submitShortcutMode;
  els.navigationShortcutSelect.value = state.navigationShortcutMode;
  els.examMinutes.value = String(readStoredNumber("questionbank.examMinutes", 45));
}

function readStoredBoolean(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : value === "true";
  } catch {
    return fallback;
  }
}

function writeStoredBoolean(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Private browsing or file restrictions can disable storage; the live setting still works.
  }
}

function readStoredString(key, fallback) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function readStoredNumber(key, fallback) {
  const value = Number.parseInt(readStoredString(key, String(fallback)), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function readStoredClampedNumber(key, fallback, min, max) {
  const value = Number.parseInt(readStoredString(key, String(fallback)), 10);
  return Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

function readStoredChoice(key, fallback, choices) {
  const value = readStoredString(key, fallback);
  return choices.includes(value) ? value : fallback;
}

function writeStoredString(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private browsing or file restrictions can disable storage; the live setting still works.
  }
}

function persistExamMinutes() {
  writeStoredString("questionbank.examMinutes", String(getExamMinutes()));
}

function openSettingsDialog() {
  if (typeof els.settingsDialog.showModal === "function") {
    els.settingsDialog.showModal();
  } else {
    els.settingsDialog.setAttribute("open", "");
  }
  refreshIcons();
}

function closeSettingsDialog() {
  if (els.settingsDialog.open && typeof els.settingsDialog.close === "function") {
    els.settingsDialog.close();
  } else {
    els.settingsDialog.removeAttribute("open");
  }
}

async function loadBankCatalog() {
  els.bankSource.textContent = "题库读取中";

  const sources = await loadBankSources();
  state.bankSources = sources;
  populateBankSelect();

  const params = new URLSearchParams(window.location.search);
  const bankFromUrl = getParam(params, ["bank"]);
  const storedBankId = readStoredString("questionbank.selectedBankId", "");
  const selectedSource =
    findBankSource(bankFromUrl) || findBankSource(storedBankId) || state.bankSources[0];

  await loadSelectedBank(selectedSource?.id || "");
}

async function loadBankSources() {
  try {
    const response = await fetch("./question-banks.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return normalizeBankSources(await response.json());
  } catch (error) {
    console.warn(error);
    return DEFAULT_BANK_SOURCES;
  }
}

function normalizeBankSources(raw) {
  const list = Array.isArray(raw) ? raw : raw?.banks;
  if (!Array.isArray(list)) return DEFAULT_BANK_SOURCES;

  const sources = list
    .map((item, index) => ({
      id: String(item.id || item.name || `bank-${index + 1}`).trim(),
      title: String(item.title || item.label || item.name || item.id || `题库 ${index + 1}`).trim(),
      url: String(item.url || item.path || "").trim(),
    }))
    .filter((item) => item.id && item.title && item.url);

  return sources.length ? sources : DEFAULT_BANK_SOURCES;
}

function populateBankSelect() {
  els.bankSelect.innerHTML = state.bankSources
    .map((source) => `<option value="${escapeHtml(source.id)}">${escapeHtml(source.title)}</option>`)
    .join("");

  if (state.selectedBankId && findBankSource(state.selectedBankId)) {
    els.bankSelect.value = state.selectedBankId;
  }
}

async function loadSelectedBank(id) {
  const source = findBankSource(id) || state.bankSources[0];
  if (!source) {
    setBank(normalizeBank(FALLBACK_QUESTIONS), "内置示例题库", { bankId: "fallback" });
    showToast("未找到可用题库，已使用内置示例题库");
    return;
  }

  state.selectedBankId = source.id;
  els.bankSelect.value = source.id;
  writeStoredString("questionbank.selectedBankId", source.id);
  els.bankSource.textContent = "题库读取中";

  try {
    const bank = source.bank || (await fetchBank(source.url));
    setBank(bank, source.title, { bankId: source.id });
    showToast(`已切换到 ${source.title}`);
  } catch (error) {
    const bank = normalizeBank(FALLBACK_QUESTIONS);
    setBank(bank, "内置示例题库", { bankId: "fallback" });
    showToast(`未能读取 ${source.title}，已使用内置示例题库`);
    console.warn(error);
  }
}

async function reloadSelectedBank() {
  const source = findBankSource(state.selectedBankId) || state.bankSources[0];
  if (!source) return;

  if (source.bank) {
    setBank(source.bank, source.title, { bankId: source.id, applyPreset: false });
    showToast(`已重新载入 ${source.title}`);
    return;
  }

  await loadSelectedBank(source.id);
}

async function fetchBank(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return normalizeBank(await response.json());
}

function findBankSource(id) {
  return state.bankSources.find((source) => source.id === id);
}

function handleBankFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result || ""));
      const bank = normalizeBank(data);
      const source = addImportedBankSource(file.name, bank);
      populateBankSelect();
      setBank(bank, source.title, { bankId: source.id, applyPreset: false });
      showToast(`已导入 ${file.name}`);
    } catch (error) {
      showToast("JSON 题库格式无效");
      console.error(error);
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file, "utf-8");
}

function addImportedBankSource(fileName, bank) {
  const id = `import:${Date.now()}`;
  const source = {
    id,
    title: fileName,
    bank,
  };

  state.bankSources = state.bankSources.filter((item) => item.id !== id).concat(source);
  state.selectedBankId = id;
  writeStoredString("questionbank.selectedBankId", id);
  return source;
}

function setBank(bank, source, options = {}) {
  state.bank = bank;
  state.source = source;
  if (options.bankId) {
    state.selectedBankId = options.bankId;
    if (findBankSource(options.bankId)) {
      els.bankSelect.value = options.bankId;
    }
  }

  populateFilters();
  const shouldApplyPreset = options.applyPreset ?? !state.urlPresetApplied;
  const shouldStart = shouldApplyPreset ? applyUrlPreset() : false;
  if (shouldApplyPreset) {
    state.urlPresetApplied = true;
  }
  updateQuantityLimits();

  if (shouldStart) {
    startSession(true);
  } else {
    state.session = null;
    renderAll();
  }
}

function normalizeBank(raw) {
  const list = Array.isArray(raw) ? raw : raw?.questions;
  if (!Array.isArray(list)) {
    throw new Error("Question bank must be an array or { questions: [] }.");
  }

  const questions = list
    .map((item, index) => normalizeQuestion(item, index))
    .filter(Boolean);

  if (!questions.length) {
    throw new Error("Question bank is empty.");
  }

  return questions;
}

function normalizeQuestion(item, index) {
  const type = normalizeType(item.type || item.kind || item.questionType || item["类型"]);
  const stem = String(item.stem || item.title || item.question || item["题干"] || item["题目"] || "").trim();
  if (!stem) return null;

  const id = String(item.id || item.no || `Q${String(index + 1).padStart(3, "0")}`);
  const rawOptions = normalizeOptions(item.options || item.choices || item["选项"] || []);
  const options = type === "qa" ? [] : type === "truefalse" && !rawOptions.length ? getTrueFalseOptions() : rawOptions;
  const answer = item.answer ?? item.answers ?? item.correctAnswer ?? item["答案"] ?? item["正确答案"];

  return {
    id,
    type,
    stem,
    options,
    answer: normalizeAnswer(answer, type),
    explanation: String(item.explanation || item.analysis || item["解析"] || "").trim(),
    category: String(item.category || item.subject || item["分类"] || "未分类").trim() || "未分类",
    difficulty: normalizeDifficulty(item.difficulty || item.level || item["难度"] || "medium"),
    keywords: Array.isArray(item.keywords)
      ? item.keywords.map((keyword) => String(keyword).trim()).filter(Boolean)
      : [],
  };
}

function normalizeType(type) {
  const key = String(type || "single").trim().toLowerCase();
  const map = {
    radio: "single",
    single_choice: "single",
    singlechoice: "single",
    choice: "single",
    单选: "single",
    多选: "multiple",
    checkbox: "multiple",
    multiple_choice: "multiple",
    multiplechoice: "multiple",
    truefalse: "truefalse",
    true_false: "truefalse",
    truefalse_choice: "truefalse",
    judge: "truefalse",
    judgment: "truefalse",
    boolean: "truefalse",
    判断: "truefalse",
    判断题: "truefalse",
    qa: "qa",
    question: "qa",
    short: "qa",
    essay: "qa",
    问答: "qa",
    简答: "qa",
  };
  return map[key] || (["single", "multiple", "truefalse", "qa"].includes(key) ? key : "single");
}

function getTrueFalseOptions() {
  return [
    { key: "A", text: "正确" },
    { key: "B", text: "错误" },
  ];
}

function normalizeOptions(options) {
  if (Array.isArray(options)) {
    return options
      .map((option, index) => {
        if (typeof option === "string") {
          return { key: letterAt(index), text: option };
        }
        return {
          key: normalizeChoiceKey(option.key || option.label || option.value || letterAt(index)),
          text: String(option.text || option.content || option.title || option.value || "").trim(),
        };
      })
      .filter((option) => option.text);
  }

  if (options && typeof options === "object") {
    return Object.entries(options).map(([key, text]) => ({
      key: normalizeChoiceKey(key),
      text: String(text).trim(),
    }));
  }

  return [];
}

function normalizeAnswer(answer, type) {
  if (type === "qa") {
    return String(answer || "").trim();
  }

  if (type === "truefalse") {
    const values = Array.isArray(answer) ? answer : [answer];
    const normalized = values.map(normalizeTrueFalseAnswer).filter(Boolean);
    return normalized.length ? [normalized[0]] : [];
  }

  if (Array.isArray(answer)) {
    return answer.map(normalizeChoiceKey).filter(Boolean);
  }

  const text = String(answer || "").trim();
  if (!text) return [];

  if (/[,，、\s|/]+/.test(text)) {
    return text.split(/[,，、\s|/]+/).map(normalizeChoiceKey).filter(Boolean);
  }

  if (/^[A-Za-z]+$/.test(text) && text.length > 1) {
    return text.split("").map(normalizeChoiceKey);
  }

  return [normalizeChoiceKey(text)];
}

function normalizeTrueFalseAnswer(answer) {
  if (typeof answer === "boolean") {
    return answer ? "A" : "B";
  }

  const key = String(answer ?? "").trim().toLowerCase();
  const map = {
    true: "A",
    t: "A",
    yes: "A",
    y: "A",
    correct: "A",
    right: "A",
    "1": "A",
    对: "A",
    是: "A",
    正确: "A",
    "√": "A",
    false: "B",
    f: "B",
    no: "B",
    n: "B",
    incorrect: "B",
    wrong: "B",
    "0": "B",
    错: "B",
    否: "B",
    错误: "B",
    "×": "B",
  };
  const choiceKey = normalizeChoiceKey(answer);
  return map[key] || (["A", "B"].includes(choiceKey) ? choiceKey : "");
}

function normalizeChoiceKey(key) {
  return String(key || "").trim().toUpperCase();
}

function normalizeDifficulty(value) {
  const key = String(value || "medium").trim().toLowerCase();
  const map = {
    easy: "easy",
    简单: "easy",
    medium: "medium",
    normal: "medium",
    中等: "medium",
    hard: "hard",
    difficult: "hard",
    困难: "hard",
  };
  return map[key] || key || "medium";
}

function letterAt(index) {
  return String.fromCharCode(65 + index);
}

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
  if (!params.size) return true;

  const typeParam = getParam(params, ["type"]);
  const explicitMode = parseModeParam(getParam(params, ["mode", "m"]));
  const modeFromType = parseModeParam(typeParam);
  const explicitQuestionType = parseQuestionTypeParam(getParam(params, ["qtype"]));
  const questionTypeFromType = parseQuestionTypeParam(typeParam);
  const hasExamShortcut = params.has("exam");
  const hasRandomShortcut = params.has("random");
  const examShortcut = getParam(params, ["exam"]);
  const randomShortcut = getParam(params, ["random"]);

  if (explicitMode || modeFromType) {
    state.mode = explicitMode || modeFromType;
  } else if (hasExamShortcut) {
    state.mode = "exam";
  } else if (hasRandomShortcut) {
    state.mode = "random";
  }

  setSelectFromParam(els.questionTypeSelect, explicitQuestionType || questionTypeFromType);
  setSelectFromParam(els.categorySelect, getParam(params, ["category"]));
  setSelectFromParam(els.difficultySelect, parseDifficultyParam(getParam(params, ["level"])));

  const count = getPositiveInteger(getParam(params, ["count"]));
  const examCount = getPositiveInteger(getParam(params, ["examCount", "exam_count"])) || getPositiveInteger(examShortcut);
  const randomCount =
    getPositiveInteger(getParam(params, ["randomCount", "random_count"])) || getPositiveInteger(randomShortcut);
  const examMinutes = getPositiveInteger(getParam(params, ["minutes"]));

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

  updateModeControls();
  return !isFalseParam(getParam(params, ["start"]));
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
  const map = {
    sequence: "sequence",
    seq: "sequence",
    order: "sequence",
    ordered: "sequence",
    list: "sequence",
    顺序: "sequence",
    random: "random",
    rand: "random",
    shuffle: "random",
    随机: "random",
    exam: "exam",
    mock: "exam",
    test: "exam",
    考试: "exam",
    模拟: "exam",
    模拟考试: "exam",
  };
  return map[key] || "";
}

function parseQuestionTypeParam(value) {
  const key = String(value || "").trim().toLowerCase();
  const map = {
    single: "single",
    radio: "single",
    single_choice: "single",
    singlechoice: "single",
    choice: "single",
    单选: "single",
    multiple: "multiple",
    checkbox: "multiple",
    multiple_choice: "multiple",
    multiplechoice: "multiple",
    多选: "multiple",
    truefalse: "truefalse",
    true_false: "truefalse",
    truefalse_choice: "truefalse",
    judge: "truefalse",
    judgment: "truefalse",
    boolean: "truefalse",
    判断: "truefalse",
    判断题: "truefalse",
    qa: "qa",
    question: "qa",
    short: "qa",
    essay: "qa",
    问答: "qa",
    简答: "qa",
  };
  return map[key] || "";
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

function isFalseParam(value) {
  const key = String(value || "").trim().toLowerCase();
  return ["0", "false", "no", "off", "否", "不"].includes(key);
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
  els.focusLayoutSetting.classList.toggle("is-forced", state.mode === "exam");
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

function startSession(silent = false) {
  clearAutoNextTimer();
  clearExamTimer();
  const pool = getFilteredBank();

  if (!pool.length) {
    state.session = null;
    renderAll();
    showToast("当前筛选没有可用题目");
    return;
  }

  let questions = [];
  if (state.mode === "sequence") {
    questions = [...pool];
  }

  if (state.mode === "random") {
    const count = getRequestedCount(els.randomCount, pool.length);
    questions = sampleQuestions(pool, count);
  }

  if (state.mode === "exam") {
    const count = getRequestedCount(els.examCount, pool.length);
    questions = sampleQuestions(pool, count);
  }

  const startedAt = Date.now();
  const examMinutes = state.mode === "exam" ? getExamMinutes() : 0;

  state.session = {
    mode: state.mode,
    questions,
    currentIndex: 0,
    answers: {},
    submitted: false,
    startedAt,
    timeLimitMinutes: examMinutes,
    endsAt: examMinutes ? startedAt + examMinutes * 60 * 1000 : 0,
  };

  if (state.session.mode === "exam") {
    startExamTimer();
  }

  renderAll();

  if (!silent) {
    showToast(`${MODE_LABELS[state.mode]} · ${questions.length} 题`);
  }
}

function getFilteredBank() {
  const questionType = els.questionTypeSelect.value;
  const category = els.categorySelect.value;
  const difficulty = els.difficultySelect.value;

  return state.bank.filter((question) => {
    const typeMatched = !questionType || question.type === questionType;
    const categoryMatched = !category || question.category === category;
    const difficultyMatched = !difficulty || question.difficulty === difficulty;
    return typeMatched && categoryMatched && difficultyMatched;
  });
}

function getRequestedCount(input, max) {
  const value = Number(input.value) || 1;
  return clamp(value, 1, max);
}

function getExamMinutes() {
  const value = Number(els.examMinutes.value) || 45;
  const minutes = clamp(Math.floor(value), 1, 24 * 60);
  els.examMinutes.value = String(minutes);
  return minutes;
}

function getAutoNextDelayMs() {
  const value = Number(els.autoNextDelayMs.value);
  const delay = Number.isFinite(value) ? Math.floor(value) : 3000;
  const clamped = clamp(delay, 0, 10000);
  els.autoNextDelayMs.value = String(clamped);
  return clamped;
}

function sampleQuestions(pool, count) {
  const copy = [...pool];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy.slice(0, count);
}

function renderAll() {
  renderWorkspaceState();
  renderHeader();
  renderQuestion();
  renderPalette();
  renderStats();
  refreshIcons();
}

function renderWorkspaceState() {
  const session = state.session;
  const forceFocus = Boolean(session && session.mode === "exam");
  const optionalFocus = Boolean(session && session.mode !== "exam" && state.focusLayout);
  const focusLayoutActive = Boolean((forceFocus || optionalFocus) && !isSessionComplete(session));
  els.workspace.classList.toggle("is-focus-layout", focusLayoutActive);
  els.settingsPanel.toggleAttribute("inert", focusLayoutActive);
  els.settingsPanel.setAttribute("aria-hidden", String(focusLayoutActive));
}

function isSessionComplete(session) {
  if (!session) return false;
  if (session.mode === "exam") return Boolean(session.submitted);
  return session.questions.every((question) => session.answers[question.id]?.checked);
}

function renderHeader() {
  const session = state.session;
  const current = session ? session.currentIndex + 1 : 0;
  const total = session ? session.questions.length : 0;
  const progress = total ? (current / total) * 100 : 0;

  els.modeLabel.textContent = MODE_LABELS[session?.mode || state.mode];
  els.sessionTitle.textContent = session ? `${current} / ${total}` : "准备开始";
  els.progressBar.style.width = `${progress}%`;
  els.progressText.textContent = `${current} / ${total}`;
  els.prevBtn.disabled = !session || session.currentIndex === 0;
  els.nextBtn.disabled = !session || session.currentIndex >= total - 1;
  els.submitExamBtn.hidden = !(session && session.mode === "exam");
  els.submitExamBtn.disabled = !session || session.submitted;
  renderExamTimer();
}

function startExamTimer() {
  clearExamTimer();
  renderExamTimer();
  state.examTimerInterval = window.setInterval(() => {
    renderExamTimer();

    const session = state.session;
    if (!session || session.mode !== "exam" || session.submitted) {
      clearExamTimer();
      return;
    }

    if (getRemainingExamMs() <= 0) {
      showToast("考试时间到，已自动交卷");
      submitExam({ force: true });
    }
  }, 1000);
}

function clearExamTimer() {
  if (!state.examTimerInterval) return;
  window.clearInterval(state.examTimerInterval);
  state.examTimerInterval = 0;
}

function renderExamTimer() {
  const session = state.session;
  const visible = Boolean(session && session.mode === "exam" && !session.submitted && session.endsAt);
  els.examTimer.hidden = !visible;

  if (!visible) {
    els.examTimerText.textContent = "00:00";
    els.examTimer.classList.remove("is-urgent");
    return;
  }

  const remaining = getRemainingExamMs();
  els.examTimerText.textContent = formatDuration(remaining);
  els.examTimer.classList.toggle("is-urgent", remaining <= 60 * 1000);
}

function getRemainingExamMs() {
  const endsAt = state.session?.endsAt || 0;
  return Math.max(0, endsAt - Date.now());
}

function formatDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderStats() {
  const stats = computeStats();
  els.bankSize.textContent = String(state.bank.length);
  els.answeredCount.textContent = String(stats.answered);
  els.correctCount.textContent = String(stats.correct);
  els.accuracyRate.textContent = `${stats.accuracy}%`;
  els.bankSource.textContent = `${state.source || "未载入"} · ${getFilteredBank().length} 题可用`;
  updateConfigSummary();
}

function updateConfigSummary() {
  if (!els.configSummary) return;

  const poolSize = getFilteredBank().length;
  const chips = [
    displayQuestionType(els.questionTypeSelect.value) || "全部题型",
    els.categorySelect.value || "全部分类",
    displayDifficulty(els.difficultySelect.value) || "全部难度",
  ];

  if (state.mode === "random") {
    chips.push(`随机 ${getRequestedCount(els.randomCount, Math.max(poolSize, 1))} 题`);
  }

  if (state.mode === "exam") {
    chips.push(`考试 ${getRequestedCount(els.examCount, Math.max(poolSize, 1))} 题`);
    chips.push(`${getExamMinutes()} 分钟`);
  }

  els.configSummary.innerHTML = chips
    .map((chip) => `<span class="summary-chip">${escapeHtml(chip)}</span>`)
    .join("");
}

function computeStats() {
  const session = state.session;
  if (!session) {
    return { answered: 0, correct: 0, wrong: 0, review: 0, accuracy: 0 };
  }

  const stats = session.questions.reduce(
    (result, question) => {
      const record = session.answers[question.id];
      if (hasAnswer(question, record)) result.answered += 1;
      if (record?.correct === true) result.correct += 1;
      if (record?.correct === false) result.wrong += 1;
      if (record?.checked && record.correct === null) result.review += 1;
      return result;
    },
    { answered: 0, correct: 0, wrong: 0, review: 0, accuracy: 0 },
  );

  const graded = stats.correct + stats.wrong;
  stats.accuracy = graded ? Math.round((stats.correct / graded) * 100) : 0;
  return stats;
}

function renderQuestion() {
  const session = state.session;
  if (!session || !session.questions.length) {
    els.questionCard.innerHTML = `
      <div class="empty-state">
        <i data-lucide="book-open-check"></i>
        <h3>载入题库后即可开始</h3>
      </div>
    `;
    return;
  }

  const question = getCurrentQuestion();
  const record = getRecord(question);
  const feedbackVisible = shouldShowFeedback(question, record);

  els.questionCard.innerHTML = `
    <div class="question-meta">
      <span class="type-pill">${escapeHtml(TYPE_LABELS[question.type] || "题目")}</span>
      <span class="tag-pill">${escapeHtml(question.category)}</span>
      <span class="tag-pill">${escapeHtml(displayDifficulty(question.difficulty))}</span>
      <span class="tag-pill">ID ${escapeHtml(question.id)}</span>
    </div>
    <h3 class="question-title">${escapeHtml(question.stem)}</h3>
    ${renderAnswerInput(question, record, feedbackVisible)}
    ${feedbackVisible ? renderFeedback(question, record) : ""}
    ${renderQuestionActions(record)}
  `;
}

function renderAnswerInput(question, record, feedbackVisible) {
  const locked = isCurrentLocked(record);

  if (question.type === "qa") {
    const value = typeof record?.value === "string" ? record.value : "";
    return `
      <textarea
        id="qaInput"
        class="answer-area"
        placeholder="写下你的答案"
        ${locked ? "disabled" : ""}
      >${escapeHtml(value)}</textarea>
    `;
  }

  const selected = new Set(Array.isArray(record?.value) ? record.value : []);
  const correctKeys = new Set(Array.isArray(question.answer) ? question.answer : []);

  return `
    <div class="option-list">
      ${question.options
        .map((option) => {
          const isSelected = selected.has(option.key);
          const isCorrect = feedbackVisible && correctKeys.has(option.key);
          const isWrong = feedbackVisible && isSelected && !correctKeys.has(option.key);
          const classes = [
            "option-button",
            isSelected ? "is-selected" : "",
            isCorrect ? "is-correct" : "",
            isWrong ? "is-wrong" : "",
            locked ? "is-locked" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return `
            <button class="${classes}" type="button" data-option="${escapeHtml(option.key)}" data-choice-type="${question.type}">
              <span class="option-key">${escapeHtml(option.key)}</span>
              <span class="option-text">${escapeHtml(option.text)}</span>
              <span class="option-mark" aria-hidden="true"></span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderFeedback(question, record) {
  const correct = record?.correct;
  const status = getFeedbackStatus(correct);
  const reference = question.type === "qa" ? question.answer : formatChoiceAnswer(question);
  const explanation = question.explanation || "暂无解析";
  const selfGrade =
    question.type === "qa"
      ? `
        <div class="self-grade">
          <button class="secondary-button" type="button" data-self-grade="true">
            <i data-lucide="circle-check"></i>
            <span>算答对</span>
          </button>
          <button class="secondary-button" type="button" data-self-grade="false">
            <i data-lucide="circle-x"></i>
            <span>算答错</span>
          </button>
        </div>
      `
      : "";

  return `
    <div class="feedback ${status.className}">
      <div class="feedback-title">
        <i data-lucide="${status.icon}"></i>
        <span>${status.label}</span>
      </div>
      <div>
        <strong>参考答案</strong>
        <p class="reference-answer">${escapeHtml(reference || "未设置答案")}</p>
      </div>
      <div>
        <strong>解析</strong>
        <p class="reference-answer">${escapeHtml(explanation)}</p>
      </div>
      ${selfGrade}
    </div>
  `;
}

function getFeedbackStatus(correct) {
  if (correct === true) {
    return { label: "回答正确", icon: "circle-check", className: "is-correct" };
  }

  if (correct === false) {
    return { label: "回答错误", icon: "circle-x", className: "is-wrong" };
  }

  return { label: "待自评", icon: "circle-help", className: "is-review" };
}

function renderQuestionActions(record) {
  const session = state.session;
  const isLast = session.currentIndex >= session.questions.length - 1;

  if (session.mode === "exam") {
    if (session.submitted) {
      return `
        <div class="question-actions">
          <div class="action-left">
            <button class="secondary-button" type="button" data-action="show-result">
              <i data-lucide="chart-no-axes-combined"></i>
              <span>结果</span>
            </button>
          </div>
          <div class="action-right">
            <button class="primary-button" type="button" data-action="restart">
              <i data-lucide="rotate-cw"></i>
              <span>再来一次</span>
            </button>
          </div>
        </div>
      `;
    }

    return `
      <div class="question-actions">
        <div class="action-left">
          <button class="secondary-button" type="button" data-action="prev" ${session.currentIndex === 0 ? "disabled" : ""}>
            <i data-lucide="chevron-left"></i>
            <span>上一题</span>
          </button>
        </div>
        <div class="action-right">
          <button class="secondary-button" type="button" data-action="submit-exam">
            <i data-lucide="send"></i>
            <span>交卷</span>
          </button>
          <button class="primary-button" type="button" data-action="${isLast ? "submit-exam" : "next"}">
            <i data-lucide="${isLast ? "send" : "chevron-right"}"></i>
            <span>${isLast ? "交卷" : "下一题"}</span>
          </button>
        </div>
      </div>
    `;
  }

  const checked = Boolean(record?.checked);
  const hideNextAction = state.autoNext && checked && !record?.revealed && !isLast;
  const primaryAction = checked ? (isLast ? "show-result" : "next") : "submit-current";
  const primaryLabel = checked ? (isLast ? "结果" : "下一题") : "提交答案";
  const primaryIcon = checked ? (isLast ? "chart-no-axes-combined" : "chevron-right") : "check";
  const primaryButton = hideNextAction
    ? ""
    : `
      <div class="action-right">
        <button class="primary-button" type="button" data-action="${primaryAction}">
          <i data-lucide="${primaryIcon}"></i>
          <span>${primaryLabel}</span>
        </button>
      </div>
    `;

  return `
    <div class="question-actions">
      <div class="action-left">
        <button class="secondary-button" type="button" data-action="reveal" ${checked ? "disabled" : ""}>
          <i data-lucide="eye"></i>
          <span>查看答案</span>
        </button>
      </div>
      ${primaryButton}
    </div>
  `;
}

function renderPalette() {
  const session = state.session;
  if (!session) {
    els.palette.innerHTML = "";
    return;
  }

  els.palette.innerHTML = session.questions
    .map((question, index) => {
      const record = session.answers[question.id];
      const classes = ["palette-button"];
      if (hasAnswer(question, record)) classes.push("is-answered");
      if (record?.checked && record.correct === true) classes.push("is-correct");
      if (record?.checked && record.correct === false) classes.push("is-wrong");
      if (record?.checked && record.correct === null) classes.push("is-review");
      if (index === session.currentIndex) classes.push("is-active");

      return `<button class="${classes.join(" ")}" type="button" data-index="${index}">${index + 1}</button>`;
    })
    .join("");
}

function handleQuestionClick(event) {
  const option = event.target.closest("[data-option]");
  if (option) {
    chooseOption(option.dataset.option);
    return;
  }

  const selfGradeButton = event.target.closest("[data-self-grade]");
  if (selfGradeButton) {
    gradeCurrentQa(selfGradeButton.dataset.selfGrade === "true");
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;

  const action = actionButton.dataset.action;
  if (action === "submit-current") submitCurrent();
  if (action === "reveal") revealCurrent();
  if (action === "next") goRelative(1);
  if (action === "prev") goRelative(-1);
  if (action === "submit-exam") submitExam();
  if (action === "show-result") showResultDialog();
  if (action === "restart") startSession();
}

function handleQuestionInput(event) {
  if (event.target.id !== "qaInput") return;

  const question = getCurrentQuestion();
  const record = getRecord(question);
  if (isCurrentLocked(record)) return;

  state.session.answers[question.id] = {
    ...record,
    value: event.target.value,
    checked: false,
    correct: undefined,
  };

  renderPalette();
  renderStats();
}

function handleGlobalShortcut(event) {
  if (event.repeat || event.isComposing || shouldIgnoreShortcutTarget(event.target)) return;
  if (!state.session || els.resultDialog.open || els.settingsDialog.open) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  const navigationOffset = getShortcutNavigationOffset(event);
  if (navigationOffset) {
    event.preventDefault();
    goRelative(navigationOffset);
    return;
  }

  const optionIndex = getShortcutOptionIndex(event);
  if (optionIndex !== null) {
    event.preventDefault();
    chooseOptionByIndex(optionIndex);
    return;
  }

  if (matchesSubmitShortcut(event)) {
    event.preventDefault();
    runSubmitShortcut();
  }
}

function shouldIgnoreShortcutTarget(target) {
  if (!target) return false;
  if (target.closest?.("input, textarea, select, [contenteditable='true']")) return true;

  const button = target.closest?.("button");
  return Boolean(button && !button.closest("#questionCard"));
}

function getShortcutNavigationOffset(event) {
  if (state.navigationShortcutMode === "off") return 0;
  if (event.key === "ArrowLeft") return -1;
  if (event.key === "ArrowRight") return 1;
  return 0;
}

function getShortcutOptionIndex(event) {
  const question = getCurrentQuestion();
  if (!question || question.type === "qa" || state.optionShortcutMode === "off") return null;

  const allowNumbers = state.optionShortcutMode === "number" || state.optionShortcutMode === "both";
  const allowLetters = state.optionShortcutMode === "letter" || state.optionShortcutMode === "both";
  const key = event.key.toLowerCase();

  if (allowNumbers && /^[1-9]$/.test(key)) {
    return Number(key) - 1;
  }

  if (allowLetters && /^[a-i]$/.test(key)) {
    return key.charCodeAt(0) - "a".charCodeAt(0);
  }

  return null;
}

function chooseOptionByIndex(index) {
  const question = getCurrentQuestion();
  if (!question || question.type === "qa") return;

  const option = question.options[index];
  if (!option) return;

  chooseOption(option.key);
}

function matchesSubmitShortcut(event) {
  if (state.submitShortcutMode === "off") return false;

  const isEnter = event.key === "Enter";
  const isSpace = event.key === " " || event.code === "Space";

  if (state.submitShortcutMode === "enter") return isEnter;
  if (state.submitShortcutMode === "space") return isSpace;
  return isEnter || isSpace;
}

function runSubmitShortcut() {
  const session = state.session;
  if (!session) return;

  if (session.mode === "exam") {
    if (!session.submitted && session.currentIndex < session.questions.length - 1) {
      goRelative(1);
    }
    return;
  }

  const question = getCurrentQuestion();
  const record = getRecord(question);
  const isLast = session.currentIndex >= session.questions.length - 1;

  if (!record.checked) {
    submitCurrent();
    return;
  }

  if (isLast) {
    showResultDialog();
    return;
  }

  if (!state.autoNext || record.revealed) {
    goRelative(1);
  }
}

function chooseOption(key) {
  const question = getCurrentQuestion();
  const record = getRecord(question);
  if (isCurrentLocked(record)) return;

  let value = Array.isArray(record.value) ? [...record.value] : [];

  if (question.type === "single" || question.type === "truefalse") {
    value = [key];
  } else {
    value = value.includes(key) ? value.filter((item) => item !== key) : [...value, key];
  }

  state.session.answers[question.id] = {
    ...record,
    value,
    checked: false,
    correct: undefined,
  };

  renderAll();
}

function submitCurrent() {
  const question = getCurrentQuestion();
  const record = getRecord(question);

  if (!hasAnswer(question, record)) {
    showToast("请先作答");
    return;
  }

  const correct = evaluateAnswer(question, record);
  const updatedRecord = {
    ...record,
    checked: true,
    correct,
  };

  state.session.answers[question.id] = {
    ...updatedRecord,
  };

  renderAll();
  scheduleAutoNext(question, updatedRecord);
}

function revealCurrent() {
  const question = getCurrentQuestion();
  const record = getRecord(question);
  const correct = question.type === "qa" ? null : hasAnswer(question, record) && compareChoiceAnswer(question, record);

  state.session.answers[question.id] = {
    ...record,
    checked: true,
    correct,
    revealed: true,
  };

  renderAll();
}

function submitExam(options = {}) {
  const session = state.session;
  if (!session || session.mode !== "exam" || session.submitted) return;

  const force = options?.force === true;
  const unanswered = session.questions.filter((question) => !hasAnswer(question, session.answers[question.id])).length;
  if (!force && unanswered > 0 && !window.confirm(`还有 ${unanswered} 题未作答，确认交卷？`)) {
    return;
  }

  session.questions.forEach((question) => {
    const record = getRecord(question);
    const answered = hasAnswer(question, record);
    session.answers[question.id] = {
      ...record,
      checked: true,
      correct: answered ? evaluateAnswer(question, record) : false,
    };
  });

  session.submitted = true;
  clearExamTimer();
  renderAll();
  showResultDialog();
}

function evaluateAnswer(question, record) {
  if (question.type === "qa") {
    return evaluateQaAnswer(question, record);
  }

  return compareChoiceAnswer(question, record);
}

function compareChoiceAnswer(question, record) {
  const expected = [...new Set(question.answer || [])].map(normalizeChoiceKey).sort();
  const actual = [...new Set(record?.value || [])].map(normalizeChoiceKey).sort();

  if (expected.length !== actual.length) return false;
  return expected.every((key, index) => key === actual[index]);
}

function evaluateQaAnswer(question, record) {
  const value = String(record?.value || "").trim();
  if (!value) return false;

  if (!question.keywords.length) {
    return null;
  }

  const lowerValue = value.toLowerCase();
  return question.keywords.every((keyword) => lowerValue.includes(String(keyword).toLowerCase()));
}

function gradeCurrentQa(correct) {
  const question = getCurrentQuestion();
  if (question.type !== "qa") return;

  const record = getRecord(question);
  state.session.answers[question.id] = {
    ...record,
    checked: true,
    correct,
  };

  renderAll();
}

function scheduleAutoNext(question, record) {
  const session = state.session;
  clearAutoNextTimer();

  if (!state.autoNext || !session || session.mode === "exam" || session.submitted) return;
  if (session.currentIndex >= session.questions.length - 1) return;
  if (question.type === "qa" && record.correct === null) return;

  state.autoNextTimer = window.setTimeout(() => {
    if (!state.session || !state.autoNext) return;

    const current = getCurrentQuestion();
    const currentRecord = getRecord(current);
    if (current.id !== question.id || !currentRecord.checked) return;

    goRelative(1);
  }, state.autoNextDelayMs);
}

function rescheduleAutoNextForCurrentQuestion() {
  clearAutoNextTimer();
  if (!state.autoNext || !state.session) return;

  const question = getCurrentQuestion();
  const record = getRecord(question);
  if (record.checked && !record.revealed) {
    scheduleAutoNext(question, record);
  }
}

function clearAutoNextTimer() {
  if (!state.autoNextTimer) return;
  window.clearTimeout(state.autoNextTimer);
  state.autoNextTimer = 0;
}

function goRelative(offset) {
  const session = state.session;
  if (!session) return;
  goToIndex(session.currentIndex + offset);
}

function goToIndex(index) {
  const session = state.session;
  if (!session) return;
  clearAutoNextTimer();
  session.currentIndex = clamp(index, 0, session.questions.length - 1);
  renderAll();
}

function jumpToReviewTarget() {
  const session = state.session;
  if (!session) return;

  const targetIndex = session.questions.findIndex((question) => {
    const record = session.answers[question.id];
    return record?.correct === false || record?.correct === null;
  });

  if (targetIndex >= 0) {
    session.currentIndex = targetIndex;
  }

  renderAll();
}

function showResultDialog() {
  const stats = computeStats();
  const total = state.session?.questions.length || 0;

  els.resultTitle.textContent = `${stats.correct} / ${total}`;
  els.resultAnswered.textContent = String(stats.answered);
  els.resultCorrect.textContent = String(stats.correct);
  els.resultReview.textContent = String(stats.review);

  if (!els.resultDialog.open && typeof els.resultDialog.showModal === "function") {
    els.resultDialog.showModal();
  } else {
    els.resultDialog.setAttribute("open", "");
  }

  refreshIcons();
}

function closeResultDialog() {
  if (els.resultDialog.open && typeof els.resultDialog.close === "function") {
    els.resultDialog.close();
  } else {
    els.resultDialog.removeAttribute("open");
  }
}

function getCurrentQuestion() {
  return state.session.questions[state.session.currentIndex];
}

function getRecord(question) {
  return (
    state.session.answers[question.id] || {
      value: question.type === "qa" ? "" : [],
      checked: false,
      correct: undefined,
    }
  );
}

function hasAnswer(question, record) {
  if (!record) return false;
  if (question.type === "qa") {
    return String(record.value || "").trim().length > 0;
  }
  return Array.isArray(record.value) && record.value.length > 0;
}

function shouldShowFeedback(question, record) {
  if (!record?.checked) return false;
  if (state.session.mode === "exam") {
    return state.session.submitted;
  }
  return true;
}

function isCurrentLocked(record) {
  if (!state.session) return true;
  if (state.session.submitted) return true;
  return state.session.mode !== "exam" && Boolean(record?.checked);
}

function formatChoiceAnswer(question) {
  const optionMap = new Map(question.options.map((option) => [option.key, option.text]));
  return (question.answer || [])
    .map((key) => `${key}. ${optionMap.get(key) || ""}`.trim())
    .join("\n");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(message) {
  window.clearTimeout(state.toastTimer);
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  state.toastTimer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2600);
}

function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}
