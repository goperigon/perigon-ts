import { V1Api, Configuration } from "../../src";
import {
  Middleware,
  UnauthorizedError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  HttpError,
} from "../../src/runtime";
import { ZodError } from "zod";
import * as dotenv from "dotenv";

dotenv.config();

describe("Perigon SDK Error Handling and Logging Tests", () => {
  let api: V1Api;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;
  let loggedErrors: any[];
  let loggedMessages: any[];

  beforeAll(() => {
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
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  beforeEach(() => {
    loggedErrors.length = 0;
    loggedMessages.length = 0;
  });

  const createMockFetch = (status: number) => {
    return async (url: string, init?: RequestInit): Promise<Response> => {
      return new Response(`Mock ${status} error`, {
        status,
        headers: status === 429 ? { "retry-after": "30" } : {},
      });
    };
  };

  describe("Error handling", () => {
    beforeEach(() => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
      });
      api = new V1Api(configuration);
    });

    it("should throw ZodError when required parameter is missing", async () => {
      try {
        await api.getJournalistById({ id: null as any });
        fail("Expected ZodError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError);
      }
    });
  });

  describe("HTTP Error handling", () => {
    it("should throw BadRequestError for 400 status", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
        fetchApi: createMockFetch(400),
      });
      api = new V1Api(configuration);

      try {
        await api.searchArticles({ q: "test" });
        fail("Expected BadRequestError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestError);
      }
    });

    it("should throw UnauthorizedError for 401 status", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
        fetchApi: createMockFetch(401),
      });
      api = new V1Api(configuration);

      try {
        await api.searchArticles({ q: "test" });
        fail("Expected UnauthorizedError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
      }
    });

    it("should throw ForbiddenError for 403 status", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
        fetchApi: createMockFetch(403),
      });
      api = new V1Api(configuration);

      try {
        await api.searchArticles({ q: "test" });
        fail("Expected ForbiddenError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
      }
    });

    it("should throw NotFoundError for 404 status", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
        fetchApi: createMockFetch(404),
      });
      api = new V1Api(configuration);

      try {
        await api.getJournalistById({ id: "non-existent" });
        fail("Expected NotFoundError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    });

    it("should throw RateLimitError for 429 status", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
        fetchApi: createMockFetch(429),
      });
      api = new V1Api(configuration);

      try {
        await api.searchArticles({ q: "test" });
        fail("Expected RateLimitError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
      }
    });

    it("should throw ServerError for 500 status", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
        fetchApi: createMockFetch(500),
      });
      api = new V1Api(configuration);

      try {
        await api.searchArticles({ q: "test" });
        fail("Expected ServerError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ServerError);
      }
    });

    it("should throw generic HttpError for unhandled status codes", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("test-api-key"),
        fetchApi: createMockFetch(418),
      });
      api = new V1Api(configuration);

      try {
        await api.searchArticles({ q: "test" });
        fail("Expected HttpError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpError);
        expect(error).not.toBeInstanceOf(BadRequestError);
      }
    });
  });

  describe("Real API Error handling", () => {
    it("should throw UnauthorizedError with invalid API key", async () => {
      const configuration = new Configuration({
        apiKey: () => Promise.resolve("invalid-api-key"),
      });
      api = new V1Api(configuration);

      try {
        await api.searchArticles({ q: "test", size: 1 });
        fail("Expected UnauthorizedError to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedError);
      }
    }, 15000);
  });

  describe("Middleware logging", () => {
    let requestLogs: Array<{ url: string; method: string; timestamp: Date }>;

    beforeEach(() => {
      requestLogs = [];

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
        expect(requestLogs).toHaveLength(1);
        expect(requestLogs[0].url).toContain("/v1/articles/all");
        expect(requestLogs[0].method).toBe("GET");

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
});
