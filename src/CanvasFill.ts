import {type Map as MapLibreMap} from 'maplibre-gl';
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
    type: string|lineType;
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
 * @typedef {('esriSFSBackwardDiagonal'|'esriSFSForwardDiagonal'|'esriSFSCross'|'esriSFSHorizontal'|'esriSFSVertical'|'esriSFSDiagonalCross')} esriLineType - Line types as defined by esri Simple Fill Symbols (SFS).
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-symbols-SimpleFillSymbol.html#style esri Simple Fill Symbols (SFS)}
 */
declare type esriLineType = 'esriSFSBackwardDiagonal' | 'esriSFSForwardDiagonal' | 'esriSFSCross' | 'esriSFSHorizontal' | 'esriSFSVertical' | 'esriSFSDiagonalCross';

/**
 * @typedef {(('ForwardSlash'|'/')|('Backslash'|'\\')|('cross'|'+')|('Horizontal'|'-')|('Vertical'|'|')|'x')} simpleLineType - Simplified readable line types.
 */
declare type simpleLineType = 'ForwardSlash' | '/' | 'Backslash' | '\\' | 'cross' | '+' | 'Horizontal' | '-' | 'Vertical' | '|' | 'x';

/**
 * @callback createCanvasFillCallback
 * @param {Object} image - The image created by createCanvasFill.
 */
declare type createCanvasFillCallback = (image:Object) => void;

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
export class canvasFill{

    params!: Object;
    fillOptions!: fillOptions;
    keepRepainting!: boolean;
    backGroundColor!: string;
    size!: number;
    factor!: number;
    width!: number;
    height!: number;
    data!: Uint8ClampedArray;
    lines!: Array<lineOptions>;
    _map!: MapLibreMap;
    context!: CanvasRenderingContext2D;


    /**
     * @param {Object} params - The parameters of the canvas fill image.
     * @param {Array<lineOptions>} params.lines - The lines options.
     * @param {createCanvasFillCallback} callback - The callback function to be called after the image is created.
     */
    constructor(params:fillOptions,callback?:createCanvasFillCallback){
        try {
    
            if ( !params) throw new Error('fillOptions must be supplied as parameters')
      
            this.fillOptions = params
            this.keepRepainting = this.fillOptions.keepRepainting || false;

            this.backGroundColor = this.fillOptions.backGroundColor || 'rgba(0,0,0,0)';
            this.size = this.fillOptions.size || 512;
            this.factor = this.fillOptions.factor || 16;

            this.width = this.size;
            this.height = this.size;
            this.data = new Uint8ClampedArray(this.size * this.size * 4);

            if(!this.fillOptions.lines) throw new Error('lines must be supplied as a parameter')
            if(!Array.isArray(this.fillOptions.lines)) throw new Error('lines must be an array')
            if(this.fillOptions.lines.length == 0) throw new Error('lines must have at least one line')

            this.lines = this.fillOptions.lines || [{color:'rgba(0,0,0,255)',type:'esriSFSBackwardDiagonal',width:1}];
            
        
            //let image = createCanvasFillImage(fillOptions, this._map)
            if(callback && typeof callback === "function"){
                callback(this)
                }
            //return image
        } catch (error) {
            console.error("Error creating fill image")
            console.error(error)
        }

    }

    onAdd(map: MapLibreMap) {
        try{
            this._map = map;
            let canvas = document.createElement('canvas')
            canvas.width = this.width;
            canvas.height = this.height;
            this.context = canvas.getContext('2d') as CanvasRenderingContext2D;
        }catch (error) {
            console.error("Error adding canvas to map")
            console.error(error)
        }
        
        
    }

    render() {
        //this.context;

        // Clear the canvas
        this.context.clearRect(0, 0, this.width, this.height);

        // Paint the backgorund
        this.context.fillStyle = this.backGroundColor;
        this.context.fillRect(0,0, this.width,this.height);

        // Draw the lines
        this.drawLines()

        // update the image's data with data from the canvas
        this.data = new Uint8ClampedArray(this.context.getImageData(
            0,
            0,
            this.width,
            this.height
        ).data);

        if(this._map && this._map.triggerRepaint && this.keepRepainting){
            this._map.triggerRepaint();
        }

        // return `true` to let the map know that the image was updated
        return true;
    }

    drawLines(){
        let context = this.context;
        try {
            for(let i=0;i<this.lines.length;i++){
                let line = this.lines[i]
                line.factor = line.factor || this.factor;
                line.size = line.size || this.size;
                line.width = line.width || 1;
                line.lineCap = line.lineCap || 'square';
                const lineType = this.checklineType(line.type)
            
                switch(lineType){
                    case 'LineTypeBackSlash':
                        canvasDrawForwardDiagonalLine(context,line.color,line.width,line.size,line.lineCap, this.width,this.height,line.factor)
                        break;
                    case 'LineTypeForwardSlash':
                        canvasDrawBackwardDiagonalLine(context,line.color,line.width,line.size,line.lineCap,this.width,this.height,line.factor)
                        break;
                    case 'LineTypeCross':
                        canvasDrawCross(context,line.color,line.width,line.size,line.lineCap, this.width,this.height,line.factor)
                        break;
                    case 'LineTypeHorizontal':
                        canvasDrawHorizontalLine(context,line.color,line.width,line.size,line.lineCap,this.width,line.factor)
                        break;
                    case 'LineTypeVertical':
                        canvasDrawVerticalLine(context,line.color,line.width,line.size,line.lineCap,this.height,line.factor)
                        break;
                    case 'LineTypeDiagonalCross':
                        canvasDrawForwardDiagonalLine(context,line.color,line.width,line.size,line.lineCap, this.width,this.height,line.factor)
                        canvasDrawBackwardDiagonalLine(context,line.color,line.width,line.size,line.lineCap, this.width,this.height,line.factor)
                        break;
                    default:
                        throw new Error('line type not recognized')
                }
            }
            
        }catch (error) {
            console.error("Error drawing lines")
            console.error(error)
        }
    }

    /**
     * @param {string} lineType - The line type to be evaluated.
     * @returns {string} - The evaluated line type.
     * @throws {Error} - If the line type is not recognized.
     * @private
     * @example
     * let lineType = checklineType('esriSFSBackwardDiagonal')
     * // returns 'LineTypeBackSlash'
     */
    checklineType(linetype:string){
        try{
            let evaluatedType: string | null = null;
        if(linetype == 'esriSFSBackwardDiagonal' || linetype == 'Backslash' || linetype == '\\'){
            evaluatedType = 'LineTypeBackSlash';
        }
        if(linetype == 'esriSFSForwardDiagonal' || linetype == 'ForwardSlash' || linetype == '/'){
            evaluatedType =  'LineTypeForwardSlash';
        }
        if(linetype == 'esriSFSCross' || linetype == 'cross' || linetype == '+'){
            evaluatedType = 'LineTypeCross';
        }
        if(linetype == 'esriSFSHorizontal' || linetype == 'Horizontal' || linetype == '-'){
            evaluatedType =  'LineTypeHorizontal';
        }
        if(linetype == 'esriSFSVertical' || linetype == 'Vertical' || linetype == '|'){
            evaluatedType =  'LineTypeVertical';
        }
        if(linetype == 'esriSFSDiagonalCross' || linetype == 'x'){
            evaluatedType =  'LineTypeDiagonalCross';
        }

        if(evaluatedType == null){
            throw new Error(`line type '${linetype}' not recognized`)
        }
        return evaluatedType
        } catch (error) {
            console.error("Error while checking line type")
            console.error(error)
        }
        
    }
        
        
 
}

export default canvasFill;

/**
 * Draws a backward diagonal line on a canvas.
 * @param {CanvasRenderingContext2D} context - The context of the canvas.
 * @param {string} lineColor - The color of the line, A string parsed as {@link https://developer.mozilla.org/en-US/docs/Web/CSS/color_value CSS color} value.
 * @param {number} lineWidth - The width of the line.
 * @param {number} size - The size of the image.
 * @param {CanvasLineCap} lineCap - The shape used to draw the end points of lines. Can be one of butt, round, or square. @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap CanvasRenderingContext2D.lineCap}
 * @param {integer} width - The width of the image.
 * @param {integer} height - The height of the image.
 * @param {integer} factor - The factor of the lines.
 * @private
 */
function canvasDrawBackwardDiagonalLine(
    context: CanvasRenderingContext2D,
    lineColor: string,
    lineWidth: number,
    size: number,
    lineCap: string | CanvasLineCap,
    width: number,
    height: number,
    factor: number
    ){
    try {
        context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;

    context.beginPath();
    context.moveTo(width, 0);
    context.lineTo(0, height);
    context.stroke();
    context.lineCap = lineCap as CanvasLineCap;
    let times = size/factor
    for(var i=0;i<times+2;i++){
        context.moveTo(width-(factor*i), 0);
        context.lineTo(-(factor*i), height);
        context.stroke();

        context.moveTo(width+(factor*i), 0);
        context.lineTo(+(factor*i), height);
        context.stroke();
    }
    } catch (error) {
        console.error("Error drawing backward diagonal line")
        console.error(error)
    }
    
    }

/**
 * Draws a forward diagonal line on a canvas.
 * @param {CanvasRenderingContext2D} context - The context of the canvas.
 * @param {string} lineColor - The color of the line.
 * @param {integer} lineWidth - The width of the line.
 * @param {integer} size - The size of the image.
 * @param {string} lineCap - The shape used to draw the end points of lines. Can be one of butt, round, or square. @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap CanvasRenderingContext2D.lineCap}
 * @param {integer} width - The width of the image.
 * @param {integer} height - The height of the image.
 * @param {integer} factor - The factor of the lines.
 * @private
 */
function canvasDrawForwardDiagonalLine(
    context: CanvasRenderingContext2D,
    lineColor: string,
    lineWidth: number,
    size: number,
    lineCap: string | CanvasLineCap,
    width: number,
    height: number,
    factor: number
    ){
    try {
        context.strokeStyle = lineColor;
        context.lineWidth = lineWidth;

        context.beginPath();
        context.moveTo(0, 0)
        context.lineTo(width, height);;
        context.stroke();
        context.lineCap = lineCap as CanvasLineCap;
        let times = size/factor
        for(var i=0;i<times+2;i++){
            context.moveTo(-(factor*i),0 );
            context.lineTo(width-(factor*i), height);
            context.stroke();

            context.moveTo(+(factor*i), 0);
            context.lineTo(width+(factor*i), height);
            context.stroke();
        }
    } catch (error) {
        console.error("Error drawing forward diagonal line")
        console.error(error)
    }
    
    }

/**
 * Draws horizontal and vertical lines on a canvas.
 * @param {CanvasRenderingContext2D} context - The context of the canvas.
 * @param {string} lineColor - The color of the line.
 * @param {integer} lineWidth - The width of the line.
 * @param {integer} size - The size of the image.
 * @param {string} lineCap - The shape used to draw the end points of lines. Can be one of butt, round, or square. @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap CanvasRenderingContext2D.lineCap}
 * @param {integer} width - The width of the image.
 * @param {integer} height - The height of the image.
 * @param {integer} factor - The factor of the lines.
 * @private
 */
function canvasDrawCross(
    context: CanvasRenderingContext2D,
    lineColor: string,
    lineWidth: number,
    size: number,
    lineCap: string | CanvasLineCap,
    width: number,
    height: number,
    factor: number
    ){
    try {
        context.strokeStyle = lineColor;
        context.lineWidth = lineWidth;
    
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(width, 0);
        context.stroke();
    
        context.moveTo(0, 0);
        context.lineTo(0, height);
        context.stroke();
    
        context.lineCap = lineCap as CanvasLineCap;
        let times = size/factor
        for(var i=0;i<times+2;i++){
            context.moveTo(0+(i*factor), 0);
            context.lineTo(0+(i*factor), height);
            context.stroke();
    
            context.moveTo(0, 0+(i*factor));
            context.lineTo(width, 0+(i*factor));
            context.stroke();
            } 
    } catch (error) {
        console.error("Error drawing cross line")
        console.error(error)
    }
    
    }

/**
 * Draws a horizontal line on a canvas.
 * @param {CanvasRenderingContext2D} context - The context of the canvas.
 * @param {string} lineColor - The color of the line.
 * @param {integer} lineWidth - The width of the line.
 * @param {integer} size - The size of the image.
 * @param {string} lineCap - The shape used to draw the end points of lines. Can be one of butt, round, or square. @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap CanvasRenderingContext2D.lineCap}
 * @param {integer} width - The width of the image.
 * @param {integer} factor - The factor of the lines.
 * @private
 */
function canvasDrawHorizontalLine(
    context: CanvasRenderingContext2D,
    lineColor: string,
    lineWidth: number,
    size: number,
    lineCap: string | CanvasLineCap,
    width: number,
    factor: number
    ){
    try {
        context.strokeStyle = lineColor;
        context.lineWidth = lineWidth;

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(width, 0);
        context.stroke();


        context.lineCap = lineCap as CanvasLineCap;
        let times = size/factor
        for(var i=0;i<times+2;i++){

            context.moveTo(0, 0+(i*factor));
            context.lineTo(width, 0+(i*factor));
            context.stroke();
            }
    } catch (error) {
        console.error("Error drawing horizontal line")
        console.error(error)
    }
    
    }

/**
 * Draws a vertical line on a canvas.
 * @param {CanvasRenderingContext2D} context - The context of the canvas.
 * @param {string} lineColor - The color of the line.
 * @param {integer} lineWidth - The width of the line.
 * @param {integer} size - The size of the image.
 * @param {string} lineCap - The shape used to draw the end points of lines. Can be one of butt, round, or square. @see {@link https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/lineCap CanvasRenderingContext2D.lineCap}
 * @param {integer} height - The height of the image.
 * @param {integer} factor - The factor of the lines.
 * @private
 */
function canvasDrawVerticalLine(
    context: CanvasRenderingContext2D,
    lineColor: string,
    lineWidth: number,
    size: number,
    lineCap: string | CanvasLineCap,
    height: number,
    factor: number
    ){
    try {
        context.strokeStyle = lineColor;
        context.lineWidth = lineWidth;

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, height);
        context.stroke();

        context.lineCap = lineCap as CanvasLineCap;
        let times = size/factor
        for(var i=0;i<times+2;i++){
            context.moveTo(0+(i*factor), 0);
            context.lineTo(0+(i*factor), height);
            context.stroke();

            }
    } catch (error) {
        console.error("Error drawing vertical line")
        console.error(error)
        
    }
    
    }
