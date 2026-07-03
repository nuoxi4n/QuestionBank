# QuestionBank Glass

纯前端刷题页面，支持顺序刷题、随机刷题、模拟考试，题库来自 JSON 文件。

## 运行

建议用本地静态服务打开，避免浏览器拦截 `fetch("./question-bank.json")`：

```bash
python -m http.server 5500
```

然后访问：

```text
http://127.0.0.1:5500/
```

## 题库格式

默认读取 `question-bank.json`。根节点可以是题目数组，也可以是：

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
| `type` | `sequence` / `random` / `exam` / `single` / `multiple` / `qa` | 兼容写法；建议刷题模式优先用 `mode`，题型优先用 `qtype` |
| `qtype` | `single` / `multiple` / `qa` | 题型筛选：单选、多选、问答 |
| `questionType` | `single` / `multiple` / `qa` | `qtype` 的兼容写法 |
| `category` | 题库中的分类名 | 分类筛选 |
| `cat` | 题库中的分类名 | `category` 的兼容写法 |
| `difficulty` | `easy` / `medium` / `hard` | 难度筛选 |
| `level` | `easy` / `medium` / `hard` | `difficulty` 的兼容写法 |
| `count` | 正整数 | 随机刷题或模拟考试抽题数量 |
| `num` / `n` / `limit` | 正整数 | `count` 的兼容写法 |
| `randomCount` | 正整数 | 随机刷题数量 |
| `examCount` | 正整数 | 模拟考试题数 |
| `minutes` | 正整数 | 模拟考试时长，单位分钟 |
| `examMinutes` | 正整数 | `minutes` 的兼容写法 |
| `duration` / `time` | 正整数 | `minutes` 的兼容写法 |
| `random` | 空值或正整数 | 快捷进入随机刷题；传数字时同时作为题数 |
| `exam` | 空值或正整数 | 快捷进入模拟考试；传数字时同时作为题数 |
| `start` | `1` / `0` | `1` 自动开始，`0` 只应用设置 |
| `autoStart` | `true` / `false` | `start` 的兼容写法 |

## 示例

20 题、45 分钟模拟考试：

```text
http://127.0.0.1:5500/?mode=exam&count=20&minutes=45&start=1
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
http://127.0.0.1:5500/?mode=sequence&qtype=qa&category=CSS&difficulty=medium&start=0
```

快捷写法：

```text
http://127.0.0.1:5500/?exam=30
http://127.0.0.1:5500/?random=10&qtype=multiple
```
