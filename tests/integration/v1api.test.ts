import { V1Api, Configuration } from "../../src";
import { ArticleSearchParams, SummaryBody } from "../../src/models";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// This should be set in your .env file or CI environment
const API_KEY = process.env.PERIGON_API_KEY;

// Skip tests if API key is not available
const describeWithApiKey = API_KEY ? describe : describe.skip;

describeWithApiKey("Perigon API Integration Tests", () => {
  let api: V1Api;

  beforeAll(() => {
    // Create configuration with API key
    const configuration = new Configuration({
      apiKey: () => Promise.resolve(API_KEY!),
    });

    api = new V1Api(configuration);
  });

  describe("Article Search", () => {
    it("should retrieve articles based on query", async () => {
      // Execute the API call with real parameters
      const result = await api.searchArticles({
        q: "technology",
        from: new Date("2025-11-01"),
        size: 5,
      });

      // Verify response structure
      expect(result).toHaveProperty("articles");
      expect(result.numResults).toBeGreaterThan(0);

      // Check article structure
      const firstArticle = result.articles[0];
      expect(firstArticle).toHaveProperty("articleId");
      expect(firstArticle).toHaveProperty("title");
      expect(firstArticle).toHaveProperty("source");
      expect(firstArticle).toHaveProperty("pubDate");
    }, 15000); // Increase timeout for API call

    it("should filter articles by date range", async () => {
      // Create date objects for last week
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);

      // Execute the API call with date parameters
      const result = await api.searchArticles({
        q: "business",
        from: fromDate,
        to: toDate,
        size: 5,
      });

      // Verify response
      expect(result.articles.length).toBeGreaterThan(0);

      // Verify dates are within range
      result.articles.forEach((article) => {
        if (article.pubDate) {
          const pubDate = new Date(article.pubDate);
          expect(pubDate.getTime()).toBeGreaterThanOrEqual(fromDate.getTime());
          expect(pubDate.getTime()).toBeLessThanOrEqual(toDate.getTime());
        }
      });
    }, 15000);

    it("should filter articles by source", async () => {
      // Major news source that's likely to have content
      const testSource = "nytimes.com";

      const result = await api.searchArticles({
        source: [testSource],
        size: 5,
      });

      // Verify articles are from the requested source
      expect(result.articles.length).toBeGreaterThan(0);
      result.articles.forEach((article) => {
        expect(article.source?.domain).toBe(testSource);
      });
    }, 15000);
  });

  describe("Company Search", () => {
    it("should retrieve company information", async () => {
      const result = await api.searchCompanies({
        name: "Apple",
        size: 5,
      });

      // Verify response structure
      expect(result).toHaveProperty("results");
      expect(result.results.length).toBeGreaterThan(0);

      // Check company structure
      const company = result.results[0];
      expect(company).toHaveProperty("id");
      expect(company).toHaveProperty("name");
    }, 15000);
  });

  describe("Journalist API", () => {
    it("should retrieve journalist information by ID", async () => {
      // First, search for journalists to get an ID
      const searchResult = await api.searchJournalists({
        name: "Kevin",
        size: 1,
      });

      // Skip if no journalists found
      if (searchResult.results.length === 0) {
        console.warn("No journalists found to test getJournalistById");
        return;
      }

      // Get the ID from the first journalist
      const journalistId = searchResult.results[0]["id"]!;

      // Now retrieve the specific journalist
      const journalist = await api.getJournalistById({ id: journalistId });

      // Verify journalist data
      expect(journalist).toHaveProperty("id", journalistId);
      expect(journalist).toHaveProperty("name");
    }, 15000);
  });

  describe("Stories API", () => {
    it("should retrieve news stories", async () => {
      const result = await api.searchStories({
        q: "climate change",
        size: 5,
      });

      // Verify response structure
      expect(result).toHaveProperty("results");
      expect(result.results.length).toBeGreaterThan(0);

      // Check story structure
      const story = result.results[0];
      expect(story).toHaveProperty("id");
    }, 15000);
  });

  describe("Vector Search", () => {
    it("should perform semantic search for articles", async () => {
      const articleSearchParams: ArticleSearchParams = {
        prompt: "Latest advancements in artificial intelligence",
        size: 5,
      };

      const result = await api.vectorSearchArticles({ articleSearchParams });

      // Verify response structure
      expect(result).toHaveProperty("results");
      expect(result.results.length).toBeGreaterThan(0);
    }, 15000);
  });

  describe("Summarizer API", () => {
    it("should generate a summary for search results", async () => {
      const summaryBody: SummaryBody = {}; // no args required

      const result = await api.searchSummarizer({
        summaryBody,
        q: "renewable energy",
        size: 10,
      });

      // Verify summary
      expect(result).toHaveProperty("summary");
      expect(result.summary.length).toBeGreaterThan(0);
    }, 30000); // Longer timeout for summary generation
  });

  describe("Topics API", () => {
    it("should retrieve available topics", async () => {
      const result = await api.searchTopics({
        size: 10,
      });

      // Verify response structure
      expect(result).toHaveProperty("data");
      expect(result.data.length).toBeGreaterThan(0);
    }, 15000);
  });
});
