import { addMarkerImageToMap } from './AddMarkerImage';
import { canvasFill } from './CanvasFill';
/**
 * Load MSU images to the map style.
 * @param {MapLibreMap} map - The map to add the images to.
 * @param {ExtendedStyleJSON} style - The style JSON containing the images.
 * @param {Function} callback - The callback function to be called after the images are added to the map.
 */
export function LoadMSUImages(map, style, callback) {
    try {
        if (style.canvasFills) {
            style.canvasFills.forEach((fill) => {
                if (!map.hasImage(fill.id)) {
                    map.addImage(fill.id, new canvasFill(fill.fillOptions));
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
                    addMarkerImageToMap(marker.id, options);
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
export default LoadMSUImages;
//# sourceMappingURL=loader.js.map