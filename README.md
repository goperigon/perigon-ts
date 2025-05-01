<!-- ----------  Header  ---------- -->
<p align="center">
  <img src="https://goperigon.com/favicon.ico" width="120" alt="Perigon logo" />
</p>

<h1 align="center">Perigon&nbsp;TypeScript&nbsp;SDK</h1>
<p align="center">TypeScript client for the <strong>Perigon&nbsp;API</strong></p>

<!-- ----------  Badges  ---------- -->
<p align="center">
  <!-- npm -->
  <a href="https://www.npmjs.com/package/@goperigon/perigon-ts">
    <img src="https://img.shields.io/npm/v/@goperigon/perigon-ts?style=for-the-badge" alt="npm version">
  </a>
  <!-- tests -->
  <a href="https://github.com/goperigon/perigon-ts/actions/workflows/test.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/goperigon/perigon-ts/test.yml?label=tests%20%E2%9C%85&style=for-the-badge" alt="tests status">
  </a>
  <!-- bundle size -->
  <a href="https://bundlephobia.com/package/@goperigon/perigon-ts">
    <img src="https://img.shields.io/bundlephobia/minzip/@goperigon/perigon-ts?style=for-the-badge" alt="bundle size (min + gzip)">
  </a>
  <!-- docs -->
  <a href="https://docs.perigon.io">
    <img src="https://img.shields.io/badge/docs-perigon.io-informational?style=for-the-badge&logo=readthedocs" alt="documentation">
  </a>
  <!-- latest tag -->
  <a href="https://github.com/goperigon/perigon-ts/releases">
    <img src="https://img.shields.io/github/v/tag/goperigon/perigon-ts?label=version&style=for-the-badge" alt="latest tag">
  </a>
  <!-- license -->
  <a href="LICENSE">
    <img src="https://img.shields.io/github/license/goperigon/perigon-ts?style=for-the-badge" alt="license">
  </a>
</p>

A fully-typed, promise-based SDK generated from the official Perigon OpenAPI specification. Works in Node.js, modern browsers, Cloudflare Workers, and Deno.

## Table&nbsp;of&nbsp;Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [✨ Features](#-features)
- [📦 Installation](#-installation)
- [🚀 Quick start](#-quick-start)
- [🧑‍💻 Endpoint snippets](#-endpoint-snippets)
- [🧪 Running integration tests](#-running-integration-tests)
- [🤝 Contributing](#-contributing)
- [🪪 License](#-license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---

## ✨ Features

- **Type-safe** request/response models (goodbye `any`)
- Ships as both **ESM & CommonJS** with sourcemaps
- **Zero-dependency core** – bring your own `fetch` if needed
- Generated directly from [docs.perigon.io](https://docs.perigon.io), so it’s always in sync
- Runs in **Node, browsers, Deno, and edge runtimes**

---

## 📦 Installation

```bash
npm install @goperigon/perigon-ts
# yarn add @goperigon/perigon-ts
# pnpm add @goperigon/perigon-ts
```

---

## 🚀 Quick start

### 1. Export your API key

```bash
# .env
PERIGON_API_KEY=your_key_here
```

### 2. Instantiate the client

```ts
import { Configuration, V1Api } from "@goperigon/perigon-ts";

const perigon = new V1Api(
  new Configuration({
    apiKey: process.env.PERIGON_API_KEY!, // or () => 'your_key'
    // basePath: 'https://api.perigon.io',      // override for proxy / dev
  }),
);
```

### 3. Make calls

```ts
// 🔍 Search recent news articles
const { articles, numResults } = await perigon.searchArticles({
  q: "artificial intelligence",
  size: 5,
});
console.log(numResults, articles[0].title);

// 👤 Look up a journalist by ID
const journalist = await perigon.getJournalistById({ id: "123456" });
console.log(journalist.name);
```

> All SDK methods return **typed promises** with full IntelliSense support.

---

## 🧑‍💻 Endpoint snippets

### Articles – search and filter news (`/v1/all`)<br>

**Docs →** <https://docs.perigon.io/docs/overview>

```ts
const { articles } = await perigon.searchArticles({
  q: "technology",
  size: 5,
});
```

### Articles – date range filter<br>

**Docs →** <https://docs.perigon.io/docs/overview>

```ts
await perigon.searchArticles({
  q: "business",
  from: "2025-04-01",
  to: "2025-04-08",
});
```

### Articles – restrict to a source<br>

**Docs →** <https://docs.perigon.io/docs/overview>

```ts
await perigon.searchArticles({ source: ["nytimes.com"] });
```

### Companies – fetch structured company data (`/v1/companies`)<br>

**Docs →** <https://docs.perigon.io/docs/company-data>

```ts
const { results } = await perigon.searchCompanies({
  name: "Apple",
  size: 5,
});
```

### Journalists – search and detail look‑up (`/v1/journalists`)<br>

**Docs →** <https://docs.perigon.io/docs/journalist-data>

```ts
const { results } = await perigon.searchJournalists1({
  name: "Kevin",
  size: 1,
});
const journalist = await perigon.getJournalistById({ id: results[0].id });
```

### Stories – discover related article clusters (`/v1/stories`)<br>

**Docs →** <https://docs.perigon.io/docs/stories-overview>

```ts
await perigon.searchStories({ q: "climate change", size: 5 });
```

### Vector search – semantic retrieval (`/v1/vector`)<br>

**Docs →** <https://docs.perigon.io/docs/vector-endpoint>

```ts
await perigon.vectorSearchArticles({
  articleSearchParams: {
    prompt: "Latest advancements in artificial intelligence",
    size: 5,
  },
});
```

### Summarizer – generate an instant summary (`/v1/summarizer`)<br>

**Docs →** <https://docs.perigon.io/docs/search-summarizer>

```ts
const { summary } = await perigon.searchSummarizer({
  q: "renewable energy",
  size: 10,
});
console.log(summary);
```

### Topics – explore taxonomy (`/v1/topics`)<br>

**Docs →** <https://docs.perigon.io/docs/topics>

```ts
await perigon.searchTopics({ size: 10 });
```

| Action                                  | Code Example                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Filter by source                        | `await perigon.searchArticles({ source: ['nytimes.com'] })`                                             |
| Limit by date range                     | `await perigon.searchArticles({ q: 'business', from: '2025‑04‑01', to: '2025‑04‑08' })`                 |
| Company lookup                          | `await perigon.searchCompanies({ name: 'Apple', size: 5 })`                                             |
| Summarize any query                     | `await perigon.searchSummarizer({ q: 'renewable energy', size: 20 })`                                   |
| Semantic / vector search                | `await perigon.vectorSearchArticles({ articleSearchParams: { prompt: 'advancements in AI', size: 5 }})` |
| Retrieve available taxonomic **topics** | `await perigon.searchTopics({ size: 10 })`                                                              |

---

## 🧪 Running integration tests

The repository ships with Jest tests that hit the live API.

```bash
# 1. export your key
echo "PERIGON_API_KEY=..." > .env

# 2. run the suite (15–30 s)
npm test
```

Set `PERIGON_API_KEY` in your CI to keep tests green.

---

## 🤝 Contributing

1. `pnpm install`
2. Make your changes
3. Run `pnpm test`
4. Open a pull request – happy to review!

---

## 🪪 License

MIT © Perigon
