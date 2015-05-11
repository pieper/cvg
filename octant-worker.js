
var cvg = require('./');

var Worker = require('webworker-threads').Worker;

var workerFunction = function() {
  postMessage('hoot');
//  postMessage(cvg.octants.corners(0));
  this.onmessage = function(event) {
    postMessage('I got a message so now I close');
    self.close();
  }
};

var worker = new Worker(workerFunction);

console.log(cvg.octants.corners(0));

worker.onmessage = function(event) {
  console.log("Worker said: ", event.data);
};

worker.postMessage('test');



/*
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
  dimensions : { columns : 20, rows : 20, slices : 20 },
  //dimensions : { columns : 2, rows : 2, slices : 2 },
  });
var raster = smallGrid.rasterize(material);

console.log('saving...');
cvg.nrrd.write({grid : smallGrid, raster : raster});
*/
