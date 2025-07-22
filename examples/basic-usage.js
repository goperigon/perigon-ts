/**
 * Basic Perigon SDK Usage Example
 *
 * This example demonstrates how to use the Perigon TypeScript SDK to:
 * 1. Search for news articles with various filters
 * 2. Search for news stories (clustered articles)
 * 3. Handle errors properly
 *
 * Before running this example:
 * 1. Install the SDK: npm install @goperigon/perigon-ts
 * 2. Get an API key from https://www.goperigon.com/
 * 3. Set your API key as an environment variable: PERIGON_API_KEY=your_api_key_here
 * 4. Run: node examples/basic-usage.js
 */

import { V1Api, Configuration } from "@goperigon/perigon-ts";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

async function main() {
  // Initialize the Perigon API client
  const configuration = new Configuration({
    apiKey: () => Promise.resolve(process.env.PERIGON_API_KEY || ""),
  });

  const perigon = new V1Api(configuration);

  console.log("🔍 Perigon SDK Example - Fetching Articles and Stories\n");

  try {
    // Example 1: Basic article search
    console.log("📰 Example 1: Basic Article Search");
    console.log(
      'Searching for recent articles about "artificial intelligence"...\n',
    );

    const articlesResult = await perigon.searchArticles({
      q: "artificial intelligence",
      size: 5,
      sortBy: "date", // Get the newest articles first
    });

    console.log(
      `Found ${articlesResult.numResults} articles total, showing first ${articlesResult.articles.length}:`,
    );
    articlesResult.articles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title}`);
      console.log(
        `     Source: ${article.source?.name || "Unknown"} (${
          article.source?.domain || "N/A"
        })`,
      );
      console.log(
        `     Published: ${
          article.pubDate
            ? new Date(article.pubDate).toLocaleDateString()
            : "Unknown"
        }`,
      );
      console.log(`     URL: ${article.url}\n`);
    });

    // Example 2: Filter articles by source and date range
    console.log("📰 Example 2: Filtered Article Search");
    console.log(
      "Searching for business articles from major sources in the last 3 days...\n",
    );

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 3); // Last 3 days

    const filteredArticles = await perigon.searchArticles({
      q: "business OR technology",
      source: ["reuters.com", "bloomberg.com", "wsj.com", "ft.com"],
      from: fromDate,
      size: 3,
      sortBy: "date",
    });

    console.log(
      `Found ${filteredArticles.numResults} filtered articles, showing first ${filteredArticles.articles.length}:`,
    );
    filteredArticles.articles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title}`);
      console.log(`     Source: ${article.source?.name || "Unknown"}`);
      console.log(
        `     Published: ${
          article.pubDate
            ? new Date(article.pubDate).toLocaleDateString()
            : "Unknown"
        }\n`,
      );
    });

    // Example 3: Search for stories (clustered articles)
    console.log("📚 Example 3: Story Search");
    console.log('Searching for recent stories about "climate change"...\n');

    const storiesResult = await perigon.searchStories({
      q: "climate change",
      size: 3,
      sortBy: "updatedAt", // Get stories with most recent updates
    });

    console.log("Results: ", storiesResult);

    if (storiesResult.results.length === 0) {
      console.log("No stories found");
      return;
    }

    console.log(
      `Found ${storiesResult.numResults} stories total, showing first ${storiesResult.results.length}:`,
    );
    storiesResult.results.forEach((story, index) => {
      console.log(`  ${index + 1}. ${story.name}`);
      console.log(`     Summary: ${story.summary || "No summary available"}`);
      console.log(`     Article Count: ${story.articleCount} articles`);
      console.log(`     Unique Sources: ${story.uniqueSourceCount} sources`);
      console.log(
        `     Created: ${
          story.createdAt
            ? new Date(story.createdAt).toLocaleDateString()
            : "Unknown"
        }`,
      );
      console.log(
        `     Updated: ${
          story.updatedAt
            ? new Date(story.updatedAt).toLocaleDateString()
            : "Unknown"
        }\n`,
      );
    });

    // Example 4: Search for articles by company
    console.log("🏢 Example 4: Company-focused Article Search");
    console.log("Searching for articles mentioning Apple Inc...\n");

    const companyArticles = await perigon.searchArticles({
      companyName: "Apple",
      size: 3,
      sortBy: "date",
    });

    console.log(
      `Found ${companyArticles.numResults} articles mentioning Apple, showing first ${companyArticles.articles.length}:`,
    );
    companyArticles.articles.forEach((article, index) => {
      console.log(`  ${index + 1}. ${article.title}`);
      console.log(`     Source: ${article.source?.name || "Unknown"}`);
      console.log(
        `     Published: ${
          article.pubDate
            ? new Date(article.pubDate).toLocaleDateString()
            : "Unknown"
        }\n`,
      );
    });

    // Example 5: Search for non-existing journalist

    const journalists = await perigon.searchJournalists({
      id: "NONE",
      size: 1,
    });

    console.log("No Journalists found: ", journalists);

    console.log("✅ Example completed successfully!");
    console.log("\n💡 Next steps:");
    console.log("   - Explore more search parameters in the documentation");
    console.log("   - Try different sorting options (relevance, date, etc.)");
    console.log("   - Use filters like category, topic, or sentiment");
    console.log(
      "   - Check out the summarizer endpoint for AI-generated summaries",
    );
  } catch (error) {
    console.error("❌ Error occurred:", error);

    if (error.name === "ResponseError") {
      console.error(
        `HTTP ${error.response.status}: ${error.response.statusText}`,
      );
      console.error(
        "This might indicate an authentication issue or API limit reached.",
      );
    } else if (error.name === "RequiredError") {
      console.error("Missing required parameter:", error.field);
    } else if (error.name === "FetchError") {
      console.error("Network error occurred:", error.message);
    } else {
      console.error("Unknown error:", error.message || error);
    }

    console.log("\n🔧 Troubleshooting:");
    console.log(
      "   1. Make sure you have set PERIGON_API_KEY environment variable",
    );
    console.log("   2. Verify your API key is valid and has sufficient quota");
    console.log("   3. Check your internet connection");
    console.log("   4. Visit https://docs.perigon.io for API documentation");
  }
}

// Run the example
main().catch(console.error);
