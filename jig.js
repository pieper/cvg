var cvg = require('./');
var THREE = require('three');

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

  return (cvg.expressions.union({
    operands : [base, arm]
  }));

}

function armExpression() {

  var cyl = cvg.expressions.cylinder ({
    length : armSize[0],
    radius : hoseInnerRadius
  });

  var rotCyl = cvg.expressions.rotate ({
    axis : [1, 0, 0],
    angle : THREE.Math.degToRad(90),
    operands : [ cyl ]
  });

  var cutout = cvg.expressions.translate({
    offsets : armHoleOffset,
    operands : [ rotCyl ]
  });

  var armBar = cvg.expressions.box ({
    dimensions : armSize,
  });

  var arm = cvg.expressions.difference({
    operands : [armBar, cutout]
  });

  return (cvg.expressions.translate({
    offsets : armOffset,
    operands : [ arm ]
  }));
}

function baseExpression() {
  var base = cvg.expressions.box ({
      dimensions : baseSize
  });

  var cutout = cvg.expressions.translate ({
    offsets : [baseSize[0]/2, baseSize[1]/2, 0],
    operands : [cvg.expressions.cylinder ({
      length : 2*baseSize[2],
      radius : hoseInnerRadius
    })]
  });

  return (cvg.expressions.difference({
    operands : [base, cutout]
  }));
}

//
// rasterizing and contouring
//

var gridOptions = {
      origins : { columns : -5, rows : -5, slices : -5 },
      extents : { columns : 35, rows : 45, slices : 95 },
      spacings : { columns : 1.0, rows : 1.0, slices : 1.0 },
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
  console.log('marchingCubes...');
  // this is to project (high-dim) value to desired mesh isolevel
  var valueLevel = function(value) {
    // simple relation as long as not multidimensional values or tone.
    return -value;
  };
  var mesh = cvg.mesh.marchingCubes({grid: grid, samples:sampleData.samples,
    vertices: sampleData.vertices, valueLevel: valueLevel});
  console.log('rendering');

  // grid bounding lines
  var boundingLines = grid.getBoundingLines().map(function(l) {
    var lineGeometry = new THREE.Geometry();
    lineGeometry.vertices.push(l[0], l[1]);
    return new THREE.Line(lineGeometry,
      new THREE.LineBasicMaterial({color: 0x0, lineWidth: 10}));
  });

  var renderer = new cvg.renderer.Renderer(boundingLines.concat(mesh));
  renderer.animate();
}
