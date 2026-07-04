async function startSession(silent = false) {
  clearAutoNextTimer();
  clearExamTimer();

  if (!(await ensureSelectedBankLoaded())) {
    state.session = null;
    renderAll();
    return;
  }

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

  questions = prepareSessionQuestions(questions);

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

async function exitSession() {
  const session = state.session;
  if (!session) return;

  const hasProgress = session.questions.some((question) => hasAnswer(question, session.answers[question.id]));
  const message =
    session.mode === "exam"
      ? "退出后本次考试不会交卷，作答记录会清空，确认退出？"
      : "退出后本次作答记录会清空，确认退出？";

  if (
    hasProgress &&
    !(await requestConfirm({
      title: "退出本次会话？",
      message,
      confirmLabel: "退出",
    }))
  ) {
    return;
  }

  clearAutoNextTimer();
  clearExamTimer();
  state.session = null;
  renderAll();
  showToast(session.mode === "exam" ? "已退出本次考试" : "已退出本次练习");
}

function getFilteredBank() {
  const questionType = els.questionTypeSelect.value;
  const category = els.categorySelect.value;
  const level = els.levelSelect.value;
  const cacheKey = [state.bankVersion, questionType, category, level].join("|");

  if (state.filterCache.key === cacheKey) {
    return state.filterCache.questions;
  }

  const questions = state.bank.filter((question) => {
    const typeMatched = !questionType || question.type === questionType;
    const categoryMatched = !category || question.category === category;
    const levelMatched = !level || question.level === level;
    return typeMatched && categoryMatched && levelMatched;
  });

  state.filterCache = {
    key: cacheKey,
    questions,
  };

  return questions;
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

function prepareSessionQuestions(questions) {
  if (!isAnswerShuffleEnabled()) return questions;
  return questions.map(shuffleQuestionOptions);
}

function shuffleQuestionOptions(question) {
  if (!["single", "multiple"].includes(question.type) || question.options.length < 2) {
    return question;
  }

  const shuffled = shuffleOptionsEnsuringMovement(question.options);
  const originalToCurrentKey = new Map();
  const options = shuffled.map((option, index) => {
    const key = letterAt(index);
    originalToCurrentKey.set(normalizeChoiceKey(option.key), key);
    return {
      ...option,
      key,
    };
  });
  const answer = (question.answer || [])
    .map((key) => originalToCurrentKey.get(normalizeChoiceKey(key)))
    .filter(Boolean);

  return {
    ...question,
    options,
    answer,
  };
}

function shuffleOptionsEnsuringMovement(options) {
  const shuffled = [...options];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  const unchanged = shuffled.every((option, index) => normalizeChoiceKey(option.key) === normalizeChoiceKey(options[index].key));
  if (!unchanged) return shuffled;

  const offset = Math.floor(Math.random() * (options.length - 1)) + 1;
  return options.slice(offset).concat(options.slice(0, offset));
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
  els.exitSessionBtn.hidden = !session || Boolean(session.submitted);
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
  const session = state.session;
  const total = session?.questions.length || 0;
  const examPending = Boolean(session && session.mode === "exam" && !session.submitted);
  els.bankSize.textContent = String(state.bank.length);
  els.answeredCount.textContent = String(stats.answered);
  els.correctCount.textContent = String(stats.correct);
  els.accuracyRate.textContent = `${stats.accuracy}%`;
  els.paletteAnswered.textContent = String(stats.answered);
  els.paletteRemaining.textContent = String(Math.max(total - stats.answered, 0));
  els.paletteAccuracyLabel.textContent = examPending ? "评分" : "正确率";
  els.paletteAccuracy.textContent = examPending ? "交卷后" : `${stats.accuracy}%`;
  if (!state.bank.length && !state.bankLoading) {
    const source = findBankSource(state.selectedBankId);
    els.bankSource.textContent = source ? `已选择 ${source.title}，点击开始加载题库` : "题库未加载";
  } else if (!state.bankLoading) {
    els.bankSource.textContent = `${state.source || "未载入"} · ${getFilteredBank().length} 题可用`;
  }
  updateConfigSummary();
}

function updateConfigSummary() {
  if (!els.configSummary) return;

  const poolSize = getFilteredBank().length;
  const countLimit = state.bank.length ? Math.max(poolSize, 1) : Number.MAX_SAFE_INTEGER;
  const chips = [
    displayQuestionType(els.questionTypeSelect.value) || "全部题型",
    els.categorySelect.value || "全部分类",
    displayDifficulty(els.levelSelect.value) || "全部难度",
  ];

  if (isAnswerShuffleEnabled()) {
    chips.push("答案选项乱序");
  }

  if (state.mode === "random") {
    chips.push(`随机 ${getRequestedCount(els.randomCount, countLimit)} 题`);
  }

  if (state.mode === "exam") {
    chips.push(`考试 ${getRequestedCount(els.examCount, countLimit)} 题`);
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
      <span class="tag-pill">${escapeHtml(displayDifficulty(question.level))}</span>
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

  const indexes = getPaletteRenderIndexes(session.questions.length, session.currentIndex);
  let previousIndex = -1;
  const items = [];

  indexes.forEach((index) => {
    if (previousIndex >= 0 && index > previousIndex + 1) {
      items.push(`<span class="palette-gap" aria-hidden="true">...</span>`);
    }

    const question = session.questions[index];
    const record = session.answers[question.id];
    const classes = ["palette-button"];
    if (hasAnswer(question, record)) classes.push("is-answered");
    if (record?.checked && record.correct === true) classes.push("is-correct");
    if (record?.checked && record.correct === false) classes.push("is-wrong");
    if (record?.checked && record.correct === null) classes.push("is-review");
    if (index === session.currentIndex) classes.push("is-active");

    items.push(`<button class="${classes.join(" ")}" type="button" data-index="${index}">${index + 1}</button>`);
    previousIndex = index;
  });

  els.palette.innerHTML = items.join("");
}

function getPaletteRenderIndexes(total, currentIndex) {
  const fullRenderLimit = 300;
  if (total <= fullRenderLimit) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const edgeCount = 5;
  const windowRadius = 45;
  const indexes = new Set();

  for (let index = 0; index < Math.min(edgeCount, total); index += 1) {
    indexes.add(index);
  }

  for (let index = Math.max(0, total - edgeCount); index < total; index += 1) {
    indexes.add(index);
  }

  const start = Math.max(0, currentIndex - windowRadius);
  const end = Math.min(total - 1, currentIndex + windowRadius);
  for (let index = start; index <= end; index += 1) {
    indexes.add(index);
  }

  return [...indexes].sort((left, right) => left - right);
}
