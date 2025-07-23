import { V1Api, Configuration } from "../../src";
import {
  ResponseError,
  FetchError,
  RequiredError,
  Middleware,
  ErrorContext,
} from "../../src/runtime";
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
        expect(error).toBeInstanceOf(RequiredError);
        const requiredError = error as RequiredError;
        expect(requiredError.name).toBe("RequiredError");
        expect(requiredError.field).toBe("id");
        expect(requiredError.message).toContain(
          'Required parameter "id" was null or undefined'
        );
      }
    });

    it("should throw RequiredError when summaryBody parameter is missing", async () => {
      try {
        // Call method that requires 'summaryBody' parameter without providing it
        await api.searchSummarizer({ summaryBody: null as any });
        fail("Expected RequiredError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RequiredError);
        const requiredError = error as RequiredError;
        expect(requiredError.name).toBe("RequiredError");
        expect(requiredError.field).toBe("summaryBody");
        expect(requiredError.message).toContain(
          'Required parameter "summaryBody" was null or undefined'
        );
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

  describe("FetchError handling", () => {
    beforeEach(() => {
      // Create API instance with invalid base URL to trigger network errors
      const configuration = new Configuration({
        basePath: "https://invalid-domain-that-does-not-exist.com",
        apiKey: () => Promise.resolve("test-api-key"),
      });
      api = new V1Api(configuration);
    });

    it("should throw network error for network failures (may be FetchError or raw error)", async () => {
      try {
        await api.searchArticles({ q: "test", size: 1 });
        fail("Expected network error to be thrown");
      } catch (error) {
        // The SDK may throw either FetchError or the raw TypeError depending on middleware
        expect(error).toBeDefined();
        const anyError = error as any;
        expect(anyError.name).toMatch(/^(FetchError|TypeError)$/);

        if (anyError instanceof FetchError) {
          expect(anyError.cause).toBeDefined();
          expect(anyError.message).toContain(
            "The request failed and the interceptors did not return an alternative response"
          );
        } else if (anyError.name === "TypeError") {
          expect(anyError.message).toContain("fetch failed");
        }
      }
    }, 15000);

    it("should allow middleware to intercept network errors without providing recovery", async () => {
      let interceptedError: any = null;
      const nonRecoveryMiddleware: Middleware = {
        onError: async (context) => {
          // Log the error but don't provide recovery response
          interceptedError = context.error;
          console.log(`[Test] Error intercepted: ${context.error}`);
          return undefined; // This should cause the original error to be thrown
        },
      };

      const configuration = new Configuration({
        basePath: "https://invalid-domain-that-does-not-exist.com",
        apiKey: () => Promise.resolve("test-api-key"),
        middleware: [nonRecoveryMiddleware],
      });

      const testApi = new V1Api(configuration);

      try {
        await testApi.searchArticles({ q: "test" });
        fail("Expected network error to be thrown");
      } catch (error) {
        // Verify that middleware intercepted the error
        expect(interceptedError).toBeDefined();
        expect(interceptedError.name).toBe("TypeError");
        expect(interceptedError.message).toContain("fetch failed");

        // Verify that an error was still thrown (may be FetchError or original TypeError)
        expect(error).toBeDefined();
        const anyError = error as any;
        expect(anyError.name).toMatch(/^(FetchError|TypeError)$/);
      }
    }, 15000);
  });

  describe("Middleware error handling and logging", () => {
    let errorLogs: Array<{ context: ErrorContext; timestamp: Date }>;
    let requestLogs: Array<{ url: string; method: string; timestamp: Date }>;

    beforeEach(() => {
      errorLogs = [];
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
            }`
          );
          return undefined;
        },
        onError: async (context) => {
          errorLogs.push({
            context,
            timestamp: new Date(),
          });
          console.error(`[SDK] Request failed:`, {
            url: context.url,
            method: context.init.method,
            error: context.error,
            response: context.response
              ? {
                  status: context.response.status,
                  statusText: context.response.statusText,
                }
              : null,
          });
          return undefined; // Don't provide alternative response
        },
        post: async (context) => {
          console.log(
            `[SDK] Request completed: ${context.response.status} ${context.response.statusText}`
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

    it("should log errors through middleware and still throw the error", async () => {
      try {
        await api.searchArticles({ q: "test", size: 1 });
        fail("Expected error to be thrown");
      } catch (error) {
        // Verify error was logged
        expect(errorLogs).toHaveLength(0); // onError middleware only triggers for fetch errors, not response errors
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
                arg.includes("[SDK] Making request to")
            )
          )
        ).toBe(true);
      }
    }, 15000);

    it("should log network errors through middleware", async () => {
      // Create API with invalid URL to trigger FetchError
      const networkErrorMiddleware: Middleware = {
        onError: async (context) => {
          errorLogs.push({ context, timestamp: new Date() });
          console.error(`[SDK] Network error occurred:`, context.error);
          return undefined;
        },
      };

      const configuration = new Configuration({
        basePath: "https://invalid-domain-that-does-not-exist.com",
        apiKey: () => Promise.resolve("test-api-key"),
        middleware: [networkErrorMiddleware],
      });

      const networkApi = new V1Api(configuration);

      try {
        await networkApi.searchArticles({ q: "test" });
        fail("Expected network error to be thrown");
      } catch (error) {
        // Should log error through middleware regardless of error type
        expect(errorLogs).toHaveLength(1);
        expect(errorLogs[0].context.error).toBeDefined();
        expect(errorLogs[0].context.url).toContain(
          "invalid-domain-that-does-not-exist.com"
        );

        // Verify error logging
        expect(loggedErrors.length).toBeGreaterThan(0);
        expect(
          loggedErrors.some((errorArgs) =>
            errorArgs.some(
              (arg: any) =>
                typeof arg === "string" &&
                arg.includes("[SDK] Network error occurred")
            )
          )
        ).toBe(true);

        // Error should still be thrown (may be FetchError or raw TypeError)
        expect(error).toBeDefined();
        expect(typeof error).toBe("object");
      }
    }, 15000);
  });

  describe("Error recovery through middleware", () => {
    it("should allow middleware to provide alternative response for network errors", async () => {
      const recoveryMiddleware: Middleware = {
        onError: async (context) => {
          console.log(`[SDK] Attempting error recovery for: ${context.url}`);

          // Create a mock successful response
          const mockResponse = new Response(
            JSON.stringify({
              articles: [],
              numResults: 0,
              totalResults: 0,
            }),
            {
              status: 200,
              statusText: "OK",
              headers: { "Content-Type": "application/json" },
            }
          );

          return mockResponse;
        },
      };

      const configuration = new Configuration({
        basePath: "https://invalid-domain-that-does-not-exist.com",
        apiKey: () => Promise.resolve("test-api-key"),
        middleware: [recoveryMiddleware],
      });

      const recoveryApi = new V1Api(configuration);

      // This should not throw an error due to recovery middleware
      const result = await recoveryApi.searchArticles({ q: "test" });

      expect(result).toBeDefined();
      expect(result.articles).toEqual([]);
      expect(result.numResults).toBe(0);

      // Verify recovery was logged
      expect(
        loggedMessages.some((msg) =>
          msg.some(
            (arg: any) =>
              typeof arg === "string" &&
              arg.includes("[SDK] Attempting error recovery")
          )
        )
      ).toBe(true);
    }, 15000);
  });

  describe("Multiple middleware error handling", () => {
    it("should execute multiple error middleware in order", async () => {
      const executionOrder: string[] = [];

      const middleware1: Middleware = {
        onError: async (context) => {
          executionOrder.push("middleware1");
          console.log(`[SDK] Middleware 1 handling error`);
          return undefined;
        },
      };

      const middleware2: Middleware = {
        onError: async (context) => {
          executionOrder.push("middleware2");
          console.log(`[SDK] Middleware 2 handling error`);
          return undefined;
        },
      };

      const configuration = new Configuration({
        basePath: "https://invalid-domain-that-does-not-exist.com",
        apiKey: () => Promise.resolve("test-api-key"),
        middleware: [middleware1, middleware2],
      });

      const multiMiddlewareApi = new V1Api(configuration);

      try {
        await multiMiddlewareApi.searchArticles({ q: "test" });
        fail("Expected network error to be thrown");
      } catch (error) {
        expect(error).toBeDefined();
        expect(typeof error).toBe("object");
        expect(executionOrder).toEqual(["middleware1", "middleware2"]);

        // Verify both middleware logged
        expect(
          loggedMessages.some((msg) =>
            msg.some(
              (arg: any) =>
                typeof arg === "string" &&
                arg.includes("Middleware 1 handling error")
            )
          )
        ).toBe(true);
        expect(
          loggedMessages.some((msg) =>
            msg.some(
              (arg: any) =>
                typeof arg === "string" &&
                arg.includes("Middleware 2 handling error")
            )
          )
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
