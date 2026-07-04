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

  switch (actionButton.dataset.action) {
    case "submit-current":
      submitCurrent();
      break;
    case "reveal":
      revealCurrent();
      break;
    case "next":
      goRelative(1);
      break;
    case "prev":
      goRelative(-1);
      break;
    case "submit-exam":
      submitExam();
      break;
    case "show-result":
      showResultDialog();
      break;
    case "restart":
      startSession();
      break;
  }
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
  if (!state.session || els.resultDialog.open || els.settingsDialog.open || els.confirmDialog.open) return;
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

async function submitExam(options = {}) {
  const session = state.session;
  if (!session || session.mode !== "exam" || session.submitted) return;

  const force = options?.force === true;
  const unanswered = session.questions.filter((question) => !hasAnswer(question, session.answers[question.id])).length;
  if (
    !force &&
    unanswered > 0 &&
    !(await requestConfirm({
      title: "确认交卷？",
      message: `还有 ${unanswered} 题未作答，交卷后将按当前答案评分。`,
      confirmLabel: "交卷",
    }))
  ) {
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

function requestConfirm({ title, message, confirmLabel = "确认" }) {
  closeConfirmDialog(false);
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  els.confirmOkBtn.querySelector("span").textContent = confirmLabel;

  if (!els.confirmDialog.open && typeof els.confirmDialog.showModal === "function") {
    els.confirmDialog.showModal();
  } else {
    els.confirmDialog.setAttribute("open", "");
  }

  refreshIcons();

  return new Promise((resolve) => {
    confirmResolver = resolve;
  });
}

function closeConfirmDialog(confirmed) {
  if (els.confirmDialog.open && typeof els.confirmDialog.close === "function") {
    els.confirmDialog.close();
  } else {
    els.confirmDialog.removeAttribute("open");
  }

  if (confirmResolver) {
    confirmResolver(Boolean(confirmed));
    confirmResolver = null;
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
