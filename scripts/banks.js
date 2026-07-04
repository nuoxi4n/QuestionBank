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
    const response = await fetch("./data/question-banks.json", { cache: "no-store" });
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
  return QUESTION_TYPE_ALIASES[key] || "single";
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
  const choiceKey = normalizeChoiceKey(answer);
  return TRUE_FALSE_ANSWER_ALIASES[key] || (["A", "B"].includes(choiceKey) ? choiceKey : "");
}

function normalizeChoiceKey(key) {
  return String(key || "").trim().toUpperCase();
}

function normalizeDifficulty(value) {
  const key = String(value || "medium").trim().toLowerCase();
  return DIFFICULTY_ALIASES[key] || key || "medium";
}

function letterAt(index) {
  return String.fromCharCode(65 + index);
}
