import { type MarkerOptions as MapLibreMarkerOptions, type Map as MapLibreMap } from 'maplibre-gl';
/**
 * Exteneds the MapLibre MarkerOptions to include the map property.
 * @typedef {Object} ExtendedMarkerOptions
 * @extends {MarkerOptions}
 * @property {MapLibreMap} map - The map to add the image to.
 */
declare type ExtendedMarkerOptions = MapLibreMarkerOptions & {
    map: MapLibreMap;
};
export { type ExtendedMarkerOptions };
/**
 * Creates an image from a [maplibre.Marker](https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker) and adds it to the map.
 * Meant to be used as an added method to the maplibre.Map class.
 * @param {string} id - The image id, if id already exists, an error will be thrown.
 * @param {ExtendedMarkerOptions} options - The marker creation options.
 * @param {Function} callback - The callback function to be called after the image is added to the map.
 */
export declare function addMarkerImage(id: string, options: ExtendedMarkerOptions, callback?: Function): void;
/**
 * Creates an image from a [maplibre.Marker](https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker) and adds it to a map specified in the options.
 * @param {string} id - The image id, if id already exists, an error will be thrown.
 * @param {ExtendedMarkerOptions} options - Extended MapLibre marker creation options, a `map` value is also required.
 * @param {MapLibreMap} options.map - The map to add the image to.
 * @param {Function} callback  - The callback function to be called after the image is added to the map.
*/
export declare function addMarkerImageToMap(id: string, options: ExtendedMarkerOptions, callback?: Function): void;
