var _ = require("underscore");

exports.Grid = function(options) {
  options = options || {};
  this.dimensions = options.dimensions || { columns : 100, rows : 100, slices : 100 };
  var d = this.dimensions;
  this.oneOverDimensions = {
    columns : 1. / d.columns,
    rows : 1. / d.rows,
    slices : 1. / d.columns,
  };
  this.halfDimensions = {
    columns : d.columns / 2.,
    rows : d.rows / 2.,
    slices : d.columns / 2.,
  };
};

// functions
exports.Grid.prototype.rasterIncrements = function() {
  var d = this.dimensions;
  return {
    column : 1,
    row : d.columns,
    slice : (d.rows * d.columns)
  };
};

// functions
exports.Grid.prototype.sampleIncrements = function() {
  var d = this.dimensions;
  return {
    column : 1,
    row : (d.columns + 1),
    slice : ( (d.rows + 1) * (d.columns + 1) )
  };
};


// number of voxels
exports.Grid.prototype.rasterSize = function() {
  var d = this.dimensions;
  return d.columns * d.rows * d.slices;
};

// number of corners
exports.Grid.prototype.samplesSize = function() {
  var d = this.dimensions;
  return (d.columns + 1) * (d.rows + 1) * (d.slices + 1);
};

exports.Grid.prototype.sample = function (expression, point) {
  var worldPoint = this.sampleTransform(point);
  var sample = expression.operation(worldPoint);
  return(sample);
};

exports.Grid.prototype.sampleTransform = function(point) {
  return([
    (point[0] - this.halfDimensions.columns) * this.oneOverDimensions.columns,
    (point[1] - this.halfDimensions.rows) * this.oneOverDimensions.rows,
    (point[2] - this.halfDimensions.slices) * this.oneOverDimensions.slices,
    ]);
};

exports.Grid.prototype.rasterize = function (expression) {
  var sInc = this.sampleIncrements();
  var raster = new Uint8Array(this.rasterSize());
  var samples = new Uint8Array(this.samplesSize());
  var d = this.dimensions;
  // first, sample at the corner points, up through the boundary of the grid
  for (var slice = 0; slice <= d.slices; slice += 1) {
    for (var row = 0; row <= d.rows; row += 1) {
      for (var column = 0; column <= d.columns; column += 1) {
        var point = [slice, row, column];
        var sample = this.sample(expression, point);
        var offset = slice * sInc.slice + row * sInc.row + column * sInc.column;
        samples[offset] = sample;
      }
    }
  }
  // now average the eight corners to estimate value over voxel
  var corners = [ [0,0,0], [0,0,1], [0,1,0], [0,1,1],
                  [1,0,0], [1,0,1], [1,1,0], [1,1,1] ];
  var rInc = this.rasterIncrements();
  for (var slice = 0; slice < d.slices; slice += 1) {
    for (var row = 0; row < d.rows; row += 1) {
      for (var column = 0; column < d.columns; column += 1) {
        var sum = 0;
        for (var corner = 0; corner < 8; corner++) {
          var c = corners[corner];
          var sampleOffset = (slice+c[0]) * sInc.slice + (row+c[1]) * sInc.row + (column+c[2]) * sInc.column;
          sum += samples[sampleOffset];

        }
        var rasterOffset = slice * rInc.slice + row * rInc.row + column * rInc.column;
        raster[rasterOffset] = 0.125 * sum;
      }
    }
  }
  return(raster);
};

