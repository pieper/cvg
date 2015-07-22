var _ = require("underscore");
var THREE = require("three");


exports.Expression = function(options) {
  var o = options.origin || [0,0,0];
  this.operands = options.operands || [];
  this.origin = new THREE.Vector3(o[0], o[1], o[2]);
};

exports.Expression.prototype.local = function(point) {
  return point.clone().sub(this.origin);
};
// return r, 0<azimuth<2Pi, 0<inclination<Pi
exports.Expression.prototype.vector3ToSpherical = function(point) {
  var d = point.length();
  return ([
    d,
    Math.atan2(point.y, point.x),
    d ? Math.acos(point.z / d) : 0
  ]);
};

exports.Expression.prototype.sphericalToVector3 = function(spherical) {
  var r = spherical[0], phi = spherical[1], the = spherical[2];
  return new THREE.Vector3(
    r * Math.sin(the) * Math.cos(phi),
    r * Math.sin(the) * Math.sin(phi),
    r * Math.cos(the)
  );
};

// virtual
exports.Expression.prototype.evaluate = function(point) {
  return 255;
};

// holds expression constructors
// NOTE: if expressions depend on each other, this might have to be an Array
var expressions = {};

// primitives
expressions.box = {
  construct: function(options) {
    var d = options.dimensions || [0.25, 0.25, 0.25];
    this.dimensions = new THREE.Vector3(d[0], d[1], d[2]);
  },
  evaluate: function(point) {
    var local = this.local(point);
      return ((local.x >= 0 && local.x <= this.dimensions.x &&
               local.y >= 0 && local.y <= this.dimensions.y &&
               local.z >= 0 && local.z <= this.dimensions.z
      ) ? 255 : 0);
  }
};

expressions.sphere = {
  construct: function(options) {
    this.radius = options.radius || 1;
  },
  evaluate: function(point) {
    var local = this.local(point);
    return (local.lengthSq <= this.radius * this.radius
    ) ? 255 : 0;
  }
};

expressions.cylinder = {
  construct: function(options) {
    this.radius = options.radius || 0.5;
    this.radius2 = options.radius2 || this.radius;
    this.length = options.length || 1;
    this.halfLength = this.length / 2.0;
    this.radiusFactor = (this.radius2 - this.radius) / this.length;
  },
  evaluate: function(point) {
    var local = this.local(point);
    var distance = Math.sqrt(
      local.x * local.x +
      local.y * local.y
      );
    var scaledRadius = this.radius + local.z * this.radiusFactor;
    if ( distance <= scaledRadius &&
             local.z <= this.halfLength &&
             local.z >= -this.halfLength) {
      return 255;
    } else {
      return 0;
    }
  }
};

expressions.torus = {
  construct: function(options) {
    this.radius = options.radius || 5;
    this.tube = options.tube || 1;
  },
  evaluate: function(point) {
    var local = this.local(point);
    // z2 + (sqrt(x2 + y2) - a)2 - b2 = 0
    if (local.z * local.z + Math.pow(Math.sqrt(
        local.x * local.x + local.y * local.y) - this.radius, 2) <=
        Math.pow(this.tube/2, 2)) {
      return 255;
    } else {
      return 0;
    }
  }
};

expressions.tetrahedron = {
  construct: function(options) {
    this.radius = options.radius || 1;
  },
  evaluate: function(point) {
    var local = this.local(point);
    var a = Math.abs, sq2 = Math.sqrt(2),
        x = local.x, y = local.y, z = local.z;
    var distance = a(a(a(x)+sq2*y)+a(x)+sq2*z)+a(a(x)+sq2*y)+a(x);
    return (distance <= this.radius) ? 255 : 0;
  }
};

expressions.octahedron = {
  construct: function(options) {
    this.radius = options.radius || 1;
  },
  evaluate: function(point) {
    var local = this.local(point);
    var distance = Math.abs(local.x) +
                   Math.abs(local.y) +
                   Math.abs(local.z);
    return (distance <= this.radius) ? 255 : 0;
  }
};

expressions.loxodrome = {
  construct: function(options) {
    this.radius = options.radius || 5;
    this.tube = options.tube || 1;
    this.slope = options.slope || 0.5;
  },
  evaluate: function(point) {
    var local = this.local(point);
    var spherical = this.vector3ToSpherical(local);
    var r = spherical[0], lam = spherical[1], phi = Math.PI / 2 - spherical[2];

    var dir = Math.sign(phi);
    var i = 0;
    // phi == 0 -> dir = 0 -> while breaks
    while (dir * phi > dir * this.slope * (2 * Math.PI * i + lam)) {
      i += dir;
    }
    // now, phi is between phi0 and phi1
    var phi0 = Math.asin(Math.tanh(this.slope * (lam + 2 * Math.PI * (i - dir))));
    var phi1 = Math.asin(Math.tanh(this.slope * (lam + 2 * Math.PI * i)));
    var x = r * Math.cos(phi), y = r * Math.sin(phi);
    var x0 = this.radius * Math.cos(phi0), y0 = this.radius * Math.sin(phi0);
    var x1 = this.radius * Math.cos(phi1), y1 = this.radius * Math.sin(phi1);
    // this will be replaced by operand check
    if (Math.pow(x - x0, 2) + Math.pow(y - y0, 2) <= Math.pow(this.tube, 2) ||
        Math.pow(x - x1, 2) + Math.pow(y - y1, 2) <= Math.pow(this.tube, 2)) {
      return 255;
    } else {
      return 0;
    }
  }
};

// booleans
expressions.union = {
  construct: function(options) {
  },
  evaluate: function(point) {
    var result = 0;
    for (var i = 0; i < this.operands.length; i++) {
      result = result || this.operands[i].evaluate(point);
    }
    return (result);
  }
};

expressions.difference = {
  construct: function(options) {
  },
  evaluate: function(point) {
    return (this.operands[1].evaluate(point) ? 0 : this.operands[0].evaluate(point));
  }
};

// transforms
expressions.scale = {
  construct: function(options) {
    var f = options.factors || [0.5, 0.5, 0.5];
    this.factors = new THREE.Vector3(f[0], f[1], f[2]);
  },
  evaluate: function(point) {
    var samplePoint = point.clone().divide(this.factors);
    return (this.operands[0].evaluate(samplePoint));
  }
};

expressions.translate = {
  construct: function(options) {
    var o = options.offsets || [0.5, 0.5, 0.5];
    this.offsets = new THREE.Vector3(o[0], o[1], o[2]);
  },
  evaluate: function(point) {
    var samplePoint = point.clone().sub(this.offsets);
    return (this.operands[0].evaluate(samplePoint));
  }
};

expressions.rotate = {
  construct: function(options) {
    var a = options.axis || [1, 0, 0];
    this.axis = new THREE.Vector3(a[0], a[1], a[2]);
    this.angle = (typeof options.angle != 'undefined' ? options.angle : Math.PI/6);
    this.matrix = new THREE.Matrix4();
    this.matrix.makeRotationAxis(this.axis, this.angle);
  },
  evaluate: function(point) {
    var samplePoint = point.clone().applyMatrix4(this.matrix);
    return (this.operands[0].evaluate(samplePoint));
  }
};

// replications
expressions.array = {
  construct: function(options) {
    var s = options.steps || [ 0.3, 0.3, 0.3 ];
    this.steps = new THREE.Vector3(s[0], s[1], s[2]);
    var r = options.repeats || [ 1, 2, 3 ];
    this.repeats = new THREE.Vector3(r[0], r[1], r[2]);
  },
  evaluate: function(point) {
    var samplePoint = new THREE.Vector3();
    var sample = 0;

    for (var slice = 0; slice < this.repeats.z; slice++) {
      samplePoint.setZ(point.z - (slice * this.steps.z));
      for (var row = 0; row < this.repeats.y; row ++) {
        samplePoint.setY(point.y - (row * this.steps.y));
        for (var column = 0; column < this.repeats.x; column ++) {
          samplePoint.setX(point.x - (column * this.steps.x));
          sample = sample || this.operands[0].evaluate(samplePoint);
        }
      }
    }
    return (sample);
  }
};

// 2d expression by cutting through plane.
// later: consider parametrizing 2d shape with t by cutting
// through pieces with h c [0, 1]
expressions.cut = {
  construct: function(options) {
    // lay a plane through object at planeorigin, and then
    // evaluate 2d point along orthonormal basis
    // (basis1 = axisvector, and basis2)
    var p = options.planeorigin || [0, 0, 0];
    this.planeorigin = new THREE.Vector3(p[0], p[1], p[2]);
    var n = options.normal || [0, 0, 1];
    this.normal = new THREE.Vector3(n[0], n[1], n[2]);
    var a = options.axisvector || [1, 0, 0];
    this.basis1 = new THREE.Vector3(a[0], a[1], a[2]);
    // ensure orthogonal
    this.basis1.projectOnPlane(this.normal).normalize();
    // TODO throw error if normal || axisvector ?
    this.basis2 = this.normal.clone().cross(this.basis1).normalize();
  },
  // TODO consider optional shape parametrization with t
  evaluate: function(point2, opt_t) {
    var samplePoint = this.planeorigin.clone().add(
      this.basis1.clone().multiplyScalar(point2.x)).add(
      this.basis2.clone().multiplyScalar(point2.y));
    return this.operands[0].evaluate(samplePoint);
  }
};

expressions.extrude = {
  construct: function(options) {
    this.length = options.length || 1;
  },
  evaluate: function(point) {
    var local = this.local(point);
    return ((local.z >= 0 && local.z <= this.length) ?
        this.operands[0].evaluate(new THREE.Vector2(local.x, local.y)) :
        0);
  }
};

// convert expressions object into actual expressions for export:
Object.keys(expressions).forEach(function(key) {
  var constr = function(options) {
    options = options || {};
    exports.Expression.call(this, options);
    expressions[key].construct.call(this, options);
  };
  constr.prototype = Object.create(exports.Expression.prototype);
  constr.prototype.constructor = constr;
  constr.prototype.evaluate = expressions[key].evaluate;
  // optional other prototype functions in "prototype" member of object
  if (expressions[key].prototype) {
    Object.keys(expressions[key].prototype).forEach(function(method) {
      constr.prototype[method] = expressions[key].prototype[method];
    });
  }
  // and add it to callable functions
  exports[key] = function(options) {
    return new constr(options);
  };
});
