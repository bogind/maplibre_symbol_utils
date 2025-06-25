/// <reference types="mapbox__point-geometry" />
import { type Map as MapLibreMap, CustomLayerInterface, Point2D, Point } from 'maplibre-gl';
import { FilterSpecification, Feature, GeoJSONSource } from 'maplibre-gl';
import { StyleExpression, Expression } from '@maplibre/maplibre-gl-style-spec';
/**
 * Options for the pyramid roof layer stroke
 * @typedef {Object} RoofStrokeOptions
 * @property {string} [color] - The color of the stroke
 * @property {number} [width] - The width of the stroke
 * @property {number} [opacity] - The opacity of the stroke
 */
declare type RoofStrokeOptions = {
    color?: string;
    width?: number;
    opacity?: number;
};
declare class Point3D extends Point {
    z?: number | undefined;
    constructor(x: number, y: number, z?: number | undefined);
}
declare type mat4 = [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
] | Float32Array;
/**
 * Options for the pyramid roof layer
 * @typedef {Object} RoofOptions
 * @property {string} id - The id of the layer
 * @property {string} source - The id of the source
 * @property {FilterSpecification} [filter] - The filter to apply to the layer
 * @property {string} [color] - The color of the roof
 * @property {RoofStrokeOptions} [stroke] - The stroke options for the roof
 * @property {number | number[] | string[] | Expression} [base] - The base height of the roof
 * @property {number | number[] | string[] | Expression} [height] - The height of the roof
 * @property {MapLibreMap} [map] - The map object
 */
declare type RoofOptions = {
    id: string;
    source: string;
    filter?: FilterSpecification | null | undefined;
    color?: string;
    stroke?: RoofStrokeOptions;
    base?: number | number[] | string[] | Expression | unknown;
    height?: number | number[] | string[] | Expression | unknown;
    map?: MapLibreMap;
};
/**
 * A custom layer that renders pyramid roofs on top of buildings
 * @class
 * @implements {CustomLayerInterface}
 * @param {RoofOptions} params - The options for the pyramid roof layer
 * @example
 * // Use default base and height values
 * const pyramidRoof = new PyramidRoof({
 *      id: 'pyramid-roof',
 *      source: 'buildings',
 *      color: '#ff0000',
 *      base: 0,
 *      height: 10
 *  });
 * map.addLayer(pyramidRoof);
 * @example
 * // use expressions for base and height
 * const pyramidRoof = new PyramidRoof({
 *      id: 'pyramid-roof',
 *      source: 'buildings',
 *      color: '#ff0000',
 *      height: ['+', ['get', 'extrusion_height'], 15],
        base: ['get', 'extrusion_height'],
 * });
 * map.addLayer(pyramidRoof);
 */
export declare class PyramidRoof implements CustomLayerInterface {
    id: string;
    type: 'custom';
    renderingMode: '3d' | '2d' | undefined;
    map?: MapLibreMap;
    filterFunction?: FilterSpecification | null | undefined;
    sourceName: string;
    color?: number[] | string;
    strokeColor?: number[] | string;
    strokeWidth?: number;
    strokeOpacity?: number;
    base?: number | unknown | StyleExpression | undefined;
    height?: number | unknown | StyleExpression | undefined;
    sidesProgram: WebGLProgram | null | undefined;
    edgesProgram: WebGLProgram | null | undefined;
    edges_aPos: number | undefined;
    buffers: {
        buffer: WebGLBuffer | null;
        indexBuffer: WebGLBuffer | null;
        vertexCount: number;
    }[] | undefined;
    source: GeoJSONSource | undefined;
    _data: GeoJSON.FeatureCollection | undefined;
    sides_aPos: number | undefined;
    debug_logged: boolean;
    private _savedGLState;
    gl: WebGLRenderingContext | undefined;
    renderedEdges: Set<any>;
    renderedSides: Set<any>;
    renderedOnce: boolean;
    constructor(params: RoofOptions);
    checkSourceType(sourceName: string): void;
    rgbaToGlsl(r: number, g: number, b: number, a: number): number[];
    hexToGlsl(hex: string): number[];
    parseColor(color: string | number[]): number[] | undefined;
    filterFeatures(): any[];
    parseHeight(height: number | number[] | string[] | StyleExpression[] | string): void;
    isBoundaryEdge(p1: Point, p2: Point, EXTENT?: number): boolean;
    isEntirelyOutside(ring: Point2D[], EXTENT?: number): boolean;
    addVertex(vertexArray: number[], x: number, y: number, z: number, nx: number, ny: number, nz: number, t: number, e: number): void;
    getVerticesFromCoordinates(coords: number[][], height: number, base: number): number[];
    getVerticesFromRings(ring: Point3D[], height: number, base: number): number[];
    getMLVerticesFromRings(ring: Point3D[], height: number, base: number): number[] | {
        vertices: number[];
        indices: number[];
    };
    getVerticesForPolygon(polygon: number[][], height: number, base: number, feature?: Feature | GeoJSON.Feature): number[] | undefined;
    getVerticesForFeature(feature: Feature | GeoJSON.Feature): number[] | undefined;
    createSidesFragmentSource(color: number[]): string;
    createSidesVertexSource(color: number[]): string;
    createMLSidesVertexSource(color: number[]): string;
    createSidesProgram(gl: WebGLRenderingContext): void;
    createEdgesProgram(gl: WebGLRenderingContext): void;
    update(event?: any): void;
    removeItem(item: any): void;
    onAdd(map: MapLibreMap, gl: WebGLRenderingContext): void;
    renderSides(gl: WebGLRenderingContext, matrix: mat4, map: MapLibreMap): void;
    renderEdges(gl: WebGLRenderingContext, matrix: mat4): void;
    private saveGLState;
    private restoreGLState;
    onRemove(): void;
    render(gl: WebGLRenderingContext, matrix: mat4): void;
}
export default PyramidRoof;
