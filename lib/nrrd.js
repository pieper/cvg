"use strict"

var _ = require("underscore");
var fs = require("fs");

exports.write = function (options) {
  var defaultOptions = {
    filePath : "/tmp/raster.nrrd",
  }
  options = _.defaults(options || {}, defaultOptions);
  var grid = options.grid;

  var nrrdHeader = "NRRD0004\n";
  nrrdHeader += "type: uchar\n";
  nrrdHeader += "dimension: 3\n";
  nrrdHeader += "space: left-posterior-superior\n"
  nrrdHeader += "sizes: %columns %rows %slices\n"
    .replace("%columns", grid.dimensions.columns)
    .replace("%rows", grid.dimensions.rows)
    .replace("%slices", grid.dimensions.slices)
  nrrdHeader += "space directions: (1,0,0) (0,1,0) (0,0,1)\n";
  nrrdHeader += "kinds: domain domain domain\n";
  nrrdHeader += "endian: little\n";
  nrrdHeader += "encoding: raw\n";
  nrrdHeader += "space origin: (%columnCenter,%rowCenter,%sliceCenter)\n"
    .replace("%columnCenter", grid.dimensions.columns / 2.)
    .replace("%rowCenter", grid.dimensions.rows / 2.)
    .replace("%sliceCenter", grid.dimensions.slices / 2.)
  nrrdHeader += "\n";

  var fs = require('fs');
  fs.writeFileSync(options.filePath, nrrdHeader);
  fs.appendFileSync(options.filePath, new Buffer(options.raster));
}
