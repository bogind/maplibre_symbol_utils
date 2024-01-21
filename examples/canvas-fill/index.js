import canvasFill from "./CanvasFill.js";


let map = new maplibregl.Map({
    container: 'map',
    center:[34.785291,32.0587239],
    zoom:12,
    style:'https://demotiles.maplibre.org/style.json'
});



// implementation of CustomLayerInterface to draw a pulsing dot icon on the map
// see https://maplibre.org/maplibre-gl-js-docs/api/properties/#customlayerinterface for more info

let params = {
    size: 512,
    backGroundColor: 'rgba(20,20,255,0.5)',
    factor: 64,
    keepRepainting: true,
    lines: [
        {color:'rgba(230,230,230,1)',type:'esriSFSDiagonalCross',width:8},    
        {color:'rgba(0,0,0,255)',type:'+',width:8},
        {color:'rgba(180,150,0,255)',type:'esriSFSForwardDiagonal',width:2},
        {color:'rgba(255,0,0,255)',type:'esriSFSBackwardDiagonal',width:2},
        {color:'rgba(100,205,150,255)',type:'esriSFSVertical',width:2},
        {color:'rgba(200,85,13,255)',type:'esriSFSHorizontal',width:2}
    ]
}

map.addImage('canvasFillImage',  new canvasFill( params))
map.addImage('DiagonalCross',new canvasFill(  {
    size: 512,
    backGroundColor: 'rgba(20,20,255,0.5)',
    factor: 64,
    lines: [
        {color:'rgba(230,230,230,1)',type:'esriSFSDiagonalCross',width:3}
    ]
}))
map.addImage('Cross',new canvasFill(  {
    size: 512,
    backGroundColor: 'rgba(20,20,255,0.5)',
    factor: 64,
    lines: [
        {color:'rgba(0,0,0,255)',type:'esriSFSCross',width:4}
    ]
}))
map.addImage('ForwardDiagonal',new canvasFill( {
    size: 512,
    backGroundColor: 'rgba(20,20,255,0.5)',
    factor: 64,
    lines: [
        {color:'rgba(180,150,0,255)',type:'esriSFSForwardDiagonal',width:2}
    ]
}))
map.addImage('BackwardDiagonal', new canvasFill( {
    size: 512,
    backGroundColor: 'rgba(20,20,255,0.5)',
    factor: 64,
    lines: [
        {color:'rgba(255,0,0,255)',type:'esriSFSBackwardDiagonal',width:2}
    ]
}))
map.addImage('Vertical',new canvasFill(  {
    size: 512,
    backGroundColor: 'rgba(20,20,255,0.5)',
    factor: 64,
    lines: [
        {color:'rgba(100,205,150,255)',type:'esriSFSVertical',width:2}
    ]
}))
map.addImage('Horizontal',new canvasFill(  {
    size: 512,
    backGroundColor: 'rgba(20,20,255,0.5)',
    factor: 64,
    lines: [
        {color:'rgba(200,85,13,255)',type:'esriSFSHorizontal',width:2}
    ]
}))

map.on('load', function () {
    

    map.addSource('polygon', {
        'type': 'geojson',
        'data': {"type":"FeatureCollection","features":[{"type":"Feature","properties":{"stroke":"#555555","stroke-width":2,"stroke-opacity":1,"fill":"#555555","fill-opacity":0.5,"type":1},"geometry":{"type":"Polygon","coordinates":[[[34.76820945739746,32.07675654031872],[34.774818420410156,32.07675654031872],[34.774818420410156,32.08104736534343],[34.76820945739746,32.08104736534343],[34.76820945739746,32.07675654031872]]]}},{"type":"Feature","properties":{"stroke":"#555555","stroke-width":2,"stroke-opacity":1,"fill":"#555555","fill-opacity":0.5,"type":2},"geometry":{"type":"Polygon","coordinates":[[[34.77490425109863,32.0768292678445],[34.78134155273437,32.0768292678445],[34.78134155273437,32.08112008945551],[34.77490425109863,32.08112008945551],[34.77490425109863,32.0768292678445]]]}},{"type":"Feature","properties":{"stroke":"#555555","stroke-width":2,"stroke-opacity":1,"fill":"#555555","fill-opacity":0.5,"type":3},"geometry":{"type":"Polygon","coordinates":[[[34.768123626708984,32.07217458955719],[34.77473258972168,32.07217458955719],[34.77473258972168,32.076538357394234],[34.768123626708984,32.076538357394234],[34.768123626708984,32.07217458955719]]]}},{"type":"Feature","properties":{"stroke":"#555555","stroke-width":2,"stroke-opacity":1,"fill":"#555555","fill-opacity":0.5,"type":4},"geometry":{"type":"Polygon","coordinates":[[[34.77499008178711,32.07217458955719],[34.78134155273437,32.07217458955719],[34.78134155273437,32.07668381273508],[34.77499008178711,32.07668381273508],[34.77499008178711,32.07217458955719]]]}},{"type":"Feature","properties":{"stroke":"#555555","stroke-width":2,"stroke-opacity":1,"fill":"#555555","fill-opacity":0.5,"type":5},"geometry":{"type":"Polygon","coordinates":[[[34.768123626708984,32.0678106134499],[34.7746467590332,32.0678106134499],[34.7746467590332,32.07202912704232],[34.768123626708984,32.07202912704232],[34.768123626708984,32.0678106134499]]]}},{"type":"Feature","properties":{"stroke":"#555555","stroke-width":2,"stroke-opacity":1,"fill":"#555555","fill-opacity":0.5,"type":6},"geometry":{"type":"Polygon","coordinates":[[[34.77490425109863,32.067737878750336],[34.78151321411132,32.067737878750336],[34.78151321411132,32.07202912704232],[34.77490425109863,32.07202912704232],[34.77490425109863,32.067737878750336]]]}},{"type":"Feature","properties":{"stroke":"#555555","stroke-width":2,"stroke-opacity":1,"fill":"#555555","fill-opacity":0.5,"type":0},"geometry":{"type":"Polygon","coordinates":[[[34.78168487548828,32.0678106134499],[34.7991943359375,32.0678106134499],[34.7991943359375,32.08112008945551],[34.78168487548828,32.08112008945551],[34.78168487548828,32.0678106134499]]]}}]}
    });
    map.addLayer({
        'id': 'polygon-stroke',
        'type': 'line',
        'source': 'polygon',
        'paint': {
            'line-color': 'rgba(0, 92, 230, 255)'
        }
    });
    map.addLayer({
        'id': 'polygon',
        'type': 'fill',
        'source': 'polygon',
        'paint': {
            'fill-color':'#ff0000',
            'fill-pattern': ['match',
                            ['get','type'],
                            1,'DiagonalCross',
                            2,'Cross',
                            3,'ForwardDiagonal',
                            4,'BackwardDiagonal',
                            5,'Vertical',
                            6,'Horizontal',
                            'canvasFillImage']
        }
    });
});