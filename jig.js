var cvg = require('./');
var THREE = require('three');
var OrbitControls = require('three-orbit-controls')(THREE);

console.log('constructing...');

var clone = function(o) {return JSON.parse(JSON.stringify(o));};

// // // Global Parameters

console.log('starting');

var volumePath;
var baseSize = [20, 20, 10];

var hoseWallThickness = 1.5;
var hoseOuterRadius = 4;
var hoseInnerRadius = hoseOuterRadius - hoseWallThickness;

var armOffset = [0, 18, 0];
var armSize = [20, 20, 80];
var armHoleOffset = [10, 10, 70];

//
// modeling
//

function holderExpression() {

  var base = baseExpression();

  var arm = armExpression();


  return (new cvg.expressions.union({
    operands : [base, arm]
  }));

}

function armExpression() {

  var cyl = new cvg.expressions.cylinder ({
    length : armSize[0],
    radius : hoseInnerRadius
  });

  var rotCyl = new cvg.expressions.rotate ({
    axis : [1, 0, 0],
    angle : THREE.Math.degToRad(90),
    operands : [ cyl ]
  });

  var cutout = new cvg.expressions.translate({
    offsets : armHoleOffset,
    operands : [ rotCyl ]
  });

  var armBar = new cvg.expressions.box ({
    dimensions : armSize,
  });

  var arm = new cvg.expressions.difference({
    operands : [armBar, cutout]
  });

  return (new cvg.expressions.translate({
    offsets : armOffset,
    operands : [ arm ]
  }));
}

function baseExpression() {
  var base = new cvg.expressions.box ({
      dimensions : baseSize
  });

  var cutout = new cvg.expressions.translate ({
    offsets : [baseSize[0]/2, baseSize[1]/2, 0],
    operands : [new cvg.expressions.cylinder ({
      length : 2*baseSize[2],
      radius : hoseInnerRadius
    })]
  });

  return (new cvg.expressions.difference({
    operands : [base, cutout]
  }));
}

//
// rasterizing and contouring
//

var gridOptions = {
      origins : { columns : -5, rows : -5, slices : -5 },
      extents : { columns : 35, rows : 45, slices : 95 },
      spacings : { columns : 0.5, rows : 0.5, slices : 0.5 },
      };

var holder = holderExpression();

var children = {};

var grid = new cvg.rasterize.Grid(gridOptions);

if (typeof window == 'undefined') {
  // CLI mode
  console.log('cli mode');
  console.log('rasterizing...');
  // rasterizing is specific to CLI mode because browser/MC (so far) just uses
  // sampling, not full raster
  var raster = grid.rasterize(holder);
  console.log('saving...');
  cvg.nrrd.write({
    grid : grid,
    raster : raster,
    filePath : volumePath
  });

} else {
  // browser window
  console.log('browser mode.');
  console.log('sampling...');
  var sampleData = grid.evaluateSamples(holder, true);
  console.log('mc...');
  // this is to project (high-dim) value to desired mesh isolevel
  var valueLevel = function(value) {
    // simple relation as long as not multidimensional values or tone.
    return -value;
  };
  var mesh = cvg.mesh.mc({grid: grid, samples:sampleData.samples,
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

    // add grid bounding box to scene
    grid.getBoundingLines().forEach(function(l) {
      var lineGeometry = new THREE.Geometry();
      lineGeometry.vertices.push(l[0], l[1]);
      scene.add(new THREE.Line(lineGeometry,
        new THREE.LineBasicMaterial({color: 0x0, lineWidth: 10})));
    });

    var gsize = 1000;
    var gstep = 10;//grid._spacings.x;
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
