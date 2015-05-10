var cvg = require('./');

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

var material = rotate;

console.log('rasterizing...');
var smallGrid = new cvg.rasterize.Grid({
  dimensions : { columns : 200, rows : 200, slices : 200 },
  //dimensions : { columns : 2, rows : 2, slices : 2 },
  });
var raster = smallGrid.rasterize(material);

console.log('saving...');
cvg.nrrd.write({grid : smallGrid, raster : raster});
