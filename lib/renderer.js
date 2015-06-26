var THREE = require("three");
var OrbitControls = require('three-orbit-controls')(THREE);


exports.Renderer = function(meshes) {
  this.init();
  meshes.forEach(function(mesh) {
    this.scene_.add(mesh);
  }, this);
};

exports.Renderer.prototype.init = function() {
  var container, scene, camera, renderer, controls, stats;
  // scene
  scene = new THREE.Scene();
  // camera
  var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;
  var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 20000;
  camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
  scene.add(camera);

  // add grid bounding box to scene
  // boundingLines().forEach(function(l) {
  //   var lineGeometry = new THREE.Geometry();
  //   lineGeometry.vertices.push(l[0], l[1]);
  //   scene.add(new THREE.Line(lineGeometry,
  //     new THREE.LineBasicMaterial({color: 0x0, lineWidth: 10})));
  // });

  var gridSize = 200; // 400 x 400 mm
  var gridStep = 10; // centimeters
  var gridHelper = new THREE.GridHelper( gridSize, gridStep );
  scene.add( gridHelper );
  scene.add( new THREE.AxisHelper(gridSize) );

  camera.position.set(100,100,60);
  camera.lookAt(scene.position);
  // renderer
  renderer = new THREE.WebGLRenderer( {antialias:true} );
  renderer.setSize(SCREEN_WIDTH, SCREEN_HEIGHT);
  var bgColor = new THREE.Color();
  bgColor.setRGB(0.9, 0.9, 0.9);
  renderer.setClearColor(bgColor);
  // controls
  controls = new OrbitControls(camera, renderer.domElement);
  container = document.getElementById( 'render' );
  container.appendChild( renderer.domElement );
  // light
  var lightPositions = [ [2000,2000,2000], [-2000,2000,-2000] ];
  lightPositions.forEach(function(position) {
    var light = new THREE.PointLight(0xbbb);
    light.position.fromArray(position);
    scene.add(light);
  });

  this.renderer_ = renderer;
  this.scene_ = scene;
  this.controls_ = controls;
  this.camera_ = camera;
};

exports.Renderer.prototype.animate = function() {
  requestAnimationFrame(this.animate.bind(this));
  this.renderer_.render(this.scene_, this.camera_);
  this.controls_.update();
};