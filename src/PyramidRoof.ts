import {type Map as MapLibreMap, MercatorCoordinate} from 'maplibre-gl';
import { FilterSpecification, Feature, GeoJSONSource } from 'maplibre-gl';

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
    sidesProgram: WebGLProgram | null | undefined;
    edgesProgram: WebGLProgram | null | undefined;
    edges_aPos: number | undefined;
    buffers: { buffer: WebGLBuffer | null; indexBuffer: WebGLBuffer | null; vertexCount: number; }[] | undefined;
    source: GeoJSONSource | undefined;
    _data: GeoJSON.FeatureCollection |  undefined;

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

    // Add a check that the geometry type is Polygon or MultiPolygon

    getVerticesForFeature(feature: Feature) {
        try {
            let vertices: number[] = [];
            let geometry: any;
            let coords: number[][] = [];
            let center;
            let height;
            let base;

            if (!feature.geometry || (feature.type !== 'Polygon' && feature.type !== 'MultiPolygon')) {
                throw new Error('Invalid feature: Feature must be a Polygon or MultiPolygon');
            }

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

    createSidesProgram(gl: WebGLRenderingContext){
        try {
            this.sidesProgram = gl.createProgram();

            // Create GLSL source for vertex shader
            let sidesVertexSource = `#version 300 es
            uniform mat4 u_matrix;
            in vec3 a_pos;
            void main() {
                gl_Position = u_matrix * vec4(a_pos, 1.0);
            }`;

            // Create GLSL source for fragment shader
            let sidesColor: string | number[] = [0, 0, 0, 1]; 
            if (this.color) {
                sidesColor = this.parseColor(this.color) as number[];
            }

            let sidesFragmentSource = `#version 300 es
            precision highp float;
            out vec4 fragColor;
            void main() {
                fragColor = vec4(${sidesColor[0]}, ${sidesColor[1]}, ${sidesColor[2]}, ${sidesColor[3]});
            }`;

            // Create a vertex shader
            const sidesVertexShader = gl.createShader(gl.VERTEX_SHADER);
            if (sidesVertexShader) {
                gl.shaderSource(sidesVertexShader, sidesVertexSource);
                gl.compileShader(sidesVertexShader);
            }

            // Create a fragment shader
            const sidesFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            if (sidesFragmentShader) {
                gl.shaderSource(sidesFragmentShader, sidesFragmentSource);
                gl.compileShader(sidesFragmentShader);
            }

            // Link the two shaders into a WebGL program
            if (sidesVertexShader && sidesFragmentShader) {
                if (this.sidesProgram) {
                    gl.attachShader(this.sidesProgram, sidesVertexShader);
                    gl.attachShader(this.sidesProgram, sidesFragmentShader);
                    gl.linkProgram(this.sidesProgram);
                }
            }
            
        } catch (error) {
            console.error('Error in createSidesProgram', error);
        }
        
    }

    createEdgesProgram(gl: WebGLRenderingContext) {
        try {
            this.edgesProgram = gl.createProgram();

            // Create GLSL source for vertex shader
            let edgesVertexSource = `#version 300 es
            uniform mat4 u_matrix;
            in vec3 a_pos;
            void main() {
                gl_Position = u_matrix * vec4(a_pos, 1.0);
            }`;

            // Create GLSL source for fragment shader
            let edgesColor : string | number[] = [0, 0, 0, 1]; 
            if (this.strokeColor) {
                edgesColor = this.parseColor(this.strokeColor) as number[];
            }
            
            let edgesFragmentSource = `#version 300 es
            precision highp float;
            out vec4 fragColor;
            void main() {
                fragColor = vec4(${edgesColor[0]}, ${edgesColor[1]}, ${edgesColor[2]}, ${edgesColor[3]});
            }`;

            // Create a vertex shader
            const edgesVertexShader = gl.createShader(gl.VERTEX_SHADER);
            if(edgesVertexShader){
                gl.shaderSource(edgesVertexShader, edgesVertexSource);
                gl.compileShader(edgesVertexShader);
            }else{
                return;
            }
            

            // Create a fragment shader
            const edgesFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            if(edgesFragmentShader){
                gl.shaderSource(edgesFragmentShader, edgesFragmentSource);
                gl.compileShader(edgesFragmentShader);
            }else{
                return;
            }
            

            // Link the two shaders into a WebGL program
            if(this.edgesProgram){
                gl.attachShader(this.edgesProgram, edgesVertexShader);
                gl.attachShader(this.edgesProgram, edgesFragmentShader);
                gl.linkProgram(this.edgesProgram);

                this.edges_aPos = gl.getAttribLocation(this.edgesProgram, 'a_pos');
            }
            
            
        } catch (error) {
            console.error('Error in createEdgesProgram', error);
        }
        
    }

    onAdd(map: MapLibreMap, gl: WebGLRenderingContext) {
        this.map = map;
        console.log('PyramidRoof.onAdd');

        this.createSidesProgram(gl);
        this.source = this.map.getSource(this.sourceName) as GeoJSONSource;

        this.buffers = [];
        // ignore the typescript error, as the method is available in the source
        // @ts-ignore
        this.source.getData()
        .then((data: any) => {
            this._data = data;
            if(this.filterFunction) {
                if(this._data && this._data.type === 'FeatureCollection' && this._data.features) {
                    this._data.features = this.filterFeatures() ?? [];
                } else {
                    this._data = {type: 'FeatureCollection', features: []};
                }
            }
            if(!this._data || !this._data.features || this._data.features.length === 0) {
                return;
            }
        })
        .then(() => {
            if(this._data && this._data.features && this._data.features.length > 0){
                this._data.features.forEach(feature => {
                    if (!feature.geometry || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) {
                        return;
                    }
                    
                    let vertices: number[] = [];
                    vertices = this.getVerticesForFeature(feature as unknown as Feature) as number[]; 
                    let buffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

                    // Create an index buffer
                    let indices = [];
                    let vertexCount = vertices.length / 3;
                    for(let i = 1; i < vertexCount; i++) {
                        // Connect the center vertex to each perimeter vertex
                        indices.push(0, i);
                    }
                    for(let i = 1; i < vertexCount; i++) {
                        // Connect each perimeter vertex to the next
                        indices.push(i, ((i % (vertexCount - 1)) + 1) % vertexCount);
                    }
                    indices.push(vertexCount - 1, 1); // Connect the last vertex to the first
    
                    for(let i = 1; i < vertexCount; i++) {
                        // Connect each base vertex to the next, wrapping around to the first
                        indices.push(i, (i % (vertexCount - 1)) + 1);
                    }
                    indices.push(vertexCount - 1, 1); // Connect the last base vertex to the first
                 
                    let indexBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
                    if (this.buffers) {
                        this.buffers.push({ buffer: buffer, indexBuffer: indexBuffer, vertexCount: vertices.length / 3 });
                    }
                });
            }
            
        });
        
    }

    render(gl: WebGLRenderingContext, matrix: Float32Array) {
        console.log('PyramidRoof.render');
    }
}