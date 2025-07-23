# Perigon SDK Examples

This folder contains practical examples demonstrating how to use the Perigon TypeScript SDK to access news data, stories, and AI-powered features.

## 🚀 Quick Start

### Prerequisites

1. **Get a Perigon API Key**
   - Sign up at [goperigon.com](https://www.goperigon.com/)
   - Get your API key from the dashboard

2. **Set Environment Variable**

   ```bash
   export PERIGON_API_KEY="your_api_key_here"
   ```

   Or create a `.env` file in this directory:

   ```env
   PERIGON_API_KEY=your_api_key_here
   ```

3. **Install Dependencies**
   ```bash
   cd examples
   npm install
   ```

## 📖 Available Examples

### Basic Usage (`basic-usage.js`)

**Run with:** `npm run basic`

Demonstrates fundamental SDK features:

- ✅ Basic article search with queries
- ✅ Filtering by source and date range
- ✅ Story search (clustered articles)
- ✅ Company-focused article search
- ✅ Proper error handling

**What you'll learn:**

- How to initialize the SDK with your API key
- Basic search parameters and filtering
- Handling different response types
- Error management and troubleshooting

### Advanced Usage (`advanced-usage.js`)

**Run with:** `node advanced-usage.js`

Shows sophisticated features:

- 🤖 AI-powered article summarization
- 🏢 Company and entity search
- 😊 Sentiment analysis filtering
- 🌍 Geographic news filtering
- 📚 Topic-based story discovery
- 🔍 Complex multi-parameter searches
- 🛠️ Custom middleware for logging

**What you'll learn:**

- Advanced filtering techniques
- AI summarization capabilities
- Sentiment-based content analysis
- Geographic and topical filtering
- Request/response middleware
- Complex parameter combinations

## 📋 Example Features

### Article Search

```javascript
// Basic search
const articles = await perigon.searchArticles({
  q: "artificial intelligence",
  size: 10,
  sortBy: "date",
});

// Advanced filtering
const filtered = await perigon.searchArticles({
  q: "technology OR startup",
  source: ["reuters.com", "bloomberg.com"],
  category: ["Tech", "Business"],
  from: new Date("2024-01-01"),
  excludeLabel: ["Opinion"],
  size: 5,
});
```

### Story Discovery

```javascript
// Find trending stories
const stories = await perigon.searchStories({
  q: "climate change",
  minUniqueSources: 5,
  sortBy: "updatedAt",
  size: 3,
});
```

### AI Summarization

```javascript
// Generate summaries
const summary = await perigon.searchSummarizer({
  summaryBody: {
    summaryType: "keyPoints",
    language: "en",
  },
  q: "cryptocurrency",
  size: 10,
});
```

### Company Research

```javascript
// Find companies
const companies = await perigon.searchCompanies({
  name: "Microsoft",
  size: 5,
});
```

## 🔧 Configuration Options

### API Client Setup

```javascript
import { V1Api, Configuration } from "@goperigon/perigon-ts";

const configuration = new Configuration({
  apiKey: () => Promise.resolve(process.env.PERIGON_API_KEY),
  basePath: "https://api.goperigon.com", // Optional: custom endpoint
  middleware: [
    /* custom middleware */
  ], // Optional: request/response middleware
});

const perigon = new V1Api(configuration);
```

### Common Parameters

| Parameter       | Description                         | Example                                        |
| --------------- | ----------------------------------- | ---------------------------------------------- |
| `q`             | Search query with Boolean operators | `"AI AND (machine learning OR deep learning)"` |
| `size`          | Number of results (max 100)         | `10`                                           |
| `sortBy`        | Sort order                          | `'date'`, `'relevance'`, `'addDate'`           |
| `from` / `to`   | Date range filtering                | `new Date('2024-01-01')`                       |
| `source`        | Filter by news sources              | `['nytimes.com', 'reuters.com']`               |
| `category`      | Content categories                  | `['Tech', 'Business', 'Politics']`             |
| `sourceCountry` | Geographic filtering                | `['us', 'gb', 'ca']`                           |

### Search Operators

- **AND**: `crypto AND bitcoin`
- **OR**: `tesla OR "electric vehicles"`
- **NOT**: `apple NOT fruit`
- **Exact phrases**: `"artificial intelligence"`
- **Wildcards**: `technolog*` (matches technology, technological, etc.)

## 🎯 Use Cases

### 1. News Monitoring

```javascript
// Monitor mentions of your company
const mentions = await perigon.searchArticles({
  companyName: "YourCompany",
  sortBy: "date",
  size: 20,
});
```

### 2. Market Research

```javascript
// Research industry trends
const trends = await perigon.searchStories({
  q: 'fintech OR "financial technology"',
  category: ["Business", "Tech"],
  minUniqueSources: 3,
});
```

### 3. Content Analysis

```javascript
// Analyze sentiment around topics
const sentiment = await perigon.searchArticles({
  q: "renewable energy",
  positiveSentimentFrom: 0.6,
  size: 10,
});
```

### 4. Competitive Intelligence

```javascript
// Track competitor coverage
const competitor = await perigon.searchArticles({
  companyName: "CompetitorName",
  excludeLabel: ["Press Release"],
  from: lastWeek,
});
```

## ⚠️ Error Handling

The SDK provides specific error types for different scenarios:

```javascript
try {
  const result = await perigon.searchArticles({ q: "test" });
} catch (error) {
  if (error.name === "ResponseError") {
    // HTTP errors (401, 403, 429, etc.)
    console.log(`HTTP ${error.response.status}: ${error.response.statusText}`);
  } else if (error.name === "RequiredError") {
    // Missing required parameters
    console.log(`Missing parameter: ${error.field}`);
  } else if (error.name === "FetchError") {
    // Network/connection errors
    console.log(`Network error: ${error.message}`);
  }
}
```

## 🚨 Common Issues

### Authentication Errors (401)

- Verify your API key is correct
- Check if the key is properly set in environment variables
- Ensure your API key hasn't expired

### Rate Limiting (429)

- Reduce request frequency
- Implement exponential backoff
- Check your subscription plan limits

### Invalid Parameters (400)

- Verify parameter names and values
- Check date formats (ISO 8601)
- Ensure array parameters are properly formatted

## 📚 Additional Resources

- **API Documentation**: [docs.perigon.io](https://docs.perigon.io)
- **SDK Repository**: [github.com/goperigon/perigon-ts](https://github.com/goperigon/perigon-ts)
- **Support**: Contact support through the Perigon dashboard
- **Community**: Join discussions on GitHub Issues

## 🛠️ Development

### Running Examples

```bash
# Basic example
npm run basic

# Advanced example
node advanced-usage.js

# Setup dependencies
npm run setup

# Get help
npm run help
```

### Creating Custom Examples

1. Copy an existing example file
2. Modify the search parameters and logic
3. Add your custom functionality
4. Test with your API key

### Middleware Examples

```javascript
// Request logging middleware
const loggingMiddleware = {
  pre: async (context) => {
    console.log(`Request: ${context.url}`);
  },
  post: async (context) => {
    console.log(`Response: ${context.response.status}`);
  },
};

// Error recovery middleware
const retryMiddleware = {
  onError: async (context) => {
    if (context.error.name === "FetchError") {
      // Return fallback response
      return new Response(JSON.stringify({ articles: [] }));
    }
  },
};
```

---

**Happy coding with Perigon! 🎉**

For questions or issues, please check the [documentation](https://docs.perigon.io) or create an issue in the [GitHub repository](https://github.com/goperigon/perigon-ts).
