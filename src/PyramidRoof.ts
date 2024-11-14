import {type Map as MapLibreMap, MercatorCoordinate, CustomLayerInterface, Point2D, Point} from 'maplibre-gl';
import { FilterSpecification, Feature, GeoJSONSource } from 'maplibre-gl';
import { StyleExpression, isExpression, Expression, createExpression } from '@maplibre/maplibre-gl-style-spec';
//import {VectorTileFeature} from '@mapbox/vector-tile';
import {mat3, vec3} from 'gl-matrix';


declare type RoofStrokeOptions = {
    color?: string;
    width?: number;
    opacity?: number;
}

// extend the Point type to include a z property
class Point3D extends Point {
    constructor(x: number, y: number, public z?: number) {
        super(x, y);
        this.z = z || 0;
    }
}


declare type mat4 =
| [number, number, number, number,
   number, number, number, number,
   number, number, number, number,
   number, number, number, number]
| Float32Array;

declare type RoofOptions = {
    id: string;
    source: string;
    sourceLayer?: string;
    filter?: FilterSpecification | null | undefined;
    color?: string;
    stroke?: RoofStrokeOptions;
    base?: number |  number[] | string[] | Expression | unknown;
    height?: number |  number[] | string[] | Expression | unknown;
    map?: MapLibreMap;

}

export class PyramidRoof implements CustomLayerInterface{

    id: string;
    type: 'custom' = 'custom';
    renderingMode: '3d' | '2d' | undefined = '3d';
    map?: MapLibreMap;
    filterFunction?: FilterSpecification | null | undefined;
    sourceName: string;
    sourceLayer?: string | undefined;
    color?: number[] | string;
    strokeColor?: number[] | string;
    strokeWidth?: number;
    strokeOpacity?: number;
    base?: number | unknown | StyleExpression | undefined;
    height?: number | unknown | StyleExpression | undefined;
    sidesProgram: WebGLProgram | null | undefined;
    edgesProgram: WebGLProgram | null | undefined;
    edges_aPos: number | undefined;
    buffers: { buffer: WebGLBuffer | null; indexBuffer: WebGLBuffer | null; vertexCount: number; }[] | undefined;
    source: GeoJSONSource | undefined;
    _data: GeoJSON.FeatureCollection |  undefined;
    sides_aPos: number | undefined;
    private _savedGLState: { currentArrayBuffer: any; currentElementArrayBuffer: any; currentProgram: any; currentDepthTest: any; currentDepthFunc: any; currentPolygonOffsetFill: any; currentPolygonOffsetFactor: any; currentPolygonOffsetUnits: any; currentLineWidth: any; } | undefined;
    gl: WebGLRenderingContext | undefined;
    renderedEdges: Set<any>;
    renderedSides: Set<any>;
    renderedOnce: boolean = false;

    constructor(params: RoofOptions) {
        this.id = params.id;
        this.sourceName = params.source;
        this.sourceLayer = params.sourceLayer ? params.sourceLayer : undefined;
        this.filterFunction = params.filter !== undefined ? params.filter : null;
        this.color = params.color;
        this.strokeColor = params.stroke?.color;
        this.strokeWidth = params.stroke?.width || 1;
        this.strokeOpacity = params.stroke?.opacity || 1;
        this.renderedEdges = new Set(); 
        this.renderedSides = new Set();
        
        // Accept only geojson sources
        this.checkSourceType(this.sourceName);
        
        if(isExpression(params.base)){
            let baseExpression = createExpression(params.base)
            if(baseExpression.result === 'error') {
                throw new Error('Invalid expression for base');
            }else{
                this.base = baseExpression.value;
            }
        }else{
            this.base = typeof params.base === 'string' || Array.isArray(params.base) ? createExpression(params.base) : Number(params.base);
        }
        if(isExpression(params.height)){
            let heightExpression = createExpression(params.height)
            if(heightExpression.result === 'error') {
                throw new Error('Invalid expression for height');
            }else{
                this.height = heightExpression.value;
            }
        }else{
            this.height = typeof params.height === 'string' || Array.isArray(params.height) ? createExpression(params.height) : Number(params.height);
        }
        
    }

    checkSourceType(sourceName: string) {
        if (!this.map) {
            return;
        }
        let source = this.map.getSource(sourceName);
        if (!source) {
            return;
        }
        if (source.type !== 'geojson') {
            throw new Error('Source type must be "geojson"');
        }
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
        let features: any[] = [];
        let options: any = {};
        if (this.map) {
            if (this.filterFunction) {
                const filter: FilterSpecification = this.filterFunction;
                options['filter'] = filter;
            } 
            if(this.sourceLayer){
                options['sourceLayer'] = this.sourceLayer;
            }
            features = this.map.querySourceFeatures(this.sourceName, options);
            if(features.length > 0){
                
            }
        }
        return features;
    }

    parseHeight(height: number | number[] | string[] | StyleExpression[] | string) {
        try {
            let heightExpression: StyleExpression = new StyleExpression(height as any);
            this.height = heightExpression;
        } catch (error) {
            
        }
    }

    isBoundaryEdge(p1: Point, p2: Point, EXTENT: number = 8192) {
        return (p1.x === p2.x && (p1.x < 0 || p1.x > EXTENT)) ||
            (p1.y === p2.y && (p1.y < 0 || p1.y > EXTENT));
    }
    
    isEntirelyOutside(ring: Point2D[], EXTENT: number = 8192) {
        return ring.every(p => p.x < 0) ||
            ring.every(p => p.x > EXTENT) ||
            ring.every(p => p.y < 0) ||
            ring.every(p => p.y > EXTENT);
    }

    addVertex(vertexArray: number[], x: number, y: number, z: number, nx: number, ny: number, nz: number, t: number, e: number){
        const FACTOR = Math.pow(2, 13);
        vertexArray.push(
            // a_pos
            x,
            y,
            z,
            // a_normal_ed: 3-component normal and 1-component edgedistance
            Math.floor(nx * FACTOR) * 2 + t,
            ny * FACTOR * 2,
            nz * FACTOR * 2,
            // edgedistance (used for wrapping patterns around extrusion sides)
            Math.round(e)
        )
    }

    getVerticesFromCoordinates(coords: number[][], height: number, base: number) {
        let vertices: number[] = [];
        let center: number[] = [];

        let Xmax = Math.max(...coords.map((o: number[]) => o[0]));
        let Ymax = Math.max(...coords.map((o: number[]) => o[1]));
        let Xmin = Math.min(...coords.map((o: number[]) => o[0]));
        let Ymin = Math.min(...coords.map((o: number[]) => o[1]));
        let Xmid = (Xmax + Xmin) / 2;
        let Ymid = (Ymax + Ymin) / 2;

        center = [Xmid, Ymid, height] as number[];

        

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

    }

    getVerticesFromRings(ring: Point3D[], height: number, base: number) {
        try {
            let vertices: number[] = [];
            let center: number[] = [];
    
            let Xmax = Math.max(...ring.map((o: Point3D) => o.x));
            let Ymax = Math.max(...ring.map((o: Point3D) => o.y));
            let Xmin = Math.min(...ring.map((o: Point3D) => o.x));
            let Ymin = Math.min(...ring.map((o: Point3D) => o.y));
            let Xmid = (Xmax + Xmin) / 2;
            let Ymid = (Ymax + Ymin) / 2;
    
            center = [Xmid, Ymid, height] as number[];
            if(center.every(c => isNaN(c))) {
                return [];
            }
    
            // Add the center point first
            let mercatorCenter = MercatorCoordinate.fromLngLat(
                { 'lng': center[0], 'lat': center[1] } as { lng: number, lat: number },
                center[2] as number);
    
            vertices.push(mercatorCenter.x);
            vertices.push(mercatorCenter.y);
            vertices.push(mercatorCenter.z);
    
            for(let point of ring){
                let mercatorPoint = MercatorCoordinate.fromLngLat(
                    {'lng': point.x, 'lat': point.y}, base
                );
                vertices.push(mercatorPoint.x);
                vertices.push(mercatorPoint.y);
                vertices.push(mercatorPoint.z);
    
            }
    
            return vertices
            
        } catch (error) {
            console.error('Error in getVerticesFromRings', error);
            console.log(ring);
        }
 
    }

    getMLVerticesFromRings(ring: Point3D[], height: number, base: number) {
        let vertices: number[] = [];
        let indices: number[] = [];
        let center: number[] = [];

        
        
        
        
        if (ring.length === 0) {
            return vertices;
        }
        /*if (this.isEntirelyOutside(ring)) {
            return vertices;
        }*/

        let Xmax = Math.max(...ring.map((o: Point3D) => o.x));
        let Ymax = Math.max(...ring.map((o: Point3D) => o.y));
        let Xmin = Math.min(...ring.map((o: Point3D) => o.x));
        let Ymin = Math.min(...ring.map((o: Point3D) => o.y));
        let Xmid = (Xmax + Xmin) / 2;
        let Ymid = (Ymax + Ymin) / 2;

        center = [Xmid, Ymid, height] as number[];

        // Add the center point first
        let mercatorCenter = MercatorCoordinate.fromLngLat(
            { 'lng': center[0], 'lat': center[1] } as { lng: number, lat: number },
            center[2] as number);
        console.log('Center', mercatorCenter);
        ring.unshift(new Point3D(center[0], center[1], center[2] as number));

        /*
        vertices.push(mercatorCenter.x);
        vertices.push(mercatorCenter.y);
        vertices.push(mercatorCenter.z);
        */


        let edgeDistance = 0;

        for (let p = 0; p < ring.length; p++) {
            let p1 = ring[p];
            /*if (p === 0) {
                p1 = new Point3D(mercatorCenter.x, mercatorCenter.y, mercatorCenter.z);
                
            }else{*/
                let c1 = MercatorCoordinate.fromLngLat(
                    { 'lng': p1.x, 'lat': p1.y } as { lng: number, lat: number },
                    p1.z || base as number
                )
                p1 = new Point3D(c1.x, c1.y, c1.z);
            //}

            
            if (p >= 1) {
                let p2 = ring[p - 1];
                let c2 = MercatorCoordinate.fromLngLat(
                    { 'lng': p2.x, 'lat': p2.y } as { lng: number, lat: number },
                    p2.z || base as number
                )
                p2 = new Point3D(c2.x, c2.y, c2.z);
                
                if (!this.isBoundaryEdge(p1, p2)) {
                    const perp = p1.sub(p2)._perp()._unit();
                    const dist = p2.dist(p1);
                    
                    let zValue = p1.z || base;

                    if (edgeDistance + dist > 32768) edgeDistance = 0;
                    this.addVertex(vertices, p1.x, p1.y, zValue, perp.x, perp.y, 0, 0, edgeDistance);
                    this.addVertex(vertices, p2.x, p2.y, zValue, perp.x, perp.y, 0, 1, edgeDistance);

                    edgeDistance += dist;

                    this.addVertex(vertices, p1.x, p1.y, zValue, perp.x, perp.y, 0, 0, edgeDistance);
                    this.addVertex(vertices, p2.x, p2.y, zValue, perp.x, perp.y, 0, 1, edgeDistance);

                    indices.push(0, 2, 1);
                    indices.push(1, 2, 3);

                }
            }
        }
        
        return {vertices, indices};

    }

    getVerticesForPolygon(polygon: number[][], height: number, base: number, feature?: Feature|GeoJSON.Feature) {
        
        let coords: number[][] = polygon;
        let rings : Point3D[][] = [];
        
        
        if(feature){
            if(feature.geometry && "coordinates" in feature.geometry){
                let coordinates = feature.geometry.coordinates
                    for(let ring  of coordinates){
                        if(Array.isArray(ring)){
                            let points: Point3D[] = [];
                            for(let point of ring){
                                if(Array.isArray(point) && typeof point[0] === 'number' && typeof point[1] === 'number'){
                                    let zValue = point[2] || base;
                                    points.push(new Point3D(point[0], point[1], zValue as number));
                                }
                            }
                            rings.push(points);
                        }
                    }
                for(let ring of rings){
                    if(ring.length > 0 && ring.every(p => {
                        return !isNaN(p.x) && !isNaN(p.y);
                    })){
                        return this.getVerticesFromRings(ring, height, base);
                    }else{
                        return []
                    }
                    
                }
            }
        }else{
            return this.getVerticesFromCoordinates(coords, height, base);
        }
        
        
        

    }

    // Add a check that the geometry type is Polygon or MultiPolygon

    getVerticesForFeature(feature: Feature | GeoJSON.Feature) {
        try {
            
            let geometry: any;
            let coords: number[][] = [];
            let height;
            let base;

            // @ts-ignore
            if (!feature.geometry || ((feature.type !== 'Polygon' && feature.type !== 'MultiPolygon') && (feature.geometry.type && (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')))) {
                console.log('Invalid feature: Feature must be a Polygon or MultiPolygon')
                console.log(feature);
                throw new Error('Invalid feature: Feature must be a Polygon or MultiPolygon');
            }

            if (feature.geometry) {
                geometry = feature.geometry;
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
            
            if(geometry.type === 'Polygon') {
                coords = geometry.coordinates[0];
                return this.getVerticesForPolygon(coords, height as number, base as number, feature as Feature);
            }
            if(geometry.type === 'MultiPolygon') {
                for(let polygon of geometry.coordinates) {
                    coords = polygon[0];
                    return this.getVerticesForPolygon(coords, height as number, base as number, feature as Feature);
                }
                
            }
            
        } catch (error) {
            console.error('Error in getVerticesForFeature', error);
        }
        


    }

    createSidesFragmentSource(color: number[]) {
        return `#version 300 es
        precision highp float;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]});
        }`;
    }

    createSidesVertexSource(color: number[]) {
        return `#version 300 es
        uniform mat4 u_matrix;
        in vec3 a_pos;
        out vec4 v_color;
        void main() {

            gl_Position = u_matrix * vec4(a_pos, 1.0);
            v_color = vec4(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]});
        }`
    }

    createMLSidesVertexSource(color: number[]) {
        return `#version 300 es
        uniform mat4 u_matrix;
        uniform vec3 u_lightcolor;
        uniform lowp vec3 u_lightpos;
        uniform lowp float u_lightintensity;
        uniform float u_vertical_gradient;
        uniform lowp float u_opacity;
        uniform vec4 u_color;
        
        
        in vec3 a_pos;
        in vec3 a_normal;
        in float a_edgedist;
        
        out vec4 v_color;
        
        void main() {
            float base = 0.0;
            float height = a_pos.z;
            float edgedist = a_edgedist;
            
            vec4 color = vec4(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]});
        
            vec3 normal = a_normal;
        
            
            float height_terrain3d_offset = 0.0;
            float base_terrain3d_offset = 0.0;
            
            // Sub-terranian "floors and ceilings" are clamped to ground-level.
            // 3D Terrain offsets, if applicable, are applied on the result.
            base = max(0.0, base) + base_terrain3d_offset;
            height = max(0.0, height) + height_terrain3d_offset;
        
            float t = mod(normal.x, 2.0);
        
            gl_Position = u_matrix * vec4(a_pos.x, a_pos.y , t > 0.0 ? height : base, 1);
        
            // Relative luminance (how dark/bright is the surface color?)
            float colorvalue = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
        
            v_color = vec4(0.0, 0.0, 0.0, 1.0);
        
            // Add slight ambient lighting so no extrusions are totally black
            vec4 ambientlight = vec4(0.03, 0.03, 0.03, 1.0);
            color += ambientlight;
        
            // Calculate cos(theta), where theta is the angle between surface normal and diffuse light ray
            float directional = clamp(dot(normal / 16384.0, u_lightpos), 0.0, 1.0);
        
            // Adjust directional so that
            // the range of values for highlight/shading is narrower
            // with lower light intensity
            // and with lighter/brighter surface colors
            directional = mix((1.0 - u_lightintensity), max((1.0 - colorvalue + u_lightintensity), 1.0), directional);
        
            // Add gradient along z axis of side surfaces
            if (normal.y != 0.0) {
                // This avoids another branching statement, but multiplies by a constant of 0.84 if no vertical gradient,
                // and otherwise calculates the gradient based on base + height
                directional *= (
                    (1.0 - u_vertical_gradient) +
                    (u_vertical_gradient * clamp((t + base) * pow(height / 150.0, 0.5), mix(0.7, 0.98, 1.0 - u_lightintensity), 1.0)));
            }
        
            // Assign final color based on surface + ambient light color, diffuse light directional, and light color
            // with lower bounds adjusted to hue of light
            // so that shading is tinted with the complementary (opposite) color to the light color
            v_color.r += clamp(color.r * directional * u_lightcolor.r, mix(0.0, 0.3, 1.0 - u_lightcolor.r), 1.0);
            v_color.g += clamp(color.g * directional * u_lightcolor.g, mix(0.0, 0.3, 1.0 - u_lightcolor.g), 1.0);
            v_color.b += clamp(color.b * directional * u_lightcolor.b, mix(0.0, 0.3, 1.0 - u_lightcolor.b), 1.0);
            v_color *= u_opacity;
        }
        `;
    }

    createSidesProgram(gl: WebGLRenderingContext){
        try {
            this.sidesProgram = gl.createProgram();

            let sidesColor: string | number[] = [0, 0, 0, 1]; 
            if (this.color) {
                sidesColor = this.parseColor(this.color) as number[];
            }
            // Create GLSL source for vertex shader
            let sidesVertexSource = this.createSidesVertexSource(sidesColor);
            // Create GLSL source for fragment shader
            let sidesFragmentSource = this.createSidesFragmentSource(sidesColor);

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

            if (!this.sidesProgram) {
                return;
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

    update(event?: any){
        if(!this.map || !this.source) {
            return;
        }
        if(event){
            if (event.sourceId !== this.sourceName || event.isSourceLoaded === false) {
                return;
              }
              console.log('Event', event);
        }
        
        if (!this.source.loaded()) {
            return;
        }
       
        
        
        
        this._data = {
            type: 'FeatureCollection',
            features: this.filterFeatures() ?? []
        };
        if(this._data.features.length < 1){
            return;
        }
        
        this._data?.features.forEach(feature => {
            if (!feature.geometry || (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon')) {
                return;
            }

            let vertices: number[] | undefined;
            let indices: number[] = [];
            vertices = this.getVerticesForFeature(feature as unknown as Feature);
            
            if (!vertices) {
                return;
            }
            if (vertices.length < 3) {
                return;
            }
            if(!this.gl || this.gl === undefined){
                return;
            }
            let buffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);

            // Create an index buffer
            
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
            
            let indexBuffer = this.gl.createBuffer();
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
            if (this.buffers) {
                this.buffers.push({ buffer: buffer, indexBuffer: indexBuffer, vertexCount: vertexCount });
            }
        });
        //this.map.triggerRepaint()
    }
    removeItem(item: any) {
        //throw new Error('Method not implemented.');
    }

    onAdd(map: MapLibreMap, gl: WebGLRenderingContext) {
        this.map = map;
        this.map.on('sourcedata', this.update.bind(this));
        this.gl = gl;
        this.createSidesProgram(gl);
        this.createEdgesProgram(gl)
        this.source = this.map.getSource(this.sourceName) as GeoJSONSource;
        console.log(this.source);
        this.buffers = [];
        // ignore the typescript error, as the method is available in the source
        // @ts-ignore
        //this.source.getData()
        this.update()
        
    }

    renderSides(gl: WebGLRenderingContext, matrix: mat4, map: MapLibreMap) {
        if (!this.sidesProgram) {
            return;
        }
        // Remove previously rendered items
        for (let item of this.renderedSides) {
            this.removeItem(item);
        }
        // Get needed values for uniforms
        const light = map.style.light;
        const _lp = light.properties.get('position');
        const lightPos = [_lp.x, _lp.y, _lp.z] as vec3;
        const lightMat = mat3.create();
        if (light.properties.get('anchor') === 'viewport') {
            mat3.fromRotation(lightMat, -map.transform.angle );
        }
        vec3.transformMat3(lightPos, lightPos, lightMat);
        const lightIntensity = light.properties.get('intensity');
        
        const lightColor = light.properties.get('color');
        let verticalGradient = 1;
        let opacity = 1;

        // Set up the sides program
        this.renderedSides.clear();
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        //gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.0, 1.0);
        //gl.depthRange(0.2, 0.6);
        
    
        gl.useProgram(this.sidesProgram);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.sidesProgram, 'u_matrix'),
            false,
            matrix
        );
        gl.uniform3fv(
            gl.getUniformLocation(this.sidesProgram, 'u_lightcolor'),
            [lightColor.r, lightColor.g, lightColor.b]
        );
        gl.uniform3fv(
            gl.getUniformLocation(this.sidesProgram, 'u_lightpos'),
            lightPos
        );
        gl.uniform1f(
            gl.getUniformLocation(this.sidesProgram, 'u_lightintensity'),
            lightIntensity
        );
        gl.uniform1f(
            gl.getUniformLocation(this.sidesProgram, 'u_vertical_gradient'),
            verticalGradient
        );
        gl.uniform1f(
            gl.getUniformLocation(this.sidesProgram, 'u_opacity'),
            opacity
        );

        
        if(!this.buffers) {
            return;
        }
        for(let item of this.buffers) {
            gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);

            // Get attribute locations
            let aPos = gl.getAttribLocation(this.sidesProgram, 'a_pos');          
    
            // Set up position attribute
            if (aPos !== -1) {
                gl.enableVertexAttribArray(aPos);
                gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
            }

            gl.drawArrays(gl.TRIANGLE_FAN, 0, item.vertexCount);
            this.renderedSides.add(item);
        }
        gl.disable(gl.DEPTH_TEST);
        
        gl.disable(gl.POLYGON_OFFSET_FILL);
        
        
    }

    renderEdges(gl: WebGLRenderingContext, matrix: mat4) {
        if (!this.edgesProgram) {
            return;
        }
        gl.useProgram(this.edgesProgram);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.edgesProgram, 'u_matrix'),
            false,
            matrix
        );
    
        // Set the line width
        gl.lineWidth(this.strokeWidth ?? 1);
    
        // Draw the edges
        if(!this.buffers) {
            return;
        }
        for(let item of this.buffers) {
            gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, item.indexBuffer);
            if(this.edges_aPos === undefined) {
                return;
            }
            gl.enableVertexAttribArray(this.edges_aPos);
            gl.vertexAttribPointer(this.edges_aPos, 3, gl.FLOAT, false, 0, 0);
            gl.drawElements(gl.LINES, item.vertexCount * 2 - 2, gl.UNSIGNED_SHORT, 0);
            this.renderedEdges.add(item);
        }
    }

    private saveGLState(gl: WebGLRenderingContext) {
        // Save the current WebGL state
        let currentArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
        let currentElementArrayBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
        let currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        let currentDepthTest = gl.getParameter(gl.DEPTH_TEST);
        let currentDepthFunc = gl.getParameter(gl.DEPTH_FUNC);
        let currentPolygonOffsetFill = gl.getParameter(gl.POLYGON_OFFSET_FILL);
        let currentPolygonOffsetFactor = gl.getParameter(gl.POLYGON_OFFSET_FACTOR);
        let currentPolygonOffsetUnits = gl.getParameter(gl.POLYGON_OFFSET_UNITS);
        let currentLineWidth = gl.getParameter(gl.LINE_WIDTH);
        
        this._savedGLState = {
            currentArrayBuffer,
            currentElementArrayBuffer,
            currentProgram,
            currentDepthTest,
            currentDepthFunc,
            currentPolygonOffsetFill,
            currentPolygonOffsetFactor,
            currentPolygonOffsetUnits,
            currentLineWidth
        };
    }

    private restoreGLState(gl: WebGLRenderingContext) {
        if(!this._savedGLState) {
            return;
        }
        // Restore the saved WebGL state
        gl.bindBuffer(gl.ARRAY_BUFFER, this._savedGLState.currentArrayBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this._savedGLState.currentElementArrayBuffer);
        gl.useProgram(this._savedGLState.currentProgram);
        if(this._savedGLState.currentDepthTest) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
        gl.depthFunc(this._savedGLState.currentDepthFunc);
        if(this._savedGLState.currentPolygonOffsetFill) {
            gl.enable(gl.POLYGON_OFFSET_FILL);
        } else {
            gl.disable(gl.POLYGON_OFFSET_FILL);
        }
        gl.polygonOffset(this._savedGLState.currentPolygonOffsetFactor, this._savedGLState.currentPolygonOffsetUnits);
        gl.lineWidth(this._savedGLState.currentLineWidth);
    }


    onRemove() {
        console.log('PyramidRoof.onRemove');
    }

    render(gl: WebGLRenderingContext, matrix: mat4) {
        if (!this.map) {
            return;
        }
        this.update();
        // Save the current WebGL state
        this.saveGLState(gl);
        //gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

        // First pass: render the sides with depth testing enabled
        //gl.enable(gl.DEPTH_TEST);
        //gl.depthFunc(gl.LESS);
        //gl.depthFunc(gl.LEQUAL);
        //gl.enable(gl.POLYGON_OFFSET_FILL);
        //gl.polygonOffset(-1.0, 1.0);
        //gl.depthRange(0.2, 0.6);
        
        this.renderSides(gl, matrix, this.map);

        // Second pass: render the edges with depth testing enabled, but only where the depth is greater
        //gl.disable(gl.DEPTH_TEST);
        //gl.disable(gl.POLYGON_OFFSET_FILL);
        
        this.renderEdges(gl, matrix);

        // Restore the saved WebGL state
        this.restoreGLState(gl);
        

    }
}

export default PyramidRoof;