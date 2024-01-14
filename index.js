import * as maplibre from "maplibre-gl";
import { addMarkerImage,addMarkerImageToMap } from "./AddMarkerImage.js";

maplibre.Map.prototype.addMarkerImage = addMarkerImage;

export { addMarkerImageToMap };