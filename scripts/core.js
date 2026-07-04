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
    openSettingsBtn: document.querySelector("#openSettingsBtn"),
    settingsDialog: document.querySelector("#settingsDialog"),
    closeSettingsBtn: document.querySelector("#closeSettingsBtn"),
    applySettingsBtn: document.querySelector("#applySettingsBtn"),
    modeButtons: [...document.querySelectorAll(".mode-button")],
    settingsGrid: document.querySelector(".settings-grid"),
    quantitySettingsGroup: document.querySelector("#quantitySettingsGroup"),
    behaviorSettingsGroup: document.querySelector(".settings-group.is-behavior"),
    configFields: [...document.querySelectorAll("[data-config-for]")],
    configSummary: document.querySelector("#configSummary"),
    autoNextSetting: document.querySelector("#autoNextSetting"),
    autoNextToggle: document.querySelector("#autoNextToggle"),
    answerShuffleSetting: document.querySelector("#answerShuffleSetting"),
    answerShuffleToggle: document.querySelector("#answerShuffleToggle"),
    autoNextDelayField: document.querySelector("#autoNextDelayField"),
    autoNextDelayMs: document.querySelector("#autoNextDelayMs"),
    focusLayoutSetting: document.querySelector("#focusLayoutSetting"),
    focusLayoutToggle: document.querySelector("#focusLayoutToggle"),
    optionShortcutSelect: document.querySelector("#optionShortcutSelect"),
    submitShortcutSelect: document.querySelector("#submitShortcutSelect"),
    navigationShortcutSelect: document.querySelector("#navigationShortcutSelect"),
    questionTypeSelect: document.querySelector("#questionTypeSelect"),
    categorySelect: document.querySelector("#categorySelect"),
    levelSelect: document.querySelector("#levelSelect"),
    randomCount: document.querySelector("#randomCount"),
    examCount: document.querySelector("#examCount"),
    examMinutes: document.querySelector("#examMinutes"),
    bankSource: document.querySelector("#bankSource"),
    modeLabel: document.querySelector("#modeLabel"),
    sessionTitle: document.querySelector("#sessionTitle"),
    exitSessionBtn: document.querySelector("#exitSessionBtn"),
    prevBtn: document.querySelector("#prevBtn"),
    nextBtn: document.querySelector("#nextBtn"),
    examTimer: document.querySelector("#examTimer"),
    examTimerText: document.querySelector("#examTimerText"),
    progressBar: document.querySelector("#progressBar"),
    questionCard: document.querySelector("#questionCard"),
    palette: document.querySelector("#palette"),
    progressText: document.querySelector("#progressText"),
    paletteAnswered: document.querySelector("#paletteAnswered"),
    paletteRemaining: document.querySelector("#paletteRemaining"),
    paletteAccuracyLabel: document.querySelector("#paletteAccuracyLabel"),
    paletteAccuracy: document.querySelector("#paletteAccuracy"),
    resultDialog: document.querySelector("#resultDialog"),
    closeResultBtn: document.querySelector("#closeResultBtn"),
    resultTitle: document.querySelector("#resultTitle"),
    resultAnswered: document.querySelector("#resultAnswered"),
    resultCorrect: document.querySelector("#resultCorrect"),
    resultReview: document.querySelector("#resultReview"),
    reviewBtn: document.querySelector("#reviewBtn"),
    retryBtn: document.querySelector("#retryBtn"),
    confirmDialog: document.querySelector("#confirmDialog"),
    confirmTitle: document.querySelector("#confirmTitle"),
    confirmMessage: document.querySelector("#confirmMessage"),
    confirmCancelBtn: document.querySelector("#confirmCancelBtn"),
    confirmOkBtn: document.querySelector("#confirmOkBtn"),
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

  els.levelSelect.addEventListener("change", () => {
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
  els.answerShuffleToggle.addEventListener("change", () => {
    state.answerShuffle = els.answerShuffleToggle.checked;
    writeStoredBoolean("questionbank.answerShuffle", state.answerShuffle);
    updateConfigSummary();
    const suffix = state.session ? "，下次开始生效" : "";
    showToast(`${state.answerShuffle ? "已开启" : "已关闭"}答案选项乱序${suffix}`);
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
  els.bankSelect.addEventListener("change", () => selectBankSource(els.bankSelect.value));
  els.reloadBankBtn.addEventListener("click", () => reloadSelectedBank());
  els.bankFile.addEventListener("change", handleBankFile);
  els.prevBtn.addEventListener("click", () => goRelative(-1));
  els.nextBtn.addEventListener("click", () => goRelative(1));
  els.exitSessionBtn.addEventListener("click", exitSession);
  els.closeResultBtn.addEventListener("click", closeResultDialog);
  els.retryBtn.addEventListener("click", () => {
    closeResultDialog();
    startSession();
  });
  els.reviewBtn.addEventListener("click", () => {
    closeResultDialog();
    jumpToReviewTarget();
  });
  els.confirmCancelBtn.addEventListener("click", () => closeConfirmDialog(false));
  els.confirmOkBtn.addEventListener("click", () => closeConfirmDialog(true));
  els.confirmDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeConfirmDialog(false);
  });
  els.confirmDialog.addEventListener("click", (event) => {
    if (event.target === els.confirmDialog) {
      closeConfirmDialog(false);
    }
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
  state.answerShuffle = readStoredBoolean("questionbank.answerShuffle", true);
  state.autoNextDelayMs = readStoredClampedNumber("questionbank.autoNextDelayMs", 3000, 0, 10000);
  state.focusLayout = readStoredBoolean("questionbank.focusLayout", true);
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
  els.answerShuffleToggle.checked = state.answerShuffle;
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

document.addEventListener("DOMContentLoaded", init);
