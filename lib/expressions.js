
var _ = require("underscore");


exports.Expression = function(options) {
  options = options || {};
  this.origin = options.origin || [0,0,0];
  this.operands = options.operands || [];
}

exports.Expression.prototype.local = function(point) {
    return ([
      point[0] - this.origin[0],
      point[1] - this.origin[1],
      point[2] - this.origin[2],
    ]);
  }

// virtual
exports.Expression.prototype.operation = function(point) {
  this.operation = function(point) {
    return(255);
  };
};

exports.box = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.dimensions = options.dimensions || [.25, .25, .25];
}
exports.box.prototype = new exports.Expression();
exports.box.prototype.operation = function(point) {
  var local = this.local(point);
  return ((    local[0] < this.dimensions[0]
           &&  local[1] < this.dimensions[1]
           &&  local[2] < this.dimensions[2]
  ) ? 255 : 0);
}

exports.sphere = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.origin = options.origin || [0,0,0];
  this.radius = options.radius || 0.5;
}
exports.sphere.prototype = new exports.Expression();
exports.sphere.prototype.operation = function(point) {
  var local = this.local(point);
  var distance = Math.sqrt(
    local[0] * local[0] +
    local[1] * local[1] +
    local[2] * local[2]);
  if ( distance < this.radius ) {
    return 255;
  } else {
    return 0;
  }
};

exports.union = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
}
exports.union.prototype = new exports.Expression();
exports.union.prototype.operation = function(point) {
  return (this.operands[0].operation(point) || this.operands[1].operation(point));
}


exports.difference = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
}
exports.difference.prototype = new exports.Expression();
exports.difference.prototype.operation = function(point) {
  return (this.operands[0].operation(point) ? 0 : this.operands[1].operation(point));
}


exports.scale = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.factors = options.factors || [.5, .5, .5];
}
exports.scale.prototype = new exports.Expression();
exports.scale.prototype.operation = function(point) {
  return ([
    point[0] / this.factors[0],
    point[1] / this.factors[1],
    point[2] / this.factors[2]
  ]);
}

// TODO
/*
exports.array = new exports.Expression([scale]);
array.origin = [ -.2, -.2, -.2 ];
array.steps = [ .3, .3, .3 ];
array.repeats = [ 1, 2, 3 ];
array.operation = function(point) {
  var local = this.local(point);
  var stepPoint = [];
  for (var i = 0; i < 3; i++) {
  }
  var stepSpace = [
    point[0] / this.steps[0],
    point[1] / this.steps[1],
    point[2] / this.steps[2]]
  return ([
    point[0] / this.factors[0],
    point[1] / this.factors[1],
    point[2] / this.factors[2]
  ]);
}
*/

