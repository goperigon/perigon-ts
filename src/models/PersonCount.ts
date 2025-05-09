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
 * @interface PersonCount
 */
export interface PersonCount {
  /**
   *
   * @type {string}
   * @memberof PersonCount
   */
  wikidataId?: string | null;
  /**
   *
   * @type {string}
   * @memberof PersonCount
   */
  name?: string | null;
  /**
   *
   * @type {number}
   * @memberof PersonCount
   */
  count?: number | null;
}

/**
 * Check if a given object implements the PersonCount interface.
 */
export function instanceOfPersonCount(value: object): value is PersonCount {
  return true;
}

export function PersonCountFromJSON(json: any): PersonCount {
  return PersonCountFromJSONTyped(json, false);
}

export function PersonCountFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PersonCount {
  if (json == null) {
    return json;
  }
  return {
    wikidataId: json["wikidataId"] == null ? undefined : json["wikidataId"],
    name: json["name"] == null ? undefined : json["name"],
    count: json["count"] == null ? undefined : json["count"],
  };
}

export function PersonCountToJSON(json: any): PersonCount {
  return PersonCountToJSONTyped(json, false);
}

export function PersonCountToJSONTyped(
  value?: PersonCount | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    wikidataId: value["wikidataId"],
    name: value["name"],
    count: value["count"],
  };
}
