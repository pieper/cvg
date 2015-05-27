var _ = require("underscore");
var THREE = require("three");


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
exports.Expression.prototype.evaluate = function(point) {
  return 255;
}

// primitives
exports.box = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.dimensions = options.dimensions || [.25, .25, .25];
}
exports.box.prototype = new exports.Expression();
exports.box.prototype.evaluate = function(point) {
  var local = this.local(point);
  return ((    local[0] > 0 && local[0] < this.dimensions[0]
           &&  local[1] > 0 && local[1] < this.dimensions[1]
           &&  local[2] > 0 && local[2] < this.dimensions[2]
  ) ? 255 : 0);
}

exports.sphere = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.origin = options.origin || [0,0,0];
  this.radius = options.radius || 0.5;
}
exports.sphere.prototype = new exports.Expression();
exports.sphere.prototype.evaluate = function(point) {
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
}

exports.cylinder = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.radius = options.radius || 0.5;
  this.radius2 = options.radius2 || this.radius;
  this.length = options.length || 1;
  this.halfLength = this.length / 2.;
  this.radiusFactor = (this.radius2 - this.radius) / this.length;
}
exports.cylinder.prototype = new exports.Expression();
exports.cylinder.prototype.evaluate = function(point) {
  var local = this.local(point);
  var distance = Math.sqrt(
    local[0] * local[0] +
    local[1] * local[1]
    );
  var scaledRadius = this.radius + local[2] * this.radiusFactor;
  if ( distance < scaledRadius
        && local[2] < this.halfLength
        && local[2] > -this.halfLength) {
    return 255;
  } else {
    return 0;
  }
}

// booleans
exports.union = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
}
exports.union.prototype = new exports.Expression();
exports.union.prototype.evaluate = function(point) {
  var result = 0;
  for (var i = 0; i < this.operands.length; i++) {
    result = result || this.operands[i].evaluate(point);
  }
  return (result);
}

exports.difference = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
}
exports.difference.prototype = new exports.Expression();
exports.difference.prototype.evaluate = function(point) {
  return (this.operands[1].evaluate(point) ? 0 : this.operands[0].evaluate(point));
}

// transforms
exports.scale = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.factors = options.factors || [.5, .5, .5];
}
exports.scale.prototype = new exports.Expression();
exports.scale.prototype.evaluate = function(point) {
  var samplePoint = [
    point[0] / this.factors[0],
    point[1] / this.factors[1],
    point[2] / this.factors[2]
  ];
  return (this.operands[0].evaluate(samplePoint));
}

exports.translate = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.offsets = options.offsets || [.5, .5, .5];
}
exports.translate.prototype = new exports.Expression();
exports.translate.prototype.evaluate = function(point) {
  var samplePoint = [
    point[0] - this.offsets[0],
    point[1] - this.offsets[1],
    point[2] - this.offsets[2]
  ];
  return (this.operands[0].evaluate(samplePoint));
}

exports.rotate = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.axis = options.axis || [1, 0, 0];
  this.angle = options.angle || 30.;
  this.matrix = new THREE.Matrix4();
  var v = new THREE.Vector3(this.axis[0],this.axis[1],this.axis[2]);
  this.matrix.makeRotationAxis(v, this.angle);
}
exports.rotate.prototype = new exports.Expression();
exports.rotate.prototype.evaluate = function(point) {
  var p = new THREE.Vector3(point[0], point[1], point[2]);
  p.applyMatrix4(this.matrix);
  var samplePoint = [p.x, p.y, p.z];
  return (this.operands[0].evaluate(samplePoint));
}

// replications
exports.array = function(options) {
  options = options || {};
  exports.Expression.call(this,options);
  this.steps = options.steps || [ .3, .3, .3 ];
  this.repeats = options.repeats || [ 1, 2, 3 ];
}
exports.array.prototype = new exports.Expression();
exports.array.prototype.evaluate = function(point) {
  var samplePoint = [0,0,0];
  var sample = 0;

  for (var slice = 0; slice < this.repeats[2]; slice += 1) {
    samplePoint[2] = point[2] - (slice * this.steps[2]);
    for (var row = 0; row < this.repeats[1]; row += 1) {
      samplePoint[1] = point[1] - (row * this.steps[1]);
      for (var column = 0; column < this.repeats[0]; column += 1) {
        samplePoint[0] = point[0] - (column * this.steps[0]);
        sample = sample || this.operands[0].evaluate(samplePoint);
      }
    }
  }
  return (sample);
}
