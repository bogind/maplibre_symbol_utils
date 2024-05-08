import { type Map as MapLibreMap } from 'maplibre-gl';
/**
 * Options for the creation of the canvas fill image.
 * @typedef {Object} fillOptions
 * @property {string} [backGroundColor='rgba(0,0,0,0)'] - The background color of the image.
 * @property {integer} [size=512] - The size of the image.
 * @property {integer} [factor=16] - The factor of the lines.
 * @property {boolean} [keepRepainting=false] - If true, the image will be repainted on every map repaint.
 * @property {Array.<lineOptions>} lines - The lines to be drawn on the image.
 */
declare type fillOptions = {
    backGroundColor?: string;
    size?: number;
    factor?: number;
    keepRepainting?: boolean;
    lines: Array<lineOptions>;
};
/**
 * @typedef {Object} lineOptions
 * @property {string} color - The color of the line.
 * @property {integer} [width=1] - The width of the line.
 * @property {lineType} type - The type of the line.
 * @property {integer} [factor=16] - The factor of the lines.
 * @property {integer} [size=512] - The size of the image.
 * @property {string} [lineCap='square'] - The shape used to draw the end points of lines. Can be one of butt, round, or square. @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap CanvasRenderingContext2D.lineCap}
 */
declare type lineOptions = {
    color: string;
    width?: number;
    type: string | lineType;
    lineCap?: string;
    factor?: number;
    size?: number;
};
/**
 * @typedef {(LineTypeCross|LineTypeDiagonalCross|LineTypeForwardSlash|LineTypeBackSlash|LineTypeHorizontal|LineTypeVertical)} lineType
 */
declare type lineType = LineTypeCross | LineTypeDiagonalCross | LineTypeForwardSlash | LineTypeBackSlash | LineTypeHorizontal | LineTypeVertical;
/**
 * @typedef {('esriSFSBackwardDiagonal'|'ForwardSlash'|'/')} LineTypeForwardSlash - Lines drawn as a forward slash (from bottom left to top right)
 */
declare type LineTypeForwardSlash = 'esriSFSForwardDiagonal' | 'ForwardSlash' | '/';
/**
 * @typedef {('esriSFSForwardDiagonal'|'Backslash'|'\\')} LineTypeBackSlash - Lines drawn as a backslash (from top left to bottom right)
 */
declare type LineTypeBackSlash = 'esriSFSBackwardDiagonal' | 'Backslash' | '\\';
/**
 * @typedef {('esriSFSCross'|'cross'|'+')} LineTypeCross - Lines drawn as a cross (horizontal and vertical lines)
 */
declare type LineTypeCross = 'esriSFSCross' | 'cross' | '+';
/**
 * @typedef {('esriSFSHorizontal'|'Horizontal'|'-')} LineTypeHorizontal - Lines drawn as a horizontal line
 */
declare type LineTypeHorizontal = 'esriSFSHorizontal' | 'Horizontal' | '-';
/**
 * @typedef {('esriSFSVertical'|'Vertical'|'|')} LineTypeVertical - Lines drawn as a vertical line
 */
declare type LineTypeVertical = 'esriSFSVertical' | 'Vertical' | '|';
/**
 * @typedef {('esriSFSDiagonalCross'|'x')} LineTypeDiagonalCross - Lines drawn as a diagonal cross (forward and backward slash)
 */
declare type LineTypeDiagonalCross = 'esriSFSDiagonalCross' | 'x';
/**
 * @callback createCanvasFillCallback
 * @param {Object} image - The image created by createCanvasFill.
 */
declare type createCanvasFillCallback = (image: Object) => void;
/**
 * Creates a canvas fill image and adds it to the map.
 * @class
 * @example
 * // Create a canvas fill image with a black cross over a blue backgroundand add it to the map.
 * map.addImage('Cross',  new canvasFill( {
 *    size: 512,
 *    backGroundColor: 'rgba(20,20,255,0.5)',
 *    factor: 64,
 *    lines: [
 *      {color:'rgba(0,0,0,255)',type:'esriSFSCross',width:4}
 *   ]
 * }))
 *
 * // Create a canvas fill image with a green X over a red background add it to the map.
 * map.addImage('DiagonalCross',  new canvasFill( {
 *   size: 512,
 *   backGroundColor: 'rgba(20,255,20,1)',
 *   factor: 64,
 *   lines: [
 *    {color:'rgba(255,0,0,255)',type:'esriSFSDiagonalCross',width:3}
 *   ]
 * }))
 *
 */
export declare class canvasFill {
    params: Object;
    fillOptions: fillOptions;
    keepRepainting: boolean;
    backGroundColor: string;
    size: number;
    factor: number;
    width: number;
    height: number;
    data: Uint8ClampedArray;
    lines: Array<lineOptions>;
    _map: MapLibreMap;
    context: CanvasRenderingContext2D;
    /**
     * @param {Object} params - The parameters of the canvas fill image.
     * @param {Array<lineOptions>} params.lines - The lines options.
     * @param {createCanvasFillCallback} callback - The callback function to be called after the image is created.
     */
    constructor(params: fillOptions, callback: createCanvasFillCallback);
    onAdd(map: MapLibreMap): void;
    render(): boolean;
    drawLines(): void;
    /**
     * @param {string} lineType - The line type to be evaluated.
     * @returns {string} - The evaluated line type.
     * @throws {Error} - If the line type is not recognized.
     * @private
     * @example
     * let lineType = checklineType('esriSFSBackwardDiagonal')
     * // returns 'LineTypeBackSlash'
     */
    checklineType(linetype: string): string | undefined;
}
export default canvasFill;
