import {addMarkerImageToMap, ExtendedMarkerOptions} from './AddMarkerImage';
import {canvasFill, type fillOptions} from './CanvasFill';
import {type Map as MapLibreMap, type MarkerOptions as MapLibreMarkerOptions} from 'maplibre-gl';


/**
 * Define a marker image to be added to the map style.
 * Callbacks for individual images are not supported when using the loader.
 * @param {string} id - The image id, if id already exists, an error will be thrown.
 * @param {ExtendedMarkerOptions} options - The marker creation options.
 */
declare type MarkerImageOptions = {
    id: string,
    markerOptions?: MapLibreMarkerOptions;
}

/**
 * Define a canvas fill to be added to the map style.
 * Callbacks for individual images are not supported when using the loader.
 * @param {string} id - The image id, if id already exists, an error will be thrown.
 * @param {fillOptions} fillOptions - The fill creation options.
 */
declare type CanvasFillOptions = {
    id: string,
    fillOptions: fillOptions
}

/**
 * Define the style JSON for MSU symbols.
 * @param {Array<CanvasFillOptions>} canvasFills - Array of canvas fill images.
 * @param {Array<MarkerImageOptions>} markerImages - Array of marker images.
 */
declare type ExtendedStyleJSON =  {
    canvasFills ?: Array<CanvasFillOptions>;
    markerImages ?: Array<MarkerImageOptions>;
};


export type {ExtendedStyleJSON as MSUStyleJSON, CanvasFillOptions as StyleCanvasFillOptions, MarkerImageOptions as StyleMarkerImageOptions};

/**
 * Load MSU images to the map style.
 * @param {MapLibreMap} map - The map to add the images to.
 * @param {ExtendedStyleJSON} style - The style JSON containing the images.
 * @param {Function} callback - The callback function to be called after the images are added to the map.
 */
export function LoadMSUImages(map:MapLibreMap,style:ExtendedStyleJSON, callback?:Function){
    try {
        if(style.canvasFills){
            style.canvasFills.forEach((fill)=>{
                if(!map.hasImage(fill.id)){
                    map.addImage( fill.id, new canvasFill(fill.fillOptions));
                }else{
                    throw new Error(`Image with id: "${fill.id}" already exists`)
                }
            })
        }
        if(style.markerImages){
            style.markerImages.forEach((marker)=>{
                let options = marker.markerOptions as ExtendedMarkerOptions;
                if (!options) {
                    options = {map: map}
                }else{
                    options.map = map;
                }
                if(!map.hasImage(marker.id)){
                    addMarkerImageToMap(marker.id,options);
                }else{
                    throw new Error(`Image with id: "${marker.id}" already exists`)
                }
            })
            callback && callback();
        }
    } catch (error) {
        console.error("Error loading MSU images")
        console.error(error)
        
    }
    
}
export default LoadMSUImages;