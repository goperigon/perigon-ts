/**
 * Advanced Perigon SDK Usage Example
 *
 * This example demonstrates advanced features of the Perigon TypeScript SDK:
 * 1. Article summarization using AI
 * 2. Company and journalist search
 * 3. Sentiment analysis filtering
 * 4. Middleware for logging and error handling
 * 5. Vector/semantic search capabilities
 * 6. Vector-based Wikipedia search for semantic exploration
 *
 * Before running: Set PERIGON_API_KEY environment variable
 * Run: node examples/advanced-usage.js
 */

import { V1Api, Configuration } from "@goperigon/perigon-ts";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create logging middleware for requests
const createLoggingMiddleware = () => ({
  pre: async (context) => {
    console.log(
      `🌐 Making request to: ${context.init.method || "GET"} ${context.url}`,
    );
    return undefined;
  },
  post: async (context) => {
    console.log(
      `✅ Request completed: ${context.response.status} ${context.response.statusText}`,
    );
    return undefined;
  },
  onError: async (context) => {
    console.error(`❌ Request failed: ${context.error.message}`);
    return undefined; // Let the error bubble up
  },
});

async function main() {
  // Initialize API client with middleware
  const configuration = new Configuration({
    apiKey: () => Promise.resolve(process.env.PERIGON_API_KEY || ""),
    middleware: [createLoggingMiddleware()],
  });

  const perigon = new V1Api(configuration);

  console.log("🚀 Advanced Perigon SDK Example\n");

  try {
    // Example 1: AI Summarization
    console.log("🤖 Example 1: AI-Powered Article Summarization");
    console.log("Generating summary for articles about cryptocurrency...\n");

    const summaryResult = await perigon.searchSummarizer({
      summaryBody: {
        prompt: "Summarize these articles as a short list of key points.",
        maxArticleCount: 10,
        returnedArticleCount: 10,
      },
      q: "cryptocurrency bitcoin",
      language: ["en"],
      sortBy: "date",
    });

    console.log("📝 Generated Summary:");
    console.log(`   ${summaryResult.summary || "No summary available"}\n`);

    // Example 2: Company Research
    console.log("🏢 Example 2: Company Search and Analysis");
    console.log("Searching for technology companies...\n");

    const companies = await perigon.searchCompanies({
      name: "Microsoft",
      size: 3,
    });

    console.log(`Found ${companies.numResults} companies:`);
    companies.results.forEach((company, index) => {
      console.log(`  ${index + 1}. ${company.name}`);
      console.log(`     Domains: ${company.domains?.join(", ") || "N/A"}`);
      console.log(`     Symbols: ${company.symbols?.join(", ") || "N/A"}`);
      console.log(`     Industry: ${company.industry || "N/A"}`);
      console.log(`     Country: ${company.country || "N/A"}\n`);
    });

    // Example 3: Sentiment Analysis
    console.log("😊 Example 3: Sentiment-based Article Filtering");
    console.log("Finding positive articles about renewable energy...\n");

    const positiveArticles = await perigon.searchArticles({
      q: "renewable energy solar wind",
      positiveSentimentFrom: 0.7, // Only articles with positive sentiment >= 0.7
      size: 3,
      sortBy: "date",
    });

    console.log(`Found ${positiveArticles.numResults} positive articles:`);
    positiveArticles.articles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title}`);
      console.log(`     Source: ${article.source?.domain ?? "Unknown"}`);
      console.log(
        `     Sentiment: Positive ${article.sentiment?.positive || "N/A"}`,
      );
      console.log(
        `     Published: ${
          article.pubDate
            ? new Date(article.pubDate).toLocaleDateString()
            : "Unknown"
        }\n`,
      );
    });

    // Example 4: Geographic Filtering
    console.log("🌍 Example 4: Geographic News Filtering");
    console.log("Finding news from US sources about climate change...\n");

    const geoArticles = await perigon.searchArticles({
      q: "climate change",
      sourceCountry: ["us"],
      category: ["Environment"],
      size: 3,
      sortBy: "date",
    });

    console.log(`Found ${geoArticles.numResults} US-based articles:`);
    geoArticles.articles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title}`);
      console.log(`     Source: ${article.source?.domain ?? "Unknown"}`);
      console.log(
        `     Country: ${article.source?.location?.country ?? "N/A"}`,
      );
      console.log(
        `     Categories: ${
          article.categories
            ?.map((it) => it.name)
            ?.filter(Boolean)
            ?.join(", ") || "N/A"
        }\n`,
      );
    });

    // Example 5: Topic-based Story Discovery
    console.log("📚 Example 5: Topic-based Story Discovery");
    console.log(
      "Finding stories about artificial intelligence with high engagement...\n",
    );

    const aiStories = await perigon.searchStories({
      q: "artificial intelligence",
      topic: ["Tech", "Business"],
      minUniqueSources: 2, // Stories covered by at least 5 different sources
      size: 2,
      sortBy: "count", // Sort by article count
    });

    console.log(`Found ${aiStories.numResults} high-engagement stories:`);
    aiStories.results?.forEach((story, index) => {
      console.log(`  ${index + 1}. ${story.name}`);
      console.log(`     Summary: ${story.summary || "No summary available"}`);
      console.log(
        `     Articles: ${story.totalCount ?? 0} from ${story.uniqueSources?.length ?? 0} sources`,
      );
      console.log(
        `     Topics: ${
          story.topics
            ?.map((it) => it.name)
            ?.filter(Boolean)
            ?.join(", ") || "N/A"
        }`,
      );
      console.log(
        `     Key Points: ${
          story.keyPoints
            ?.slice(0, 2)
            ?.map((keyPoint) => keyPoint.point)
            ?.filter(Boolean)
            ?.join("; ") || "N/A"
        }\n`,
      );
    });

    // Example 6: Multi-parameter Advanced Search
    console.log("🔍 Example 6: Complex Multi-parameter Search");
    console.log(
      "Advanced search: Tech articles from last week, excluding opinion pieces...\n",
    );

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 7);

    const complexSearch = await perigon.searchArticles({
      q: "technology OR startup OR innovation",
      category: ["Tech", "Business"],
      excludeLabel: ["Opinion", "Press Release"],
      from: fromDate,
      sourceGroup: ["top100"], // High-quality sources only
      showReprints: false, // Exclude syndicated content
      size: 3,
      sortBy: "relevance",
    });

    console.log(
      `Found ${complexSearch.numResults} high-quality tech articles:`,
    );
    complexSearch.articles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title}`);
      console.log(`     Source: ${article.source?.domain ?? "Unknown"}`);
      console.log(
        `     Categories: ${
          article.categories
            ?.map((it) => it.name)
            ?.filter(Boolean)
            ?.join(", ") || "N/A"
        }`,
      );
      console.log(
        `     Labels: ${
          article.labels
            ?.map((it) => it.name)
            ?.filter(Boolean)
            ?.join(", ") || "None"
        }`,
      );
      console.log(
        `     Published: ${
          article.pubDate
            ? new Date(article.pubDate).toLocaleDateString()
            : "Unknown"
        }\n`,
      );
    });

    // Example 7: Vector Wikipedia Search
    console.log("🧠 Example 7: Vector-based Wikipedia Search");
    console.log(
      "Using semantic search to find Wikipedia pages related to artificial intelligence...\n",
    );

    const vectorWikipediaResult = await perigon.vectorSearchWikipedia({
      wikipediaSearchParams: {
        prompt: "artificial intelligence and neural networks in computing",
        size: 3,
        pageviewsFrom: 100, // Only pages with significant viewership
      },
    });

    console.log(
      `Found ${vectorWikipediaResult.results.length} semantically related Wikipedia pages:`,
    );
    vectorWikipediaResult.results.forEach((result, index) => {
      const page = result.data;
      console.log(`  ${index + 1}. ${page?.wikiTitle || "Untitled"}`);
      console.log(`     Relevance Score: ${(result.score * 100).toFixed(1)}%`);
      console.log(`     URL: ${page?.url || "N/A"}`);
      console.log(
        `     Summary: ${
          page?.summary
            ? page.summary.substring(0, 200) + "..."
            : "No summary available"
        }`,
      );
      console.log(`     Views per day: ${page?.pageviews || "N/A"}`);
      console.log(`     Wikidata ID: ${page?.wikidataId || "N/A"}\n`);
    });

    console.log("🎉 Advanced examples completed successfully!");
    console.log("\n💡 Pro Tips:");
    console.log("   - Combine multiple filters for more precise results");
    console.log("   - Use sentiment analysis for brand monitoring");
    console.log("   - Leverage story clustering for trend analysis");
    console.log("   - Geographic filtering helps with local news monitoring");
    console.log("   - Vector search provides semantic Wikipedia exploration");
    console.log("   - AI summarization saves time on content analysis");
  } catch (error) {
    console.error("\n❌ Error in advanced example:", error);

    // Enhanced error handling
    if (error.name === "ResponseError") {
      const status = error.response.status;
      if (status === 401) {
        console.error("🔐 Authentication failed - check your API key");
      } else if (status === 429) {
        console.error("⏱️ Rate limit exceeded - please wait before retrying");
      } else if (status === 403) {
        console.error("🚫 Access forbidden - check your subscription plan");
      } else {
        console.error(`🌐 HTTP ${status}: ${error.response.statusText}`);
      }
    } else if (error.name === "RequiredError") {
      console.error(`📋 Missing required parameter: ${error.field}`);
    } else {
      console.error(
        `❓ ${error.name || "Unknown error"}: ${error.message || error}`,
      );
    }

    console.log("\n🛠️ Advanced Troubleshooting:");
    console.log("   - Check if your API plan supports advanced features");
    console.log("   - Some features may require higher-tier subscriptions");
    console.log("   - Verify parameter combinations are valid");
    console.log(
      "   - Consider reducing request frequency if hitting rate limits",
    );
  }
}

// Handle uncaught errors gracefully
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Run the advanced example
main().catch(console.error);
