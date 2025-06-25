
class PyramidRoof2 {

    type = 'custom'
    renderingMode = '3d'

    constructor(params) {
        this.id = params.id;
        this.sourceName = params.source;
        this.color = params.color;
        this.stroke = params.stroke || {};
        this.strokeColor = params.stroke ? this.stroke.color : [0, 0, 0, 125];
        this.strokeWidth = params.stroke ? this.stroke.width: 2;
        this.height = params.height || 0;
        this.base = params.base || 0;
        this.filterFunction = params.filter || null;
        this.map = map;
        this.source = map.getSource(this.sourceName);
        this.shaderMap = new Map();
        
       
    }

    getShader(gl, shaderDescription) {
        // Pick a shader based on the current projection, defined by `variantName`.
        if (this.shaderMap.has(shaderDescription.variantName)) {
            return this.shaderMap.get(shaderDescription.variantName);
        }

        // Create GLSL source for vertex shader
        //
        // Note that we need to use a complex function to project from the source mercator
        // coordinates to the globe. Internal shaders in MapLibre need to do this too.
        // This is done using the `projectTile` function.
        // In MapLibre, this function accepts vertex coordinates local to the current tile,
        // in range 0..EXTENT (8192), but for custom layers MapLibre supplies uniforms such that
        // the function accepts mercator coordinates of the whole world in range 0..1.
        // This is controlled by the `u_projection_tile_mercator_coords` uniform.
        //
        // The `projectTile` function can also handle mercator to globe transitions and can
        // handle the mercator projection - different code is supplied based on what projection is used,
        // and for this reason we use different shaders based on what shader projection variant is currently used.
        // See `variantName` usage earlier in this file.
        //
        // The code for the projection function and uniforms is also supplied by MapLibre
        // and must be injected into custom layer shaders in order to draw on a globe.
        // We simply use string interpolation for that here.
        //
        // See MapLibre source code for more details, especially src/shaders/_projection_globe.vertex.glsl
        const vertexSource = `#version 300 es
        // Inject MapLibre projection code
        ${shaderDescription.vertexShaderPrelude}
        ${shaderDescription.define}

        in vec2 a_pos;

        void main() {
            gl_Position = projectTile(a_pos);
        }`;

        // create GLSL source for fragment shader
        const fragmentSource = `#version 300 es

        out highp vec4 fragColor;
        void main() {
            fragColor = vec4(1.0, 0.0, 1.0, 0.75);
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
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        this.aPos = gl.getAttribLocation(program, 'a_pos');

        this.shaderMap.set(shaderDescription.variantName, program);

        return program;
    }

    rgbaToGlsl(r, g, b, a) {
        return [r / 255, g / 255, b / 255, a / 255];
    }

    hexToGlsl(hex) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);
        let a = hex.length > 7 ? parseInt(hex.slice(7, 9), 16) : 255;
        return this.rgbaToGlsl(r, g, b, a);
    }

    parseColor(color) {
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
        
        let filter = this.filterFunction;
        return map.querySourceFeatures(this.sourceName,{filter:filter});
    }

    isFunction(value) {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }

    /*
    Need to take the StyleExpression class from maplibre-gl-style-spec and use it to parse the style expression
    @maplibre/maplibre-gl-style-spec
    https://github.com/maplibre/maplibre-style-spec/blob/1c1d58b43340cbfa587effe87dd7f05d72eb0b53/src/expression/index.ts#L57
    */
    isExpression(expression) {
        return Array.isArray(expression) && expression.length > 0 &&
            typeof expression[0] === 'string' && expression[0] in definitions;
    }

    getVerticesForPolygon(polygon) {
        let vertices = [];
        let geometry;
        let coords;
        let center;
        let boundsCoords;
        
        if(polygon.type === 'Feature') {
            geometry = polygon.geometry;
        }
        if(polygon.type === 'Polygon') {
            geometry = polygon;
        }
        if(geometry.type === 'Polygon') {
            coords = geometry.coordinates[0];
        }
        if(geometry.type === 'MultiPolygon') {
            coords = geometry.coordinates[0][0];
        }

        
        
        let Xmax = Math.max(...coords.map(o => o[0])) 
        let Ymax = Math.max(...coords.map(o => o[1])) 
        let Xmin = Math.min(...coords.map(o => o[0]))
        let Ymin = Math.min(...coords.map(o => o[1]))
        let Xmid = (Xmax + Xmin) / 2
        let Ymid = (Ymax + Ymin) / 2

        if(typeof this.height === 'number') {
            center = [Xmid, Ymid, this.height]
        } else if (typeof this.height === 'array') {
            console.log('This is where I need to parse the style expression to see if the height is a function of the data.')
        }
        // Add the center point first
        let mercatorCenter = maplibregl.MercatorCoordinate.fromLngLat({lng: center[0], lat: center[1]}, center[2]);
        vertices.push(mercatorCenter.x);
        vertices.push(mercatorCenter.y);
        vertices.push(mercatorCenter.z);
        // Then add the perimeter points
        coords.forEach(coord => {
            let zValue = coord[2] || 0;
            if(typeof this.base === 'number') {
                zValue = this.base;
            }else if (typeof this.base === 'array') {
                console.log('This is where I need to parse the style expression to see if the base is a function of the data.')
            }
            let mercatorCood = maplibregl.MercatorCoordinate.fromLngLat({lng: coord[0], lat: coord[1]}, zValue);
            vertices.push(mercatorCood.x);
            vertices.push(mercatorCood.y);
            vertices.push(mercatorCood.z);
        })

        
        if(typeof this.base === 'number') {
            /*boundsCoords = [
                [Xmin, Ymin, this.base],
                [Xmax, Ymin, this.base],
                [Xmax, Ymax, this.base],
                [Xmin, Ymax, this.base],
                center
            ]*/
            
        }
        /*
        boundsCoords.forEach(coord => {
            let zValue = coord[2] || 0;
            let mercatorCood = maplibregl.MercatorCoordinate.fromLngLat({lng: coord[0], lat: coord[1]}, zValue);
            vertices.push(mercatorCood.x);
            vertices.push(mercatorCood.y);
            vertices.push(mercatorCood.z);
        });*/
        /*
        // Then add the perimeter points
        boundsCoords.forEach(coord => {
            let zValue = coord[2] || 0;
            let mercatorCood = maplibregl.MercatorCoordinate.fromLngLat({lng: coord[0], lat: coord[1]}, zValue);
            vertices.push(mercatorCood.x);
            vertices.push(mercatorCood.y);
            vertices.push(mercatorCood.z);
        });
        */
       
        return vertices;
        
    }

    createSidesProgram(gl, shaderDescription) {
        console.log('createSidesProgram');
        if (!shaderDescription) {
            shaderDescription = {
                variantName: 'globe',
                vertexShaderPrelude: maplibregl.globeVertexShaderPrelude,
                define: maplibregl.globeDefine
            };
        }
        if (this.shaderMap.has(shaderDescription.variantName)) {
            return this.shaderMap.get(shaderDescription.variantName);
        }
        
        this.sidesProgram = gl.createProgram();

        // Create GLSL source for vertex shader
        /*let sidesVertexSource = `#version 300 es
        uniform mat4 u_matrix;
        in vec3 a_pos;
        void main() {
            gl_Position = u_matrix * vec4(a_pos, 1.0);
        }`;*/
        let sidesVertexSource =  `#version 300 es
        // Inject MapLibre projection code
        ${shaderDescription.vertexShaderPrelude}
        ${shaderDescription.define}

        in vec2 a_pos;

        void main() {
            gl_Position = projectTile(a_pos);
        }`;


        // Create GLSL source for fragment shader
        let sidesColor = this.parseColor(this.color);
        let sidesFragmentSource = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(${sidesColor[0]}, ${sidesColor[1]}, ${sidesColor[2]}, ${sidesColor[3]});
        }`;

        // Create a vertex shader
        const sidesVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(sidesVertexShader, sidesVertexSource);
        gl.compileShader(sidesVertexShader);

        // Create a fragment shader
        const sidesFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(sidesFragmentShader, sidesFragmentSource);
        gl.compileShader(sidesFragmentShader);

        // Link the two shaders into a WebGL program
        gl.attachShader(this.sidesProgram, sidesVertexShader);
        gl.attachShader(this.sidesProgram, sidesFragmentShader);
        gl.linkProgram(this.sidesProgram);

        this.sides_aPos = gl.getAttribLocation(this.sidesProgram, 'a_pos');
    }

    createEdgesProgram(gl) {
        this.edgesProgram = gl.createProgram();

        // Create GLSL source for vertex shader
        let edgesVertexSource = `#version 300 es
        uniform mat4 u_matrix;
        in vec3 a_pos;
        void main() {
            gl_Position = u_matrix * vec4(a_pos, 1.0);
        }`;

        // Create GLSL source for fragment shader
        let edgesColor = this.parseColor(this.strokeColor);
        let edgesFragmentSource = `#version 300 es
        precision highp float;
        out vec4 fragColor;
        void main() {
            fragColor = vec4(${edgesColor[0]}, ${edgesColor[1]}, ${edgesColor[2]}, ${edgesColor[3]});
        }`;

        // Create a vertex shader
        const edgesVertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(edgesVertexShader, edgesVertexSource);
        gl.compileShader(edgesVertexShader);

        // Create a fragment shader
        const edgesFragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(edgesFragmentShader, edgesFragmentSource);
        gl.compileShader(edgesFragmentShader);

        // Link the two shaders into a WebGL program
        gl.attachShader(this.edgesProgram, edgesVertexShader);
        gl.attachShader(this.edgesProgram, edgesFragmentShader);
        gl.linkProgram(this.edgesProgram);

        this.edges_aPos = gl.getAttribLocation(this.edgesProgram, 'a_pos');
    }

    onAdd(map,gl) {
        
        
        
        console.log('onAdd');
        console.log(this.source);
        console.log(this);
        
        
        
        this.createSidesProgram(gl);
        this.createEdgesProgram(gl);

        this.buffers = [];
        this.source.getData()
        .then(data => {
            console.log(data);
            this._data = data;
            if(this.filterFunction) {
                this._data.features = this.filterFeatures();
            }
        }
        )
        .then(() => {
           
            console.log(this._data);
            this._data.features.forEach(feature => {
                let vertices = this.getVerticesForPolygon(feature);
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

                this.buffers.push({ buffer: buffer, indexBuffer: indexBuffer, vertexCount: vertices.length / 3 });

                //this.buffers.push({ buffer: buffer, vertexCount: vertices.length / 3 });
            });
        });
        
        
        
    }

    renderSides(gl, matrix) {
        this.createSidesProgram(gl, this.shaderMap.get('globe'));
        gl.useProgram(this.sidesProgram);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.sidesProgram, 'u_matrix'),
            false,
            new Float32Array(matrix)
        );
    
        for(let item of this.buffers) {
            gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
            gl.enableVertexAttribArray(this.sides_aPos);
            gl.vertexAttribPointer(this.sides_aPos, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_FAN, 0, item.vertexCount);
        }
    }

    renderEdges(gl, matrix) {
        gl.useProgram(this.edgesProgram);
        gl.uniformMatrix4fv(
            gl.getUniformLocation(this.edgesProgram, 'u_matrix'),
            false,
            new Float32Array(matrix)
        );
    
        // Set the line width
        gl.lineWidth(this.strokeWidth);
    
        // Draw the edges
        for(let item of this.buffers) {
            gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, item.indexBuffer);
            gl.enableVertexAttribArray(this.edges_aPos);
            gl.vertexAttribPointer(this.edges_aPos, 3, gl.FLOAT, false, 0, 0);
            gl.drawElements(gl.LINES, item.vertexCount * 2 - 2, gl.UNSIGNED_SHORT, 0);
        }
    }

    render(gl, args) {
        // Save the current WebGL state
        let currentArrayBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
        let currentElementArrayBuffer = gl.getParameter(gl.ELEMENT_ARRAY_BUFFER_BINDING);
        let currentProgram = gl.getParameter(gl.CURRENT_PROGRAM);
        let currentDepthTest = gl.getParameter(gl.DEPTH_TEST);
        let currentDepthFunc = gl.getParameter(gl.DEPTH_FUNC);
        let currentPolygonOffsetFill = gl.getParameter(gl.POLYGON_OFFSET_FILL);
        let currentPolygonOffsetFactor = gl.getParameter(gl.POLYGON_OFFSET_FACTOR);
        let currentPolygonOffsetUnits = gl.getParameter(gl.POLYGON_OFFSET_UNITS);
        let matrix = args.shaderData;

        
        
        //gl.depthFunc(gl.GEQUAL);
        

        // First pass: render the sides with depth testing enabled
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LESS);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.POLYGON_OFFSET_FILL);
        gl.polygonOffset(-1.0, 1.0);
        gl.depthRange(0.2, 0.6);
        
        this.renderSides(gl, matrix);
        
        
        
        
        //gl.depthRange(0, 1);
    
        // Second pass: render the edges with depth testing enabled, but only where the depth is greater
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.POLYGON_OFFSET_FILL);
        
        this.renderEdges(gl, matrix);
        
        
        
    
        // Restore the saved WebGL state
        gl.bindBuffer(gl.ARRAY_BUFFER, currentArrayBuffer);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, currentElementArrayBuffer);
        gl.useProgram(currentProgram);
        if (currentDepthTest) {
            gl.enable(gl.DEPTH_TEST);
        } else {
            gl.disable(gl.DEPTH_TEST);
        }
        gl.depthFunc(currentDepthFunc);
        if (currentPolygonOffsetFill) {
            gl.enable(gl.POLYGON_OFFSET_FILL);
        } else {
            gl.disable(gl.POLYGON_OFFSET_FILL);
        }
        gl.polygonOffset(currentPolygonOffsetFactor, currentPolygonOffsetUnits);
    }
}