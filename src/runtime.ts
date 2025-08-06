export const BASE_PATH = "https://api.perigon.io".replace(/\/+$/, "");

export interface ConfigurationParameters {
  fetchApi?: FetchAPI;
  middleware?: Middleware[];
  queryParamsStringify?: (params: HTTPQuery) => string;
  /** Access token (Bearer) */
  apiKey?:
    | string
    | Promise<string>
    | ((name?: string, scopes?: string[]) => string | Promise<string>);
  headers?: HTTPHeaders;
  credentials?: RequestCredentials;
}

export class Configuration {
  constructor(private configuration: ConfigurationParameters = {}) {}

  set config(configuration: Configuration) {
    this.configuration = configuration;
  }

  get basePath() {
    return BASE_PATH;
  }
  get fetchApi() {
    return this.configuration.fetchApi;
  }
  get middleware(): Middleware[] {
    return this.configuration.middleware || [];
  }
  get queryParamsStringify() {
    return this.configuration.queryParamsStringify || querystring;
  }

  /* ---------- bearer / oauth2 - */
  get accessToken() {
    const t = this.configuration.apiKey;
    return t ? (typeof t === "function" ? t : async () => t) : undefined;
  }

  get headers() {
    return this.configuration.headers;
  }
  get credentials() {
    return this.configuration.credentials;
  }
}

export const DefaultConfig = new Configuration();

export class FetchError extends Error {
  override name: "FetchError" = "FetchError";
  constructor(
    public cause: Error,
    msg?: string,
  ) {
    super(msg);
  }
}

export class HttpError extends Error {
  public readonly status: number;
  public readonly statusText: string;
  public readonly response: Response;
  public readonly body?: any;

  constructor(response: Response, body?: any) {
    const message = `HTTP ${response.status}: ${response.statusText}`;
    super(message);
    this.name = "HttpError";
    this.status = response.status;
    this.statusText = response.statusText;
    this.response = response;
    this.body = body;
  }
}

export class BadRequestError extends HttpError {
  constructor(response: Response, body?: any) {
    super(response, body);
    this.name = "BadRequestError";
    this.message =
      body?.message || "Bad request - please check your input parameters";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(response: Response, body?: any) {
    super(response, body);
    this.name = "UnauthorizedError";
    this.message = "Authentication required - please check your credentials";
  }
}

export class ForbiddenError extends HttpError {
  constructor(response: Response, body?: any) {
    super(response, body);
    this.name = "ForbiddenError";
    this.message = "Access denied - insufficient permissions";
  }
}

export class NotFoundError extends HttpError {
  constructor(response: Response, body?: any) {
    super(response, body);
    this.name = "NotFoundError";
    this.message = body?.message || "Resource not found";
  }
}

export class RateLimitError extends HttpError {
  public readonly retryAfter?: number;

  constructor(response: Response, body?: any) {
    super(response, body);
    this.name = "RateLimitError";
    this.message = "Rate limit exceeded - please try again later";

    // Extract retry-after header if present
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) {
      this.retryAfter = parseInt(retryAfter, 10);
    }
  }
}

export class ServerError extends HttpError {
  constructor(response: Response, body?: any) {
    super(response, body);
    this.name = "ServerError";
    this.message = "Server error - please try again later";
  }
}

export class NetworkError extends Error {
  constructor(originalError: Error) {
    super("Network error - please check your connection");
    this.name = "NetworkError";
    this.cause = originalError;
  }
}

export function createHttpError(response: Response, body?: any): HttpError {
  if (response.status === 400) {
    return new BadRequestError(response, body);
  } else if (response.status === 401) {
    return new UnauthorizedError(response, body);
  } else if (response.status === 403) {
    return new ForbiddenError(response, body);
  } else if (response.status === 404) {
    return new NotFoundError(response, body);
  } else if (response.status === 429) {
    return new RateLimitError(response, body);
  } else if (response.status > 499) {
    return new ServerError(response, body);
  } else {
    return new HttpError(response, body);
  }
}

/**
 * This is the base class for all generated API classes.
 */
export class BaseAPI {
  private static readonly jsonRegex = new RegExp(
    "^(:?application\/json|[^;/ \t]+\/[^;/ \t]+[+]json)[ \t]*(:?;.*)?$",
    "i",
  );
  private middleware: Middleware[];

  constructor(protected configuration = DefaultConfig) {
    this.middleware = configuration.middleware;
  }

  withMiddleware<T extends BaseAPI>(this: T, ...middlewares: Middleware[]) {
    const next = this.clone<T>();
    next.middleware = next.middleware.concat(...middlewares);
    return next;
  }

  withPreMiddleware<T extends BaseAPI>(
    this: T,
    ...preMiddlewares: Array<Middleware["pre"]>
  ) {
    const middlewares = preMiddlewares.map((pre) => ({ pre }));
    return this.withMiddleware<T>(...middlewares);
  }

  withPostMiddleware<T extends BaseAPI>(
    this: T,
    ...postMiddlewares: Array<Middleware["post"]>
  ) {
    const middlewares = postMiddlewares.map((post) => ({ post }));
    return this.withMiddleware<T>(...middlewares);
  }

  /**
   * Check if the given MIME is a JSON MIME.
   * JSON MIME examples:
   *   application/json
   *   application/json; charset=UTF8
   *   APPLICATION/JSON
   *   application/vnd.company+json
   * @param mime - MIME (Multipurpose Internet Mail Extensions)
   * @return True if the given MIME is JSON, false otherwise.
   */
  protected isJsonMime(mime: string | null | undefined): boolean {
    if (!mime) {
      return false;
    }
    return BaseAPI.jsonRegex.test(mime);
  }

  protected async request(
    context: RequestOpts,
    initOverrides?: RequestInit | InitOverrideFunction,
  ): Promise<Response> {
    const { url, init } = await this.createFetchParams(context, initOverrides);
    const response = await this.fetchApi(url, init);
    if (response && response.status >= 200 && response.status < 300) {
      return response;
    }
    let body;
    try {
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        body = await response.json();
      }
    } catch {
      // If we can't parse, that's fine
    }

    throw createHttpError(response, body);
  }

  private async createFetchParams(
    context: RequestOpts,
    initOverrides?: RequestInit | InitOverrideFunction,
  ) {
    let url = this.configuration.basePath + context.path;
    if (
      context.query !== undefined &&
      Object.keys(context.query).length !== 0
    ) {
      // only add the querystring to the URL if there are query parameters.
      // this is done to avoid urls ending with a "?" character which buggy webservers
      // do not handle correctly sometimes.
      url += "?" + this.configuration.queryParamsStringify(context.query);
    }

    const headers = Object.assign(
      {},
      this.configuration.headers,
      context.headers,
    );
    Object.keys(headers).forEach((key) =>
      headers[key] === undefined ? delete headers[key] : {},
    );

    const initOverrideFn =
      typeof initOverrides === "function"
        ? initOverrides
        : async () => initOverrides;

    const initParams = {
      method: context.method,
      headers,
      body: context.body,
      credentials: this.configuration.credentials,
    };

    const overriddenInit: RequestInit = {
      ...initParams,
      ...(await initOverrideFn({
        init: initParams,
        context,
      })),
    };

    let body: any;
    if (
      isFormData(overriddenInit.body) ||
      overriddenInit.body instanceof URLSearchParams ||
      isBlob(overriddenInit.body)
    ) {
      body = overriddenInit.body;
    } else if (this.isJsonMime(headers["Content-Type"])) {
      body = JSON.stringify(overriddenInit.body);
    } else {
      body = overriddenInit.body;
    }

    const init: RequestInit = {
      ...overriddenInit,
      body,
    };

    return { url, init };
  }

  private fetchApi = async (url: string, init: RequestInit) => {
    let fetchParams = { url, init };
    for (const middleware of this.middleware) {
      if (middleware.pre) {
        fetchParams =
          (await middleware.pre({
            fetch: this.fetchApi,
            ...fetchParams,
          })) || fetchParams;
      }
    }
    let response: Response | undefined = undefined;
    try {
      response = await (this.configuration.fetchApi || fetch)(
        fetchParams.url,
        fetchParams.init,
      );
    } catch (e) {
      for (const middleware of this.middleware) {
        if (middleware.onError) {
          response =
            (await middleware.onError({
              fetch: this.fetchApi,
              url: fetchParams.url,
              init: fetchParams.init,
              error: e,
              response: response ? response.clone() : undefined,
            })) || response;
        }
      }
      if (response === undefined) {
        if (e instanceof Error) {
          throw new FetchError(
            e,
            "The request failed and the interceptors did not return an alternative response",
          );
        } else {
          throw e;
        }
      }
    }
    for (const middleware of this.middleware) {
      if (middleware.post) {
        response =
          (await middleware.post({
            fetch: this.fetchApi,
            url: fetchParams.url,
            init: fetchParams.init,
            response: response.clone(),
          })) || response;
      }
    }
    return response;
  };

  /**
   * Create a shallow clone of `this` by constructing a new instance
   * and then shallow cloning data members.
   */
  private clone<T extends BaseAPI>(this: T): T {
    const constructor = this.constructor as any;
    const next = new constructor(this.configuration);
    next.middleware = this.middleware.slice();
    return next;
  }
}

function isBlob(value: any): value is Blob {
  return typeof Blob !== "undefined" && value instanceof Blob;
}

function isFormData(value: any): value is FormData {
  return typeof FormData !== "undefined" && value instanceof FormData;
}

export const COLLECTION_FORMATS = {
  csv: ",",
  ssv: " ",
  tsv: "\t",
  pipes: "|",
};

export type FetchAPI = WindowOrWorkerGlobalScope["fetch"];

export type Json = any;
export type HTTPMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";
export type HTTPHeaders = { [key: string]: string };
export type HTTPQuery = {
  [key: string]:
    | string
    | number
    | Date
    | null
    | boolean
    | Array<string | number | null | boolean>
    | Set<string | number | null | boolean>
    | HTTPQuery;
};
export type HTTPBody = Json | FormData | URLSearchParams;
export type HTTPRequestInit = {
  headers?: HTTPHeaders;
  method: HTTPMethod;
  credentials?: RequestCredentials;
  body?: HTTPBody;
};
export type ModelPropertyNaming =
  | "camelCase"
  | "snake_case"
  | "PascalCase"
  | "original";

export type InitOverrideFunction = (requestContext: {
  init: HTTPRequestInit;
  context: RequestOpts;
}) => Promise<RequestInit>;

export interface FetchParams {
  url: string;
  init: RequestInit;
}

export interface RequestOpts {
  path: string;
  method: HTTPMethod;
  headers: HTTPHeaders;
  query?: HTTPQuery;
  body?: HTTPBody;
}

export function querystring(params: HTTPQuery, prefix: string = ""): string {
  return Object.keys(params)
    .map((key) => querystringSingleKey(key, params[key], prefix))
    .filter((part) => part.length > 0)
    .join("&");
}

function querystringSingleKey(
  key: string,
  value:
    | string
    | number
    | null
    | undefined
    | boolean
    | Date
    | Array<string | number | null | boolean>
    | Set<string | number | null | boolean>
    | HTTPQuery,
  keyPrefix: string = "",
): string {
  const fullKey = keyPrefix + (keyPrefix.length ? `[${key}]` : key);
  if (value instanceof Array) {
    const multiValue = value
      .map((singleValue) => encodeURIComponent(String(singleValue)))
      .join(`&${encodeURIComponent(fullKey)}=`);
    return `${encodeURIComponent(fullKey)}=${multiValue}`;
  }
  if (value instanceof Set) {
    const valueAsArray = Array.from(value);
    return querystringSingleKey(key, valueAsArray, keyPrefix);
  }
  if (value instanceof Date) {
    return `${encodeURIComponent(fullKey)}=${encodeURIComponent(value.toISOString())}`;
  }
  if (value instanceof Object) {
    return querystring(value as HTTPQuery, fullKey);
  }
  return `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`;
}

export function exists(json: any, key: string) {
  const value = json[key];
  return value !== null && value !== undefined;
}

export interface RequestContext {
  fetch: FetchAPI;
  url: string;
  init: RequestInit;
}

export interface ResponseContext {
  fetch: FetchAPI;
  url: string;
  init: RequestInit;
  response: Response;
}

export interface ErrorContext {
  fetch: FetchAPI;
  url: string;
  init: RequestInit;
  error: unknown;
  response?: Response;
}

export interface Middleware {
  pre?(context: RequestContext): Promise<FetchParams | void>;
  post?(context: ResponseContext): Promise<Response | void>;
  onError?(context: ErrorContext): Promise<Response | void>;
}
