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
 * o: raster ('voxel values')
 * lines: samples (evaluated expression)
 * origin is at left bottom '+'
 *
 *
 * We rasterize by sampling expressions on corners (+), then
 * average over all 8 corners to get to the final raster (o) value (='voxel value')
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
    var e = options.extents;
    var s = options.spacings;
    this.dimensions = {
      columns : e.columns / s.columns,
      rows : e.rows / s.rows,
      slices : e.slices / s.slices
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

// exports.Grid.prototype.getBoundingGeo = function() {
//   var e = this.extents, o = this.origins;
//   var vo = new THREE.Vector3(o.columns, o.rows, o.slices);
//   var geo = new THREE.BoxGeometry(e.columns, e.rows, e.slices);
//   geo.vertices.forEach(function(v) {
//     v.add(vo);
//   });
//   return geo;
// };
exports.Grid.prototype.getBoundingLines = function() {
  function v(x,y,z){
      return new THREE.Vector3(x,y,z);
  }
  var e = this.extents, o = this.origins;
  var ec = e.columns, er = e.rows, es = e.slices,
      oc = o.columns, or = o.rows, os = o.slices;
  var lines = [];
  for (var c = oc; c <= oc+ec; c+=ec) {
    for (var s = os; s <= os+es; s+=es) {
      lines.push([v(c, or, s),v(c, or+er, s)]);
    }
    for (var r = or; r <= or+er; r+=er) {
      lines.push([v(c, r, os),v(c, r, os+es)]);
    }
  }
  /* jshint -W004 */
  for (var s = os; s <= os+es; s+=es) {
    for (var r = or; r <= or+er; r+=er) {
      lines.push([v(oc, r, s),v(oc+ec, r, s)]);
    }
  }
  /* jshint +W004 */
  return lines;
};

/*
 * get sample array offset from column, row, slice
 * TODO: add tests for max dimensions or not? more secure vs faster..
 */
exports.Grid.prototype.getSampleOffset = function(column, row, slice) {
  var sInc = this.sampleIncrements();
  return slice * sInc.slice + row * sInc.row + column * sInc.column;
};

/*
 * get raster array offset by column, row, slice
 */
exports.Grid.prototype.getRasterOffset = function(column, row, slice) {
  var rInc = this.rasterIncrements();
  return slice * rInc.slice + row * rInc.row + column * rInc.column;
};

/*
 * given offset into raster, return corresponding vector
 * TODO: is it a correct assumption that we have to assign the voxel center point
 * as the vector corresponding to the raster value?
 */
exports.Grid.prototype.getRasterCenterPoint = function(column, row, slice) {
  var dc = this._deltaColumn.clone().multiplyScalar(column + 0.5),
      dr = this._deltaRow.clone().multiplyScalar(row + 0.5),
      ds = this._deltaSlice.clone().multiplyScalar(slice + 0.5);
  var origin = new THREE.Vector3(this.origins.columns,this.origins.rows,this.origins.slices);
  // can avoid one clone using origin last
  dc.add(dr.add(ds.add(origin)));
  return dc;
};

/*
 * rasterize expression
 */
exports.Grid.prototype.rasterize = function (expression) {
  var raster = new Uint8Array(this.rasterSize());
  var d = this.dimensions;
  // first, sample at the corner points, up through the boundary of the grid
  var samples = new Uint8Array(this.samplesSize());
  // TODO: possible to replace with typed Array?
  var vertices = [];
  var origin = new THREE.Vector3(this.origins.columns,this.origins.rows,this.origins.slices);
  var sliceStart = origin.clone();
  for (var slice = 0; slice <= d.slices; slice += 1) {
    var rowStart = sliceStart.clone();
    for (var row = 0; row <= d.rows; row += 1) {
      var point = rowStart.clone();
      for (var column = 0; column <= d.columns; column += 1) {
        var sample = expression.evaluate(point.clone());
        var offset = this.getSampleOffset(column, row, slice);
        samples[offset] = sample;
        point.add(this._deltaColumn);
      }
      rowStart.add(this._deltaRow);
    }
    sliceStart.add(this._deltaSlice);
  }
  // now, given samples, average the eight corners to estimate value over voxel
  var corners = [ [0,0,0], [0,0,1], [0,1,0], [0,1,1],
                  [1,0,0], [1,0,1], [1,1,0], [1,1,1] ];

  for (var slice = 0; slice < d.slices; slice += 1) {
    for (var row = 0; row < d.rows; row += 1) {
      for (var column = 0; column < d.columns; column += 1) {
        var sum = 0;
        for (var corner = 0; corner < 8; corner++) {
          var c = corners[corner];
          var sampleOffset = this.getSampleOffset(column+c[2], row+c[1], slice+c[0]);
          sum += samples[sampleOffset];

        }
        var rasterOffset = this.getRasterOffset(column, row, slice);
        raster[rasterOffset] = 0.125 * sum;
      }
    }
  }
  return raster;
};
