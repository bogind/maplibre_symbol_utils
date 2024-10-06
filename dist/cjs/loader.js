"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadMSUImages = void 0;
const AddMarkerImage_1 = require("./AddMarkerImage");
const CanvasFill_1 = require("./CanvasFill");
/**
 * Load MSU images to the map style.
 * @param {MapLibreMap} map - The map to add the images to.
 * @param {ExtendedStyleJSON | string} style - The style JSON containing the images or a URL to returning it. If a URL is provided, the function will fetch the JSON and call itself with the JSON.
 * @param {Function} callback - The callback function to be called after the images are added to the map.
 */
function LoadMSUImages(map, style, callback) {
    try {
        // If the style is a URL, fetch the JSON and call the function again.
        // This is pretty lazy, but it works.
        if (typeof style === 'string') {
            fetch(style)
                .then((response) => response.json())
                .then((data) => {
                LoadMSUImages(map, data, callback);
            });
            return;
        }
        if (style.canvasFills) {
            style.canvasFills.forEach((fill) => {
                if (!map.hasImage(fill.id)) {
                    map.addImage(fill.id, new CanvasFill_1.canvasFill(fill.fillOptions));
                }
                else {
                    throw new Error(`Image with id: "${fill.id}" already exists`);
                }
            });
        }
        if (style.markerImages) {
            style.markerImages.forEach((marker) => {
                let options = marker.markerOptions;
                if (!options) {
                    options = { map: map };
                }
                else {
                    options.map = map;
                }
                if (!map.hasImage(marker.id)) {
                    (0, AddMarkerImage_1.addMarkerImageToMap)(marker.id, options);
                }
                else {
                    throw new Error(`Image with id: "${marker.id}" already exists`);
                }
            });
            callback && callback();
        }
    }
    catch (error) {
        console.error("Error loading MSU images");
        console.error(error);
    }
}
exports.LoadMSUImages = LoadMSUImages;
exports.default = LoadMSUImages;
//# sourceMappingURL=loader.js.map