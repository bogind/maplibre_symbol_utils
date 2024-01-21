import * as maplibre from "maplibre-gl";

/**
 * Creates an image from a [maplibre.Marker](https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker) and adds it to the map.
 * Meant to be used as an added method to the maplibre.Map class.
 * @param {string} id - The image id, if id already exists, an error will be thrown.
 * @param {maplibre.MarkerOptions} options - The marker creation options.
 * @param {function} callback - The callback function to be called after the image is added to the map.
 */
export function addMarkerImage(id ,options={},callback){
    try {
        let marker = new maplibregl.Marker(options);
        let svgDoc;
      if (!options || !options.element) {
          svgDoc = marker._element.firstChild;// default marker
      }else{
          svgDoc = marker._element; // for SVG elements
      }

      let markerSVG = new XMLSerializer().serializeToString(svgDoc);
      let markerImg = new Image(svgDoc.width.baseVal.value,svgDoc.height.baseVal.value);
      markerImg.src = 'data:image/svg+xml;base64,' + window.btoa(markerSVG);
      markerImg.decode()
      .then(() => {
        if (!this.hasImage(id)){
            this.addImage(id,markerImg);   
        }else{
            throw new Error(`Image with id: "${id}" already exists`)
        }

        if(callback && typeof callback === "function"){
            callback()
            }
        })
        .catch((encodingError) => {
            console.error("Image Encoding Error")
            console.error(encodingError)
        });
        

    } catch (error) {
        console.error("Error adding marker image")
        console.error(error)
    }
}

/**
 * Exteneds the MapLibre MarkerOptions to include the map property.
 * @typedef {Object} ExtendedMarkerOptions
 * @extends {maplibre.MarkerOptions}
 * @property {maplibre.Map} map - The map to add the image to.
 */

/**
 * Creates an image from a [maplibre.Marker](https://docs.mapbox.com/mapbox-gl-js/api/markers/#marker) and adds it to a map specified in the options.
 * @param {string} id - The image id, if id already exists, an error will be thrown.
 * @param {ExtendedMarkerOptions} options - Extended MapLibre marker creation options, a `map` value is also required.
 * @param {maplibre.Map} options.map - The map to add the image to.
 * @param {function} callback - The callback function to be called after the image is added to the map. 
*/

export function addMarkerImageToMap(id ,options={},callback){
    try {
        if(!options.map) throw new Error("Map not defined")
        let map = options.map;

        let marker = new maplibregl.Marker(options);
        let svgDoc;
        if (!options || !options.element) {
            svgDoc = marker._element.firstChild;// default marker
        }else{
            svgDoc = marker._element; // for SVG elements
        }

        let markerSVG = new XMLSerializer().serializeToString(svgDoc);
        let markerImg = new Image(svgDoc.width.baseVal.value,svgDoc.height.baseVal.value);
        markerImg.src = 'data:image/svg+xml;base64,' + window.btoa(markerSVG);
        markerImg.decode()
        .then(() => {
            if (!map.hasImage(id)) map.addImage(id,markerImg);   

            if(callback){
                callback()
                }
            })
            .catch((encodingError) => {
                console.error("Image Encoding Error")
                console.error(encodingError)
            });
        

    } catch (error) {
        console.error("Error adding marker image")
        console.error(error)
    }
}



