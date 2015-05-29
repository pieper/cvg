var _ = require("underscore");
var THREE = require("THREE");

/*
 *
 * grid layout:
 *
 * +-+-+-+-+
 * |o|o|o|o|
 * +-+-+-+-+
 * |o|o|o|o|
 * +-+-+-+-+
 *
 * where
 *
 * o: raster
 * lines: samples
 *
 * We rasterize by sampling expressions on corners (+), then
 * average over all 8 corners to get to the final sample (o) value
 *
 * Coordinates are RAS, i.e. Right Anterior Superior (see
 * https://www.slicer.org/slicerWiki/index.php/Coordinate_systems),
 */


// default grid is a 20cm box centered at the origin
exports.Grid = function(options) {
  // options
  options = options || {};
  this.dimensions = options.dimensions || { columns : 100, rows : 100, slices : 100 };
  this.origins = options.origins || { columns : -100, rows : -100, slices : -100 };
  // RAS direction cosines (normalized vectors)
  this.directions = options.directions || {
    columns : [1,0,0],
    rows    : [0,1,0],
    slices  : [0,0,1]
  };
  // in mm
  this.extents = options.extents || { columns : 200, rows : 200, slices : 200 };

  if (options.dimensions && options.spacings) {
    console.warn("Both dimensions and spacings specified, using spacings.");
    delete options.dimensions;
  }
  if (!options.dimensions && !options.spacings) {
    options.spacings = { columns : 1, rows : 1, slices : 1 };
  }

  if (options.spacings) {
    var o = options.origins;
    var e = options.extents;
    var s = options.spacings;
    this.dimensions = {
      columns : (e.columns - o.columns) / s.columns,
      rows : (e.rows - o.rows) / s.rows,
      slices : (e.slices - o.slices) / s.slices
    };
  } else {
    this.dimensions = options.dimensions || { columns : 100, rows : 100, slices : 100 };
  }

  // cached calculations
  // spacings: extents (mm) per column/row/slice
  this._spacings = new THREE.Vector3 (
    (this.extents.columns / this.dimensions.columns),
    (this.extents.rows    / this.dimensions.rows),
    (this.extents.slices  / this.dimensions.slices));

  this._deltaColumn = new THREE.Vector3 (
    this.directions.columns[0] * this._spacings.x,
    this.directions.columns[1] * this._spacings.y,
    this.directions.columns[2] * this._spacings.z);
  this._deltaRow = new THREE.Vector3 (
    this.directions.rows[0] * this._spacings.x,
    this.directions.rows[1] * this._spacings.y,
    this.directions.rows[2] * this._spacings.z);
  this._deltaSlice = new THREE.Vector3 (
    this.directions.slices[0] * this._spacings.x,
    this.directions.slices[1] * this._spacings.y,
    this.directions.slices[2] * this._spacings.z);

  // TODO: unused - deprecate?
  var d = this.dimensions;
  this._oneOverDimensions = {
    columns : 1.0 / d.columns,
    rows    : 1.0 / d.rows,
    slices  : 1.0 / d.columns,
  };
  // TODO: unused - deprecate?
  this._halfDimensions = {
    columns : d.columns / 2.0,
    rows    : d.rows / 2.0,
    slices  : d.columns / 2.0,
  };
};

/*
 * increments to skip to neighboring corner
 * in column, row, slice direction
 */
exports.Grid.prototype.rasterIncrements = function() {
  var d = this.dimensions;
  return ({
    column : 1,
    row    : d.columns,
    slice  : (d.rows * d.columns)
  });
};

/*
 * increments to skip to neighboring sample
 * in column/row/slice direction
 */
exports.Grid.prototype.sampleIncrements = function() {
  var d = this.dimensions;
  return ({
    column : 1,
    row    : (d.columns + 1),
    slice  : ( (d.rows + 1) * (d.columns + 1) )
  });
};


/*
 * return number of voxels in grid
 */
exports.Grid.prototype.rasterSize = function() {
  var d = this.dimensions;
  return (d.columns * d.rows * d.slices);
};

/*
 * number of corners (before/between/after voxels)
 * expression is sampled on corners
 */
exports.Grid.prototype.samplesSize = function() {
  var d = this.dimensions;
  return ((d.columns + 1) * (d.rows + 1) * (d.slices + 1));
};

/*
 * get sample array offset from column, row, slice (mc)
 * TODO: add tests for max dimensions? more secure vs faster..
 */
exports.Grid.prototype.getSampleOffset = function(column, row, slice) {
  var sInc = this.sampleIncrements();
  return slice * sInc.slice + row * sInc.row + column * sInc.column;
};


/*
 * get vertex next to a defined vertex. Used in mc for "wrapping" vertices
 * direction is a vector of [columns, rows, slices]
 */
exports.Grid.prototype.getNeighborPoint = function(point, direction) {
  var neighbor = point.clone();
  neighbor.add(this._deltaColumn.clone().multiplyScalar(direction[0]));
  neighbor.add(this._deltaRow.clone().multiplyScalar(direction[1]));
  neighbor.add(this._deltaSlice.clone().multiplyScalar(direction[2]));
  return neighbor;
};

/*
 * Sample at the corner points, up through the boundary of the grid
 * opt_getVertices -> for performance, cache vertices if they are needed,
 * otherwise avoid
 */
exports.Grid.prototype.evaluateSamples = function(expression, opt_getVertices) {
  var sInc = this.sampleIncrements();
  var samples = new Uint8Array(this.samplesSize());
  // TODO: possible to replace with typed Array?
  var vertices = [];
  var d = this.dimensions;
  var origin = new THREE.Vector3(this.origins.columns,this.origins.rows,this.origins.slices);
  var sliceStart = origin.clone();
  for (var slice = 0; slice <= d.slices; slice += 1) {
    var rowStart = sliceStart.clone();
    for (var row = 0; row <= d.rows; row += 1) {
      var point = rowStart.clone();
      for (var column = 0; column <= d.columns; column += 1) {
        var sample = expression.evaluate([point.x, point.y, point.z]);
        var offset = slice * sInc.slice + row * sInc.row + column * sInc.column;
        samples[offset] = sample;
        if (opt_getVertices) {
          vertices.push(point.clone());
        }
        point.add(this._deltaColumn);
      }
      rowStart.add(this._deltaRow);
    }
    sliceStart.add(this._deltaSlice);
  }
  // TODO: simplify return value
  return opt_getVertices ? {samples: samples, vertices: vertices} : samples;
};

/*
 * rasterize expression
 */
exports.Grid.prototype.rasterize = function (expression) {
  var raster = new Uint8Array(this.rasterSize());
  var d = this.dimensions;
  // first, sample at the corner points, up through the boundary of the grid
  var samples = this.evaluateSamples(expression);
  // now average the eight corners to estimate value over voxel
  var corners = [ [0,0,0], [0,0,1], [0,1,0], [0,1,1],
                  [1,0,0], [1,0,1], [1,1,0], [1,1,1] ];
  var rInc = this.rasterIncrements();
  var sInc = this.sampleIncrements();

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
  return raster;
};
