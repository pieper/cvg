var cvg = require('./');
var THREE = require('three');

console.log('constructing...');

var clone = function(o) {return JSON.parse(JSON.stringify(o));};

// // // Global Parameters

console.log('starting');
// for benchmarks
var startTime = Date.now();

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
      origins : { columns : -6, rows : -6, slices : -6 },
      extents : { columns : 12, rows : 12, slices : 12 },
      spacings : { columns : 0.125, rows : 0.125, slices : 0.125 },
};


// examples for showing
// 1. a holder
var holder = holderExpression();
// 2. a collection of loxodromes
var loxodrome = cvg.expressions.loxodrome({radius: 5, tube: 0.3, slope:1});
var num_loxs = 8, union_operands = [];
for (var i = 0; i < num_loxs; i++) {
  union_operands.push(cvg.expressions.rotate ({
    axis : [0, 0, 1], angle : 2*Math.PI/num_loxs*i, operands : [ loxodrome ]
  }));
}
var loxball = cvg.expressions.union({operands: union_operands});
// 3. some cut/extrude op
// var loxball = cvg.expressions.box({dimensions:[5, 5, 1], origin:[-2.5, -2.5, -0.01]});
var octahedron = cvg.expressions.octahedron({radius: 5});
// oblique cut
var cut = cvg.expressions.cut({operands: [octahedron],
  normal: [1, 1, 1], axisvector: [1, 0, 0]});
var extrude = cvg.expressions.extrude({operands: [cut], length: 2});

var threeGeometry = cvg.expressions.fromThreeGeometry({
  geometry: new THREE.IcosahedronGeometry(5, 0)
});

var threeGeometry = cvg.expressions.torusknot();

var grid = new cvg.rasterize.Grid(gridOptions);
console.log('rasterizing...');
// var raster = grid.rasterize(holder);
// var raster = grid.rasterize(loxball);
// var raster = grid.rasterize(extrude);
var raster = grid.rasterize(threeGeometry);

var rasterTime = Date.now() - startTime;
startTime = Date.now();
console.log('rasterized in ' + rasterTime + ' ms.');

if (typeof window == 'undefined') {
  // CLI mode
  console.log('(cli mode)');
  console.log('saving...');
  cvg.nrrd.write({
    grid : grid,
    raster : raster,
    filePath : volumePath
  });

} else {
  // browser mode
  console.log('(browser mode)');
  console.log('marchingCubes...');
  // this is to project (high-dim) value to desired mesh isolevel
  var valueLevel = function(value) {
    // simple relation as long as not multidimensional values or tone.
    return -value;
  };
  var mesh = cvg.mesh.marchingCubes({grid: grid, raster: raster,
                                     valueLevel: valueLevel});
  var meshTime = Date.now() - startTime;
  console.log('meshed in ' + meshTime + ' ms.');
  console.log('rendering');

  // grid bounding lines
  var boundingLines = grid.getBoundingLines().map(function(l) {
    var lineGeometry = new THREE.Geometry();
    lineGeometry.vertices.push(l[0], l[1]);
    return new THREE.Line(lineGeometry,
      new THREE.LineBasicMaterial({color: 0x0, lineWidth: 10}));
  });

  var renderer = new cvg.renderer.Renderer(boundingLines.concat(mesh), {
    rasterTime: rasterTime,
    meshTime: meshTime
  });
  renderer.animate();
}
