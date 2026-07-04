# QuestionBank Glass

纯前端刷题页面，支持顺序刷题、随机刷题、模拟考试和多题库切换，题库来自 JSON 文件。

## 运行

建议用本地静态服务打开，避免浏览器拦截 `fetch("./question-banks.json")` 和题库 JSON：

```bash
python -m http.server 5500
```

然后访问：

```text
http://127.0.0.1:5500/
```

## 文件结构

```text
index.html                  页面结构
styles.css                  样式入口，导入 styles/ 下的分文件
styles/base.css             基础变量、顶部栏、按钮
styles/layout.css           主布局、设置面板、通用表单
styles/quiz.css             题目、选项、反馈、答题卡
styles/dialogs.css          弹窗、Toast
styles/responsive.css       响应式规则
scripts/config.js           常量、内置题库、全局状态
scripts/core.js             启动入口、初始化、事件绑定、本地设置、设置弹窗
scripts/banks.js            多题库读取、导入、题库归一化
scripts/controls.js         筛选、URL 参数、模式控件
scripts/session.js          开始/退出会话、渲染、统计
scripts/interactions.js     作答交互、评分、导航、结果/确认弹窗
```

## 题库格式

默认先读取 `question-banks.json` 作为题库清单，再按当前选择读取对应题库。清单格式：

```json
{
  "banks": [
    {
      "id": "frontend",
      "title": "前端综合题库",
      "url": "./question-bank.json"
    }
  ]
}
```

如果清单读取失败，会退回读取 `question-bank.json`。单个题库文件的根节点可以是题目数组，也可以是：

```json
{
  "questions": []
}
```

单选/多选题示例：

```json
{
  "id": "FE001",
  "type": "single",
  "category": "HTML",
  "difficulty": "easy",
  "stem": "HTML 中用于引入外部样式表的标签是？",
  "options": [
    { "key": "A", "text": "<script>" },
    { "key": "B", "text": "<link>" }
  ],
  "answer": "B",
  "explanation": "link 标签用于引入外部 CSS。"
}
```

判断题示例：

```json
{
  "id": "FE008",
  "type": "truefalse",
  "category": "JavaScript",
  "difficulty": "easy",
  "stem": "const 声明的变量不能被重新赋值。",
  "answer": true,
  "explanation": "const 声明的绑定不可重新赋值。"
}
```

问答题示例：

```json
{
  "id": "FE009",
  "type": "qa",
  "category": "浏览器",
  "difficulty": "medium",
  "stem": "简述 localStorage 与 sessionStorage 的主要区别。",
  "answer": "localStorage 长期保存；sessionStorage 在当前会话中保存。",
  "keywords": ["localStorage", "sessionStorage"],
  "explanation": "二者都遵循同源策略。"
}
```

## URL 参数

页面支持通过地址栏参数一键进入指定刷题配置。界面中的题型、分类、难度、题数、考试时长等设置也可以在“设置”弹窗里调整。

| 参数 | 可选值 | 说明 |
| --- | --- | --- |
| `mode` | `sequence` / `random` / `exam` | 刷题模式：顺序、随机、模拟考试 |
| `bank` | `question-banks.json` 中的题库 `id` | 默认选中的题库 |
| `type` | `sequence` / `random` / `exam` / `single` / `multiple` / `truefalse` / `qa` | 兼容写法；建议刷题模式优先用 `mode`，题型优先用 `qtype` |
| `qtype` | `single` / `multiple` / `truefalse` / `qa` | 题型筛选：单选、多选、判断、问答 |
| `category` | 题库中的分类名 | 分类筛选 |
| `level` | `easy` / `medium` / `hard` | 难度筛选 |
| `count` | 正整数 | 随机刷题或模拟考试抽题数量 |
| `randomCount` | 正整数 | 随机刷题数量 |
| `examCount` | 正整数 | 模拟考试题数 |
| `minutes` | 正整数 | 模拟考试时长，单位分钟 |
| `random` | 空值或正整数 | 快捷设置为随机刷题；传数字时同时作为题数 |
| `exam` | 空值或正整数 | 快捷设置为模拟考试；传数字时同时作为题数 |
| `start` | `1` / `0` | `1` 自动开始；不传或传 `0` 只应用设置 |

## 示例

20 题、45 分钟模拟考试：

```text
http://127.0.0.1:5500/?bank=frontend&mode=exam&count=20&minutes=45&start=1
```

只抽 10 道单选题做模拟考试：

```text
http://127.0.0.1:5500/?mode=exam&qtype=single&count=10&start=1
```

随机 10 道多选题：

```text
http://127.0.0.1:5500/?mode=random&qtype=multiple&count=10&start=1
```

只应用 CSS 中等难度问答题筛选，不立即开始：

```text
http://127.0.0.1:5500/?mode=sequence&qtype=qa&category=CSS&level=medium&start=0
```

快捷写法：

```text
http://127.0.0.1:5500/?exam=30&start=1
http://127.0.0.1:5500/?random=10&qtype=multiple&start=1
```
