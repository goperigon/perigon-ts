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
import type { Company } from "./Company";
import {
  CompanyFromJSON,
  CompanyFromJSONTyped,
  CompanyToJSON,
  CompanyToJSONTyped,
} from "./Company";

/**
 * Company search result
 * @export
 * @interface CompanySearchResult
 */
export interface CompanySearchResult {
  /**
   *
   * @type {number}
   * @memberof CompanySearchResult
   */
  status: number;
  /**
   *
   * @type {number}
   * @memberof CompanySearchResult
   */
  numResults: number;
  /**
   *
   * @type {Array<Company>}
   * @memberof CompanySearchResult
   */
  results: Array<Company>;
}

/**
 * Check if a given object implements the CompanySearchResult interface.
 */
export function instanceOfCompanySearchResult(
  value: object,
): value is CompanySearchResult {
  if (!("status" in value) || value["status"] === undefined) return false;
  if (!("numResults" in value) || value["numResults"] === undefined)
    return false;
  if (!("results" in value) || value["results"] === undefined) return false;
  return true;
}

export function CompanySearchResultFromJSON(json: any): CompanySearchResult {
  return CompanySearchResultFromJSONTyped(json, false);
}

export function CompanySearchResultFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CompanySearchResult {
  if (json == null) {
    return json;
  }
  return {
    status: json["status"],
    numResults: json["numResults"],
    results: (json["results"] as Array<any>).map(CompanyFromJSON),
  };
}

export function CompanySearchResultToJSON(json: any): CompanySearchResult {
  return CompanySearchResultToJSONTyped(json, false);
}

export function CompanySearchResultToJSONTyped(
  value?: CompanySearchResult | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    status: value["status"],
    numResults: value["numResults"],
    results: (value["results"] as Array<any>).map(CompanyToJSON),
  };
}
