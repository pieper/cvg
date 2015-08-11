var THREE = require("three");
/*
 * Ignore z coordinates and calculate the 2d bounding box of
 * all triangles in this object. Then overlay a uniform grid over
 * the object tag each grid cell that any triangles bounding box touches.
 * Then use the x,y coordinate of the point of interest to collect triangles
 * that potentially overlap and do the 3d intersection tests on those.
 */

// that's addContainsPoint:
module.exports = function(geometry) {
  // grid size: customizable -> larger should be faster at more mem
  var gridLength = 100; // num cells are gridLength^2
  /*
   * first, set up the grid to tag triangles
   */
  geometry.aabbGrid = new Array(gridLength);
  for (var i = 0; i < gridLength; i++) {
    geometry.aabbGrid[i] = new Array(gridLength);
  }

  geometry.computeBoundingBox();
  //get rid of negative coordinates which would cause array out of bounds
  var offsetx = -geometry.boundingBox.min.x;
  var offsety = -geometry.boundingBox.min.y;
  // cell size
  var scalex = gridLength / (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
  var scaley = gridLength / (geometry.boundingBox.max.y - geometry.boundingBox.min.y);

  var triVerts = [];
  var box = new THREE.Box2(); //2d bounding box calculator for triangle

  geometry.faces.forEach(function(face, idx) {
    var triVerts = [
      geometry.vertices[face.a],
      geometry.vertices[face.b],
      geometry.vertices[face.c]
    ];
    box.setFromPoints(triVerts); //this will use the triVerts vectors as if they were 2d vectors
    for (var y = (offsety + box.min.y) * scaley; y < (offsety + box.max.y) * scaley; y++) {
      for (var x = (offsetx + box.min.x) * scalex; x < (offsetx + box.max.x) * scalex; x++) {
        var xx = Math.floor(x);
        var yy = Math.floor(y);
        //append face index to all cells
        if (typeof geometry.aabbGrid[yy][xx] == 'undefined') {
          //make new list at this location
          geometry.aabbGrid[yy][xx] = [];
        }
        geometry.aabbGrid[yy][xx].push(idx); //add triangle to this grid cell
      }
    }
  });

  /*
   * calculate using the grid
   */
  geometry.containsPoint = function(p) {

    //convert world space point into cell space
    var xx = Math.floor((offsetx + p.x) * scalex);
    var yy = Math.floor((offsety + p.y) * scaley);

    //check for point off-grid
    if (xx < 0 || yy < 0 || xx >= gridLength || yy >= gridLength) {
      return false;
    }

    // check if any triangles in this cell
    if (typeof geometry.aabbGrid[yy][xx] == 'undefined') {
      return false;
    }

    // unclosed object, shouldn't happen
    // TODO: throw or return false?
    if (geometry.aabbGrid[yy][xx].length == 1) {
      throw('this polyhedron is not closed');
      // return false;
    }

    var rayDir = new THREE.Vector3(0, 0, 1);
    var ray = new THREE.Ray(p, rayDir);
    var count = 0;

    geometry.aabbGrid[yy][xx].forEach(function(triIdx) {
      var intersection = ray.intersectTriangle(
        geometry.vertices[geometry.faces[triIdx].a],
        geometry.vertices[geometry.faces[triIdx].b],
        geometry.vertices[geometry.faces[triIdx].c],
        false
      );

      if (intersection !== null) {
        //count number of intersections on one side of point of interest
        if (intersection.z >= ray.origin.z) {
          count++;
        }
      }
    });
    // even intersections mean point is outside
    return (count % 2 !== 0);
  };
};
