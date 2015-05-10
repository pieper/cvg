var _ = require("underscore");

exports.grid = function(optionalDimensions) {

  dimensions = optionalDimensions || { columns : 100, rows : 100, slices : 100 };

  return({

  // read only properties
  dimensions : dimensions,

  oneOverDimensions : {
    columns : 1. / dimensions.columns,
    rows : 1. / dimensions.rows,
    slices : 1. / dimensions.columns,
  },

  halfDimensions : {
    columns : dimensions.columns / 2.,
    rows : dimensions.rows / 2.,
    slices : dimensions.columns / 2.,
  },

  // functions
  increments : function() {
    var d = this.dimensions;
    return {
      column : 1,
      row : d.columns,
      slice : (d.rows * d.columns)
    };
  },

  size : function() {
    var d = this.dimensions;
    return d.columns * d.rows * d.slices;
  },

  sample : function (expression, point) {
    var worldPoint = this.sampleTransform(point);
    var sample = expression.operation(worldPoint);
    return(sample);
  },

  sampleTransform : function(point) {
    return([
      (point[0] - this.halfDimensions.columns) * this.oneOverDimensions.columns,
      (point[1] - this.halfDimensions.rows) * this.oneOverDimensions.rows,
      (point[2] - this.halfDimensions.slices) * this.oneOverDimensions.slices,
      ]);
  },

  rasterize : function (expression) {
    var inc = this.increments();
    var raster = new Uint8Array(this.size());
    var d = this.dimensions;
    for (var slice = 0; slice < d.slices; slice += 1) {
      for (var row = 0; row < d.rows; row += 1) {
        for (var column = 0; column < d.columns; column += 1) {
          var point = [slice, row, column];
          var sample = this.sample(expression, point);
          var offset = slice * inc.slice + row * inc.row + column * inc.column;
          raster[offset] = sample;
        }
      }
    }
    return(raster);
  },
})};

