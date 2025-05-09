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
 * @interface SentimentHolder
 */
export interface SentimentHolder {
  /**
   *
   * @type {number}
   * @memberof SentimentHolder
   */
  positive?: number | null;
  /**
   *
   * @type {number}
   * @memberof SentimentHolder
   */
  negative?: number | null;
  /**
   *
   * @type {number}
   * @memberof SentimentHolder
   */
  neutral?: number | null;
}

/**
 * Check if a given object implements the SentimentHolder interface.
 */
export function instanceOfSentimentHolder(
  value: object,
): value is SentimentHolder {
  return true;
}

export function SentimentHolderFromJSON(json: any): SentimentHolder {
  return SentimentHolderFromJSONTyped(json, false);
}

export function SentimentHolderFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): SentimentHolder {
  if (json == null) {
    return json;
  }
  return {
    positive: json["positive"] == null ? undefined : json["positive"],
    negative: json["negative"] == null ? undefined : json["negative"],
    neutral: json["neutral"] == null ? undefined : json["neutral"],
  };
}

export function SentimentHolderToJSON(json: any): SentimentHolder {
  return SentimentHolderToJSONTyped(json, false);
}

export function SentimentHolderToJSONTyped(
  value?: SentimentHolder | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    positive: value["positive"],
    negative: value["negative"],
    neutral: value["neutral"],
  };
}
