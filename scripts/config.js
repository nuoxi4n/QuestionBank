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
  answerShuffle: false,
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

