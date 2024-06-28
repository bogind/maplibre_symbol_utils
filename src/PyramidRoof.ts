import {type Map as MapLibreMap, MercatorCoordinate} from 'maplibre-gl';
import { FilterSpecification, Feature } from 'maplibre-gl';
import { StyleExpression } from '@maplibre/maplibre-gl-style-spec';


declare type RoofStrokeOptions = {
    color: string;
    width: number;
    opacity: number;
}

declare type RoofOptions = {
    id: string;
    source: string;
    sourceLayer?: string;
    color?: string;
    stroke?: RoofStrokeOptions;
    base?: number;
    height?: number;
    map: MapLibreMap;

}

export class PyramidRoof {

    type: string;
    renderingMode: string;
    map?: MapLibreMap;
    filterFunction?: FilterSpecification;
    sourceName: string;
    color?: number[] | string;
    strokeColor?: number[] | string;
    strokeWidth?: number;
    strokeOpacity?: number;
    base?: number | StyleExpression | number[] | string[] | StyleExpression[] | string;
    height?: number | StyleExpression | number[] | string[] | StyleExpression[] | string;

    constructor(params: RoofOptions) {
        this.type = 'custom';
        this.renderingMode = '3d';
        this.sourceName = params.source;
        this.color = this.parseColor(params.color || '#FF0000');
        this.strokeColor = this.parseColor(params.stroke?.color || '#000000');
        this.strokeWidth = params.stroke?.width || 1;
        this.strokeOpacity = params.stroke?.opacity || 1;
        this.base = params.base || 0;
        this.height = params.height || 0;


        this.init(params);
    }

    init(params: RoofOptions) {
        console.log('PyramidRoof.init');
        
    }

    rgbaToGlsl(r: number, g: number, b: number, a: number) {
        return [r / 255, g / 255, b / 255, a / 255];
    }

    hexToGlsl(hex: string) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        let a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
        return this.rgbaToGlsl(r, g, b, a);
    }

    parseColor(color: string | number[]) {
        if (typeof color === 'string') {
            return this.hexToGlsl(color);
        } else if (Array.isArray(color)) {

            if (color.length === 3) {
                if (color.every(c => c <= 1)) {
                    return color;
                } else {
                    return color.map(c => c / 255);
                }
            }
        }
    }

    filterFeatures() {
        if (this.map) {
            if (this.filterFunction) {
                const filter: FilterSpecification = this.filterFunction;
                return this.map.querySourceFeatures(this.sourceName, { filter });
            } else {
                return this.map.querySourceFeatures(this.sourceName);
            }
        }
    }

    parseHeight(height: number | number[] | string[] | StyleExpression[] | string) {
        try {
            let heightExpression: StyleExpression = new StyleExpression(height as any);
            this.height = heightExpression;
        } catch (error) {
            
        }
    }

    getVerticesForFeature(feature: Feature) {
        try {
            let vertices: number[] = [];
            let geometry: any;
            let coords: number[][] = [];
            let center;
            let height;
            let base;

            if (feature.geometry) {
                geometry = feature.geometry;
            }

            if(geometry.type === 'Polygon') {
                coords = geometry.coordinates[0];
            }
            if(geometry.type === 'MultiPolygon') {
                coords = geometry.coordinates[0][0];
            }

            if (this.height instanceof StyleExpression) {
                height = this.height.evaluate({
                    zoom: this.map ? this.map.getZoom() : 0,
                },feature as Feature);
            } else {
                height = this.height;
            }

            if (this.base instanceof StyleExpression) {
                base = this.base.evaluate({
                    zoom: this.map ? this.map.getZoom() : 0,
                },feature as Feature);
            } else {
                base = this.base;
            }

            if (coords && coords.length < 3) {
                let Xmax = Math.max(...coords.map((o: number[]) => o[0]));
                let Ymax = Math.max(...coords.map((o: number[]) => o[1]));
                let Xmin = Math.min(...coords.map((o: number[]) => o[0]));
                let Ymin = Math.min(...coords.map((o: number[]) => o[1]));
                let Xmid = (Xmax + Xmin) / 2;
                let Ymid = (Ymax + Ymin) / 2;

                center = [Xmid, Ymid, height] as number[];

            } else {
                center = [0, 0, 0];
            }

            // Add the center point first
            let mercatorCenter = MercatorCoordinate.fromLngLat(
                { 'lng': center[0], 'lat': center[1] } as { lng: number, lat: number },
                center[2] as number
            );

            vertices.push(mercatorCenter.x);
            vertices.push(mercatorCenter.y);
            vertices.push(mercatorCenter.z);

            // Then add the perimeter points
            coords.forEach(coord => {
                let zValue = coord[2] || base;
                if(Array.isArray(zValue)) {
                    zValue = zValue[0];
                }
                if(typeof zValue === 'string') {
                    zValue = parseFloat(zValue);
                }
                
                let mercatorCood = MercatorCoordinate.fromLngLat({lng: coord[0], lat: coord[1]}, zValue);
                vertices.push(mercatorCood.x);
                vertices.push(mercatorCood.y);
                vertices.push(mercatorCood.z);
            })

            return vertices;
            
        } catch (error) {
            console.error('Error in getVerticesForFeature', error);
        }
        


    }

    onAdd(map: MapLibreMap) {
        this.map = map;
        console.log('PyramidRoof.onAdd');
    }

    render(gl: WebGLRenderingContext, matrix: Float32Array) {
        console.log('PyramidRoof.render');
    }
}