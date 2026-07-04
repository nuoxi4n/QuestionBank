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

const MODE_ALIASES = {
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

const QUESTION_TYPE_ALIASES = {
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

const TRUE_FALSE_ANSWER_ALIASES = {
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

const DIFFICULTY_ALIASES = {
  easy: "easy",
  简单: "easy",
  medium: "medium",
  normal: "medium",
  中等: "medium",
  hard: "hard",
  difficult: "hard",
  困难: "hard",
};

const DEFAULT_BANK_SOURCES = [
  {
    id: "default",
    title: "前端综合题库",
    url: "./data/question-bank.json",
  },
];

const state = {
  bank: [],
  bankSources: [],
  selectedBankId: "",
  loadedBankId: "",
  bankVersion: 0,
  filterCache: {
    key: "",
    questions: [],
  },
  bankLoadToken: 0,
  bankLoading: false,
  mode: "sequence",
  session: null,
  source: "",
  urlPresetApplied: false,
  autoNext: false,
  answerShuffle: true,
  autoNextDelayMs: 3000,
  autoNextTimer: 0,
  examTimerInterval: 0,
  focusLayout: true,
  optionShortcutMode: "number",
  submitShortcutMode: "enter-space",
  navigationShortcutMode: "arrows",
  toastTimer: 0,
};

let els = {};
let confirmResolver = null;

function isAnswerShuffleEnabled(mode = state.mode) {
  return mode === "exam" || state.answerShuffle;
}

