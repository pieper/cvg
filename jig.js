var cvg = require('./');

console.log('constructing...');

var box = new cvg.expressions.box();
var sphere = new cvg.expressions.sphere();

var union = new cvg.expressions.union({operands : [box,sphere]});

var difference = new cvg.expressions.difference({operands : [box,sphere]});

var scale = new cvg.expressions.scale({operands : [difference]});


console.log('rasterizing...');
var smallGrid = new cvg.rasterize.grid();
var raster = smallGrid.rasterize(difference);

console.log('saving...');
cvg.nrrd.write({grid : smallGrid, raster : raster});
