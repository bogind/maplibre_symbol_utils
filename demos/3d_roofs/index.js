mat4 = glMatrix.mat4;
const {addMarkerImageToMap, canvasFill, PyramidRoof} = maplibre_symbol_utils;


let style = {
    'version': 8,
    'sources': {
    'raster-tiles': {
        'type': 'raster',
        'tiles': ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        'tileSize': 256,
        'attribution':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        'maximumZoom': 19
    },
    "25_day_1": {
        "type": "geojson",
        "data": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"
    },
    "floorplan":{
        "type": "geojson",
        "data": "https://maplibre.org/maplibre-gl-js/docs/assets/indoor-3d-map.geojson"
    },
    "buildings": {
        "type": "geojson",
        "data": "./venice_buildings_2.geojson",
        "generateId": true
    }
    },
    'layers': [
            {
                'id': 'simple-tiles',
                'type': 'raster',
                'source': 'raster-tiles',
                'minzoom': 0,
                'maxzoom': 19
            },
            {
                'id': 'buildings',
                'type': 'fill',
                'source': 'buildings',
                'paint': {
                    'fill-color': ["coalesce", ["get", "building:colour"],'#d3d3d3'],
                    'fill-opacity': 0.6
                }
            },
            {
                'id': 'buildings-extrusion',
                'type': 'fill-extrusion',
                'source': 'buildings',
                //'filter': ['!=', 'roof:shape', 'pyramidal'],
                'paint': {
                    'fill-extrusion-color': ["coalesce", ["get", "building:colour"],'#d3d3d3'],
                    'fill-extrusion-opacity': 0.8,
                    'fill-extrusion-base': ["coalesce", ["get", 'min_height'], 0],
                    'fill-extrusion-height': ["coalesce", ["get", 'height'], 0],
                }
            },
            {
                'id': 'buildings-extrusion-pyramids',
                'type': 'fill-extrusion',
                'source': 'buildings',
                //'filter': ['==', 'roof:shape', 'pyramidal'],
                'filter': ['==','full_id', 'w813478300'],
                'paint': {
                    'fill-extrusion-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        'rgb(0, 238, 255)',
                        "rgb(40, 40, 120)"
                        
                    ],
                    'fill-extrusion-opacity': 0.3,
                    'fill-extrusion-base': ["coalesce", ["get", 'min_height'], 0],
                    'fill-extrusion-height': ["coalesce", ["get", 'height'], 0],
                }
            },
            {
                'id': 'room-extrusion',
                'type': 'fill-extrusion',
                'source': 'floorplan',
                'paint': {
                    // See the MapLibre Style Specification for details on data expressions.
                    // https://maplibre.org/maplibre-style-spec/expressions/
    
                    // Get the fill-extrusion-color from the source 'color' property.
                    'fill-extrusion-color': ['get', 'color'],
    
                    // Get fill-extrusion-height from the source 'height' property.
                    'fill-extrusion-height': ['get', 'height'],
    
                    // Get fill-extrusion-base from the source 'base_height' property.
                    'fill-extrusion-base': ['get', 'base_height'],
    
                    // Make extrusions slightly opaque for see through indoor walls.
                    'fill-extrusion-opacity': 0.5
                }
            }
        ]
    }

const map = new maplibregl.Map({
    container: 'map',
    zoom: 17,
    center: [12.32942,45.43257],
    //bearing: 155.19999999999936 ,
    //pitch: 60,
    style: style,//'https://demotiles.maplibre.org/style.json',
    antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
});

map.on('click', (e) => {
    const features = map.queryRenderedFeatures(e.point);
    console.log(features);
})

map.on('mousemove', 'buildings-extrusion-pyramids', (e) => {
    if (e.features.length > 0) {
        if (hoveredStateId) {
            map.setFeatureState(
                {source: 'buildings', id: hoveredStateId},
                {hover: false}
            );
        }
        hoveredStateId = e.features[0].id;
        map.setFeatureState(
            {source: 'buildings', id: hoveredStateId},
            {hover: true}
        );
    }
});

map.on('mouseleave', 'buildings-extrusion-pyramids', () => {
    if (hoveredStateId) {
        map.setFeatureState(
            {source: 'buildings', id: hoveredStateId},
            {hover: false}
        );
    }
    hoveredStateId = null;
});

const translation = [-0.5, -0.5, -0.5];
let hoveredStateId = null;


// create a custom style layer to implement the WebGL content
const highlightLayer = {
    id: 'highlight',
    type: 'custom',
    renderingMode: '3d',
    
    // method called when the layer is added to the map
    // Search for StyleImageInterface in https://maplibre.org/maplibre-gl-js/docs/API/
    onAdd (map, gl) {
        
    // create GLSL source for vertex shader
        const vertexSource = `#version 300 es
        uniform mat4 u_matrix;
        in vec3 a_pos;
        void main() {
            gl_Position = u_matrix * vec4(a_pos, 1.0);
        }`;
        
        // create GLSL source for fragment shader

        const fragmentSource = `#version 300 es
        precision highp float;
        out vec4 fragColor;

        void main() {
            fragColor = vec4(1.0, 0.2, 0.2, 0.5);
        }`;

        // create a vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);

        // create a fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
        

        // link the two shaders into a WebGL program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        

        this.aPos = gl.getAttribLocation(this.program, 'a_pos');

        // define vertices of the triangle to be rendered in the custom style layer
        const helsinki = maplibregl.MercatorCoordinate.fromLngLat({
            lng: 25.004,
            lat: 60.239
        },0);
        const berlin = maplibregl.MercatorCoordinate.fromLngLat({
            lng: 13.403,
            lat: 52.562
        },2000);
        const kyiv = maplibregl.MercatorCoordinate.fromLngLat({
            lng: 30.498,
            lat: 50.541
        },0);
        
        let coords =  [
            [
              -87.6184236771226,
              41.86672303051205,
              60
            ],
            [
              -87.6184236771226,
              41.86570059008275,
                50
            ],
            [
              -87.6163378030446,
              41.86570059008275,
                80
            ],
            [
              -87.6163378030446,
              41.86672303051205,
                50

            ]
          ]

        let Xmax = Math.max(...coords.map(o => o[0])) 
        let Ymax = Math.max(...coords.map(o => o[1])) 
        let Xmin = Math.min(...coords.map(o => o[0]))
        let Ymin = Math.min(...coords.map(o => o[1]))
        let Xmid = (Xmax + Xmin) / 2
        let Ymid = (Ymax + Ymin) / 2

        let center = [Xmid, Ymid, 100]
        coords.push(center)

        

        

        let vertices = [];
        for (let i = 0; i < coords.length; i++) {
            const coord = coords[i];
            const mercatorCoord = maplibregl.MercatorCoordinate.fromLngLat({
                lng: coord[0],
                lat: coord[1]
            }, coord[2]);
            vertices.push(mercatorCoord.x);
            vertices.push(mercatorCoord.y);
            vertices.push(mercatorCoord.z);
        }

        console.log(helsinki, berlin, kyiv);
        console.log(vertices);
        
        // create and initialize a WebGLBuffer to store vertex and color data
        this.buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.bufferData(
            gl.ARRAY_BUFFER,
            /*
            new Float32Array([
                helsinki.x,helsinki.y,helsinki.z,
                berlin.x,berlin.y,berlin.z,
                kyiv.x,kyiv.y,kyiv.z
            ]),*/
            new Float32Array(vertices),
            gl.STATIC_DRAW
        );

        this.coords = coords;

  
        
        
        
    },

    // method fired on each animation frame
    /*render (gl, matrix) {
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.program, 'u_matrix'),
            false,
            matrix
        );
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.aPos);
        gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, this.coords.length);

        // Create an index buffer.
        this.indexBuffer = gl.createBuffer();

        // Bind the index buffer.
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Fill the index buffer with data.
        const indices = new Uint16Array([
            4, 0, 1,
            4, 1, 2,
            4, 2, 3,
            4, 3, 0
        ]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        // Now you can call gl.drawElements.
        for (let i = 0; i < 4; i++) {
            gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, i * 3 * 2);
        }
        
    }*/
    render(gl, matrix) {
        
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.program, 'u_matrix'),
            false,
            matrix
        );
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.aPos);
        gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
        gl.enable(gl.BLEND);
        gl.enable(gl.DEPTH_TEST);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, 6);

        // Create an index buffer.
        this.indexBuffer = gl.createBuffer();

        // Bind the index buffer.
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

        // Fill the index buffer with data.
        const indices = new Uint16Array([
            4, 0, 1,
            4, 1, 2,
            4, 2, 3,
            4, 3, 0
        ]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

        // Now you can call gl.drawElements.
        for (let i = 0; i < 4; i++) {
            gl.drawElements(gl.TRIANGLES, 3, gl.UNSIGNED_SHORT, i * 3 * 2);
        }

    }
};

const edgeLayer = {
    id: 'highlight-edges',
    type: 'custom',
    renderingMode: '3d',

    onAdd (map, gl) {
        const vertexSource = `#version 300 es
        in vec4 aPos;
        uniform mat4 u_matrix;
        void main() {
            gl_Position = u_matrix * aPos;
        }`;
    
        const fragmentSource = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(0.0, 0.0, 0.0, 0.5); // change this to your desired edge color
        }`;
    
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexSource);
        gl.compileShader(vertexShader);
    
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentSource);
        gl.compileShader(fragmentShader);
    
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
    
        this.buffer = highlightLayer.buffer;
        this.aPos = gl.getAttribLocation(this.program, 'aPos');
    
        this.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
        this.indices = new Uint16Array([
            0, 1,
            1, 2,
            2, 3,
            3, 0,
            0, 4,
            1, 4,
            2, 4,
            3, 4
        ]);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
    },

    render (gl, matrix) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.program, 'u_matrix'),
            false,
            matrix
        );
    
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
        gl.enableVertexAttribArray(this.aPos);
        gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);
    
        // Use a thicker line width for better visibility
        gl.lineWidth(3);
    
        // Draw the edges
        gl.drawElements(gl.LINES, this.indices.length, gl.UNSIGNED_SHORT, 0);
    }
};





// Description: A custom 3D layer that renders a pyramid roof on top of a polygon.
map.on('style.load', () => {
    map.setProjection({
        type: 'globe', // Set projection to globe
    });
});

// add the custom style layer to the map
map.on('load', () => {
    //map.addLayer(highlightLayer);
    //map.addLayer(edgeLayer);
    /*let roofs = new PyramidRoof({
        id: 'pyramid-roof',
        source: 'buildings',
        color: '#94433d',
        height: ['+', ['get', 'extrusion_height'], 15],
        base: ['get', 'extrusion_height'],
        //filter: ['==', 'roof:shape', 'pyramidal'],
        'filter': ['==','full_id', 'w813478300'],
        
        //filter: ['all', ['>', 'height', 0],['!=', 'name', 'outer-walls']],
        stroke: {
            color: '#000000',
            width: 1
        }
    })*/
    let roofs = new PyramidRoof2({
        id: 'pyramid-roof',
        source: 'buildings',
        color: '#94433d',
        height: 40,
        base: 32,
        //filter: ['==', 'roof:shape', 'pyramidal'],
        'filter': ['==','full_id', 'w813478300'],
        
        //filter: ['all', ['>', 'height', 0],['!=', 'name', 'outer-walls']],
        stroke: {
            color: '#000000',
            width: 1
        }
    })
    console.log(roofs);
    map.addLayer(roofs);

    
    
});