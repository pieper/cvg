var cvg = require('./');
var THREE = require('three');
var OrbitControls = require('three-orbit-controls')(THREE);

console.log(cvg.octants.corners(0));

console.log('constructing...');

var box = new cvg.expressions.box();
var sphere = new cvg.expressions.sphere();

var union = new cvg.expressions.union({operands : [box,sphere]});

var difference = new cvg.expressions.difference({operands : [box,sphere]});

var scale = new cvg.expressions.scale({
  operands : [difference],
  factors : [.3, .3, .3]
});

var array = new cvg.expressions.array({
  operands : [scale],
  repeats : [2, 2, 1],
  steps : [.2, .2, .2],
});

var rotate = new cvg.expressions.rotate({
  operands : [array],
  angle : 30
});

var cylinder = new cvg.expressions.cylinder({
  radius : .2,
});

var thing = new cvg.expressions.union({
  operands : [cylinder, rotate]
});

var material = thing;

var smallGrid = new cvg.rasterize.Grid({
  // dimensions : { columns : 200, rows : 200, slices : 200 },
  dimensions : { columns : 32, rows : 32, slices : 32 },
  // dimensions : { columns : 20, rows : 20, slices : 20 },
  // dimensions : { columns : 2, rows : 2, slices : 2 },
  });

if (typeof window == 'undefined') {
  // CLI mode
  console.log('cli mode');
  console.log('rasterizing...');
  var raster = smallGrid.rasterize(material);
  console.log('saving...');
  cvg.nrrd.write({grid : smallGrid, raster : raster});
} else {
  // browser window
  console.log('browser mode.');
  // var sphere10 = new cvg.expressions.sphere({radius: 10});
  var testCube10 = new cvg.expressions.box({
    dimensions:[50, 50, 50],
  });
  var testPadding = new cvg.expressions.Expression();
  console.log('sampling...');
  // project (high-dim) value to desired mesh isolevel
  var valueLevel = function(value) {
    // simple relation as long as not multidimensional values or tone.
    return -value;
  };
  var sampleData = smallGrid.evaluateSamples(testCube10, true);
  console.log('mc...');
  var mesh = cvg.mesh.mc({grid: smallGrid, samples:sampleData.samples,
    vertices: sampleData.vertices, valueLevel: valueLevel});
  console.log('rendering');
  var container, scene, camera, renderer, controls, stats;

  var init = function() {
    // scene
    scene = new THREE.Scene();
    // camera
    var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
    var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
    camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
    scene.add(camera);

    var gsize = 1000;
    var gstep = 10;//smallGrid._spacings.x;
    var gridHelper = new THREE.GridHelper( gsize, gstep );
    // gridHelper.position.set(gstep/2, 0, gstep/2);
    scene.add( gridHelper );
    scene.add( new THREE.AxisHelper(gsize) );

    camera.position.set(100,100,60);
    camera.lookAt(scene.position);
    // renderer
    renderer = new THREE.WebGLRenderer( {antialias:true} );
    renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
    var bgColor = new THREE.Color();
    bgColor.setRGB(0.9, 0.9, 0.9);
    renderer.setClearColor(bgColor);
    // controls
    controls = new OrbitControls(camera, renderer.domElement);
    container = document.getElementById( 'render' );
    container.appendChild( renderer.domElement );
    // light
    var light = new THREE.PointLight(0xffffff);
    light.position.set(2000,2000,2000);
    scene.add(light);
  };
  var animate = function() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    controls.update();
  };
  var render = function() {
  };
  init();
  scene.add(mesh);
  animate();
}
