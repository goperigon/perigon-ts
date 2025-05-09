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
 * @interface WikidataLabelHolder
 */
export interface WikidataLabelHolder {
  /**
   *
   * @type {string}
   * @memberof WikidataLabelHolder
   */
  wikidataId?: string | null;
  /**
   *
   * @type {string}
   * @memberof WikidataLabelHolder
   */
  label?: string | null;
}

/**
 * Check if a given object implements the WikidataLabelHolder interface.
 */
export function instanceOfWikidataLabelHolder(
  value: object,
): value is WikidataLabelHolder {
  return true;
}

export function WikidataLabelHolderFromJSON(json: any): WikidataLabelHolder {
  return WikidataLabelHolderFromJSONTyped(json, false);
}

export function WikidataLabelHolderFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): WikidataLabelHolder {
  if (json == null) {
    return json;
  }
  return {
    wikidataId: json["wikidataId"] == null ? undefined : json["wikidataId"],
    label: json["label"] == null ? undefined : json["label"],
  };
}

export function WikidataLabelHolderToJSON(json: any): WikidataLabelHolder {
  return WikidataLabelHolderToJSONTyped(json, false);
}

export function WikidataLabelHolderToJSONTyped(
  value?: WikidataLabelHolder | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    wikidataId: value["wikidataId"],
    label: value["label"],
  };
}
