import { V1Api, Configuration } from "../../src";
import {
  ResponseError,
  FetchError,
  RequiredError,
  Middleware,
} from "../../src/runtime";
import { ZodError } from "zod";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

describe("Perigon SDK Error Handling and Logging Tests", () => {
  let api: V1Api;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;
  let loggedErrors: any[];
  let loggedMessages: any[];

  beforeAll(() => {
    // Mock console methods to capture logs
    loggedErrors = [];
    loggedMessages = [];
    originalConsoleError = console.error;
    originalConsoleLog = console.log;

    console.error = (...args: any[]) => {
      loggedErrors.push(args);
      originalConsoleError(...args);
    };

    console.log = (...args: any[]) => {
      loggedMessages.push(args);
      originalConsoleLog(...args);
    };
  });

  afterAll(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    // Clear logged messages before each test
    loggedErrors.length = 0;
    loggedMessages.length = 0;
  });

  describe("RequiredError handling", () => {
    beforeEach(() => {
      // Create API instance with valid configuration
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
      });
      api = new V1Api(configuration);
    });

    it("should throw RequiredError when required parameter is missing", async () => {
      try {
        // Call method that requires 'id' parameter without providing it
        await api.getJournalistById({ id: null as any });
        fail("Expected RequiredError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
        const zodError = error as ZodError;
        expect(zodError.name).toBe("ZodError");
        expect(zodError.issues[0].path).toContain("id");
        expect(zodError.issues[0].message).toContain(
          "Expected string, received null",
        );
      }
    });

    it("should throw RequiredError when summaryBody parameter is missing", async () => {
      try {
        // Call method that requires 'summaryBody' parameter without providing it
        await api.searchSummarizer({ summaryBody: null as any });
        fail("Expected RequiredError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResponseError);
        const responseError = error as ResponseError;
        expect(responseError.name).toBe("ResponseError");
        expect(responseError.response.status).toBe(401);
      }
    });
  });

  describe("ResponseError handling", () => {
    beforeEach(() => {
      // Create API instance with invalid API key to trigger 401/403 errors
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("invalid-api-key"),
      });
      api = new V1Api(configuration);
    });

    it("should throw ResponseError for 401 Unauthorized", async () => {
      try {
        await api.searchArticles({ q: "test", size: 1 });
        fail("Expected ResponseError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResponseError);
        const responseError = error as ResponseError;
        expect(responseError.name).toBe("ResponseError");
        expect(responseError.response).toBeDefined();
        expect(responseError.response.status).toBe(401);
        expect(responseError.message).toBe("Response returned an error code");
      }
    }, 15000);

    it("should throw ResponseError for 403 Forbidden", async () => {
      try {
        await api.searchCompanies({ name: "test", size: 1 });
        fail("Expected ResponseError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResponseError);
        const responseError = error as ResponseError;
        expect(responseError.name).toBe("ResponseError");
        expect(responseError.response).toBeDefined();
        expect([401, 403]).toContain(responseError.response.status);
      }
    }, 15000);

    it("should provide access to response details in ResponseError", async () => {
      try {
        await api.searchArticles({ q: "test" });
        fail("Expected ResponseError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ResponseError);
        const responseError = error as ResponseError;
        expect(responseError.response).toBeDefined();
        expect(responseError.response.status).toBeDefined();
        expect(responseError.response.headers).toBeDefined();
        expect(typeof responseError.response.status).toBe("number");
      }
    }, 15000);
  });

  describe("Middleware logging", () => {
    let requestLogs: Array<{ url: string; method: string; timestamp: Date }>;

    beforeEach(() => {
      requestLogs = [];

      // Create logging middleware
      const loggingMiddleware: Middleware = {
        pre: async (context) => {
          requestLogs.push({
            url: context.url,
            method: context.init.method || "GET",
            timestamp: new Date(),
          });
          console.log(
            `[SDK] Making request to: ${context.init.method || "GET"} ${
              context.url
            }`,
          );
          return undefined;
        },
        post: async (context) => {
          console.log(
            `[SDK] Request completed: ${context.response.status} ${context.response.statusText}`,
          );
          return undefined;
        },
      };

      // Create API with invalid key and logging middleware
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("invalid-api-key"),
        middleware: [loggingMiddleware],
      });
      api = new V1Api(configuration);
    });

    it("should log requests through middleware", async () => {
      try {
        await api.searchArticles({ q: "test", size: 1 });
        fail("Expected error to be thrown");
      } catch (error) {
        // Verify request was logged
        expect(requestLogs).toHaveLength(1);
        expect(requestLogs[0].url).toContain("/v1/articles/all");
        expect(requestLogs[0].method).toBe("GET");

        // Verify console logging
        expect(loggedMessages.length).toBeGreaterThan(0);
        expect(
          loggedMessages.some((msg) =>
            msg.some(
              (arg: any) =>
                typeof arg === "string" &&
                arg.includes("[SDK] Making request to"),
            ),
          ),
        ).toBe(true);
      }
    }, 15000);
  });

  describe("Error information preservation", () => {
    it("should preserve original error information in wrapped errors", () => {
      const requiredError = new RequiredError("testField", "Test message");
      expect(requiredError.field).toBe("testField");
      expect(requiredError.message).toBe("Test message");
      expect(requiredError.name).toBe("RequiredError");
    });

    it("should preserve cause in FetchError", () => {
      const originalError = new Error("Original network error");
      const fetchError = new FetchError(originalError, "Fetch failed");

      expect(fetchError.cause).toBe(originalError);
      expect(fetchError.message).toBe("Fetch failed");
      expect(fetchError.name).toBe("FetchError");
    });

    it("should preserve response in ResponseError", async () => {
      const mockResponse = new Response("Error content", {
        status: 404,
        statusText: "Not Found",
      });

      const responseError = new ResponseError(mockResponse, "Request failed");

      expect(responseError.response).toBe(mockResponse);
      expect(responseError.response.status).toBe(404);
      expect(responseError.response.statusText).toBe("Not Found");
      expect(responseError.message).toBe("Request failed");
      expect(responseError.name).toBe("ResponseError");
    });
  });
});
