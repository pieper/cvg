var _ = require('underscore');
var three = require('three');

exports.isoCorners = []; // full extent of space
exports.originCorners = []; // corners or octant 0

for (var t = -1; t<=1; t+=2) {
  for (var s = -1; s <=1; s+=2) {
    for (var r = -1; r<=1; r+=2) {
      exports.isoCorners.push([r,s,t]);
    }
  }
}
for (var cornerIndex = 0; cornerIndex < 8; cornerIndex++) {
  var coord = exports.isoCorners[cornerIndex].slice(0);
  for (var element = 0; element < 3; element++) {
    if (coord[element] == 1) { coord[element] = 0; }
  }
  exports.originCorners.push(coord);
}

exports.corners = function(octant) {
  if (octant < 0 || octant > 7) {
    console.warn("fancy coordinates not supported");
  }
  var r = octant & 1;
  var s = octant & 2;
  var t = octant & 4;

  var corners = [];
  for (var cornerIndex = 0; cornerIndex < 8; cornerIndex++) {
    var coord = exports.originCorners[cornerIndex].slice(0);
    coord[0] += r;
    coord[1] += s;
    coord[2] += t;
    corners.push(coord);
  }
  return (corners);
};



// TODO
exports.Octants = function(options) {
  options = options || {};
  this.dimensions = options.dimensions || { columns : 100, rows : 100, slices : 100 };
  var d = this.dimensions;
  this.oneOverDimensions = {
    columns : 1.0 / d.columns,
    rows : 1.0 / d.rows,
    slices : 1.0 / d.columns,
  };
  this.halfDimensions = {
    columns : d.columns / 2.0,
    rows : d.rows / 2.0,
    slices : d.columns / 2.0,
  };
};

// TODO
// functions
exports.Octants.prototype.rasterIncrements = function() {
  var d = this.dimensions;
  return {
    column : 1,
    row : d.columns,
    slice : (d.rows * d.columns)
  };
};
