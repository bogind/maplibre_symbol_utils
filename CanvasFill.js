/**
 * Options for the creation of the canvas fill image.
 * @typedef {Object} fillOptions
 * @property {string} [backGroundColor='rgba(0,0,0,0)'] - The background color of the image.
 * @property {integer} [size=512] - The size of the image.
 * @property {integer} [factor=16] - The factor of the lines.
 * @property {Array.<lineOptions>} lines - The lines to be drawn on the image.
 */

/**
 * @typedef {Object} lineOptions
 * @property {string} color - The color of the line.
 * @property {integer} [width=1] - The width of the line.
 * @property {lineType} type - The type of the line.
 */

/**
 * @typedef {(esriLineType|simpleLineType)} lineType
 */

/**
 * @typedef {('esriSFSBackwardDiagonal'|'esriSFSForwardDiagonal'|'esriSFSCross'|'esriSFSHorizontal'|'esriSFSVertical','esriSFSDiagonalCross')} esriLineType - Line types as defined by esri Simple Fill Symbols (SFS).
 * @see {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-symbols-SimpleFillSymbol.html#style esri Simple Fill Symbols (SFS)}
 */

/**
 * @typedef {(('ForwardSlash'|'/')|('Backslash'|'\')|('cross'|'+')|('Horizontal'|'-')|('Vertical'|'|'),'x')} simpleLineType - Simplified readable line types.
 */

/**
 * @param {string} sourceId - The id of the image source to be created.
 * @param {maplibre.Map} map - The map to add the image to.
 * @param {Object} fillOptions - The lines options.
 */
export default class canvasFill {
    constructor(sourceId, map, fillOptions){
        if (!sourceId || !map || !fillOptions) throw new Error('Source id, map and fillOptions must be supplied as the first three arguments.')

        this.sourceId = sourceId
        this._map = map
        this.fillOptions = fillOptions

        const canvasFillImage = createCanvasFillImage(fillOptions, this._map)
        map.addImage(sourceId, canvasFillImage, { pixelRatio: 2 });
    }

 
}

function createCanvasFillImage(params,map){
    params.backGroundColor = params.backGroundColor || 'rgba(0,0,0,0)';
    params.size = params.size || 512;
    params.factor = params.factor || 16;

    if(!params.lines) throw new Error('lines must be supplied as a parameter')
    if(!Array.isArray(params.lines)) throw new Error('lines must be an array')
    if(params.lines.length == 0) throw new Error('lines must have at least one line')

    params.lines = params.lines || [{color:'rgba(0,0,0,255)',type:'esriSFSBackwardDiagonal',width:1}];
    
    
    let symbol = {
        width: params.size,
        height: params.size,
        data: new Uint8Array(params.size * params.size * 4),

        // get rendering context for the map canvas when layer is added to the map
        onAdd: function () {
            
            let canvas = document.createElement('canvas')
            canvas.width = this.width;
            canvas.height = this.height;
            this.context = canvas.getContext('2d');
        },

        // called once before every frame where the icon will be used
        render: function () {
            var context = this.context;

            // draw outer circle
            context.clearRect(0, 0, this.width, this.height);

            context.fillStyle = params.backGroundColor;
            context.fillRect(0,0, this.width,this.height);

            for(let i=0;i<params.lines.length;i++){
                let line = params.lines[i]
                line.factor = line.factor || params.factor;
                line.size = line.size || params.size;
                if(line.type == 'esriSFSBackwardDiagonal'){
                    canvasDrawBackwardDiagonalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                }
                if(line.type == 'esriSFSForwardDiagonal'){
                    canvasDrawForwardDiagonalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                }
                if(line.type == 'esriSFSCross'){
                    canvasDrawHorizontalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                    canvasDrawVerticalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                }
                if(line.type == 'esriSFSHorizontal'){
                    canvasDrawHorizontalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                }
                if(line.type == 'esriSFSVertical'){
                    canvasDrawVerticalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                }
                if(line.type == 'esriSFSDiagonalCross'){
                    canvasDrawBackwardDiagonalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                    canvasDrawForwardDiagonalLine(context,line.color,line.width,line.size, this.width,this.height,line.factor)
                }
        
            }

            // update this image's data with data from the canvas
            this.data = context.getImageData(
                0,
                0,
                this.width,
                this.height
            ).data;

            // continuously repaint the map, resulting in the smooth animation of the dot
            map.triggerRepaint();

            // return `true` to let the map know that the image was updated
            return true;
        }
    }

    return symbol;

}


function canvasDrawBackwardDiagonalLine(context,lineColor,lineWidth,size,width,height,factor){

    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;

    context.beginPath();
    context.moveTo(width, 0);
    context.lineTo(0, height);
    context.stroke();
    context.lineCap = 'square';
    let times = size/factor
    for(var i=0;i<times+2;i++){
        context.moveTo(width-(factor*i), 0);
        context.lineTo(-(factor*i), height);
        context.stroke();

        context.moveTo(width+(factor*i), 0);
        context.lineTo(+(factor*i), height);
        context.stroke();
    }
    }


function canvasDrawForwardDiagonalLine(context,lineColor,lineWidth,size,width,height,factor){

    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;

    context.beginPath();
    context.moveTo(0, 0)
    context.lineTo(width, height);;
    context.stroke();
    context.lineCap = 'square';
    let times = size/factor
    for(var i=0;i<times+2;i++){
        context.moveTo(-(factor*i),0 );
        context.lineTo(width-(factor*i), height);
        context.stroke();

        context.moveTo(+(factor*i), 0);
        context.lineTo(width+(factor*i), height);
        context.stroke();
    }
    }


function canvasDrawCross(context,lineColor,lineWidth,size,width,height,factor){

    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, 0);
    context.stroke();

    context.moveTo(0, 0);
    context.lineTo(0, height);
    context.stroke();

    context.lineCap = 'square';
    let times = size/factor
    for(var i=0;i<times+2;i++){
        context.moveTo(0+(i*factor), 0);
        context.lineTo(0+(i*factor), height);
        context.stroke();

        context.moveTo(0, 0+(i*factor));
        context.lineTo(width, 0+(i*factor));
        context.stroke();
        }
    }


function canvasDrawHorizontalLine(context,lineColor,lineWidth,size,width,height,factor){

    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(width, 0);
    context.stroke();


    context.lineCap = 'square';
    let times = size/factor
    for(var i=0;i<times+2;i++){

        context.moveTo(0, 0+(i*factor));
        context.lineTo(width, 0+(i*factor));
        context.stroke();
        }
    }


function canvasDrawVerticalLine(context,lineColor,lineWidth,size,width,height,factor){

    context.strokeStyle = lineColor;
    context.lineWidth = lineWidth;

    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, height);
    context.stroke();

    context.lineCap = 'square';
    let times = size/factor
    for(var i=0;i<times+2;i++){
        context.moveTo(0+(i*factor), 0);
        context.lineTo(0+(i*factor), height);
        context.stroke();

        }
    }