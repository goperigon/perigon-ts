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
/**
 *
 * @export
 * @interface CompanyCount
 */
export interface CompanyCount {
  /**
   *
   * @type {string}
   * @memberof CompanyCount
   */
  id?: string | null;
  /**
   *
   * @type {string}
   * @memberof CompanyCount
   */
  name?: string | null;
  /**
   *
   * @type {Array<string>}
   * @memberof CompanyCount
   */
  domains?: Array<string> | null;
  /**
   *
   * @type {Array<string>}
   * @memberof CompanyCount
   */
  symbols?: Array<string> | null;
  /**
   *
   * @type {number}
   * @memberof CompanyCount
   */
  count?: number | null;
}

/**
 * Check if a given object implements the CompanyCount interface.
 */
export function instanceOfCompanyCount(value: object): value is CompanyCount {
  return true;
}

export function CompanyCountFromJSON(json: any): CompanyCount {
  return CompanyCountFromJSONTyped(json, false);
}

export function CompanyCountFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CompanyCount {
  if (json == null) {
    return json;
  }
  return {
    id: json["id"] == null ? undefined : json["id"],
    name: json["name"] == null ? undefined : json["name"],
    domains: json["domains"] == null ? undefined : json["domains"],
    symbols: json["symbols"] == null ? undefined : json["symbols"],
    count: json["count"] == null ? undefined : json["count"],
  };
}

export function CompanyCountToJSON(json: any): CompanyCount {
  return CompanyCountToJSONTyped(json, false);
}

export function CompanyCountToJSONTyped(
  value?: CompanyCount | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    id: value["id"],
    name: value["name"],
    domains: value["domains"],
    symbols: value["symbols"],
    count: value["count"],
  };
}
