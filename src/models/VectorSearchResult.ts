/* tslint:disable */
/* eslint-disable */
/**
 * Perigon API
 * The Perigon API provides access to comprehensive news and web content data. To use the API, simply sign up for a Perigon Business Solutions account to obtain your API key. Your available features may vary based on your plan. See the Authentication section for details on how to use your API key.
 *
 * The version of the OpenAPI document: 1.0.0
 * Contact: data@perigon.io
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
import type { ScoredArticle } from "./ScoredArticle";
import {
  ScoredArticleFromJSON,
  ScoredArticleFromJSONTyped,
  ScoredArticleToJSON,
  ScoredArticleToJSONTyped,
} from "./ScoredArticle";

/**
 * Vector search result
 * @export
 * @interface VectorSearchResult
 */
export interface VectorSearchResult {
  /**
   *
   * @type {number}
   * @memberof VectorSearchResult
   */
  status: number;
  /**
   *
   * @type {Array<ScoredArticle>}
   * @memberof VectorSearchResult
   */
  results: Array<ScoredArticle>;
}

/**
 * Check if a given object implements the VectorSearchResult interface.
 */
export function instanceOfVectorSearchResult(
  value: object,
): value is VectorSearchResult {
  if (!("status" in value) || value["status"] === undefined) return false;
  if (!("results" in value) || value["results"] === undefined) return false;
  return true;
}

export function VectorSearchResultFromJSON(json: any): VectorSearchResult {
  return VectorSearchResultFromJSONTyped(json, false);
}

export function VectorSearchResultFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): VectorSearchResult {
  if (json == null) {
    return json;
  }
  return {
    status: json["status"],
    results: (json["results"] as Array<any>).map(ScoredArticleFromJSON),
  };
}

export function VectorSearchResultToJSON(json: any): VectorSearchResult {
  return VectorSearchResultToJSONTyped(json, false);
}

export function VectorSearchResultToJSONTyped(
  value?: VectorSearchResult | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    status: value["status"],
    results: (value["results"] as Array<any>).map(ScoredArticleToJSON),
  };
}
