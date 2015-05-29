"use strict";

var _ = require("underscore");
var fs = require("fs");

exports.write = function (options) {
  var defaultOptions = {
    filePath : "/tmp/raster.nrrd",
  };
  options = _.defaults(options || {}, defaultOptions);
  var grid = options.grid;

  var nrrdHeader = "NRRD0004\n";
  nrrdHeader += "type: uchar\n";
  nrrdHeader += "dimension: 3\n";
  nrrdHeader += "space: right-anterior-superior\n";
  nrrdHeader += "sizes: %columns %rows %slices\n"
    .replace("%columns", grid.dimensions.columns)
    .replace("%rows", grid.dimensions.rows)
    .replace("%slices", grid.dimensions.slices);
  var directions = "(%11,%12,%13) (%21,%22,%23) (%31,%32,%33)"
    .replace("%11", grid._deltaColumn.x)
    .replace("%12", grid._deltaColumn.y)
    .replace("%13", grid._deltaColumn.z)
    .replace("%21", grid._deltaRow.x)
    .replace("%22", grid._deltaRow.y)
    .replace("%23", grid._deltaRow.z)
    .replace("%31", grid._deltaSlice.x)
    .replace("%32", grid._deltaSlice.y)
    .replace("%33", grid._deltaSlice.z);
  nrrdHeader += "space directions: " + directions + "\n";
  nrrdHeader += "kinds: domain domain domain\n";
  nrrdHeader += "endian: little\n";
  nrrdHeader += "encoding: raw\n";
  nrrdHeader += "space origin: (%columnCenter,%rowCenter,%sliceCenter)\n"
    .replace("%columnCenter", grid.origins.columns)
    .replace("%rowCenter", grid.origins.rows)
    .replace("%sliceCenter", grid.origins.slices);
  nrrdHeader += "\n";

  fs.writeFileSync(options.filePath, nrrdHeader);
  fs.appendFileSync(options.filePath, new Buffer(options.raster));
};
