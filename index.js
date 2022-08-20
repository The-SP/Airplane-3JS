// import * as THREE from "../node_modules/three/build/three.module.js"
import * as THREE from "three";
import { OrbitControls } from "../node_modules/three/examples/jsm/controls/OrbitControls.js";
import { GUI } from "../node_modules/three/examples/jsm/libs/lil-gui.module.min.js";
import { Sky } from "../node_modules/three/examples/jsm/objects/Sky.js";
import { Water } from "../node_modules/three/examples/jsm/objects/Water.js";
import { GLTFLoader } from "../node_modules/three/examples/jsm/loaders/GLTFLoader.js";

const scene = new THREE.Scene();
// Camera
const camera = new THREE.PerspectiveCamera(
  // PerspectiveCamera(fov, aspect_ratio, near, far_clipping_plane)
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(15, 15, 20);

// Renderer
const renderer = new THREE.WebGL1Renderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Orbit Control
const controls = new OrbitControls(camera, renderer.domElement);
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 10.0;
controls.maxDistance = 200.0;

// Loader
const loader = new GLTFLoader();
let airplane;
loader.load(
  // resource URL
  "resources/A380/scene.gltf",
  // called when the resource is loaded
  function (gltf) {
    airplane = gltf.scene;
    airplane.position.y = 5;
    airplane.scale.set(0.015, 0.015, 0.015);
    scene.add(gltf.scene);
  },
  // called while loading is progressing
  function (xhr) {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  // called when loading has error
  function (error) {
    console.error("Error happened:", error);
  }
);

// CREATE SUN, SKY
// Sun is light source thats infinitely far away
const sun = new THREE.Vector3();

const waterGeometry = new THREE.PlaneBufferGeometry(10000, 10000);
const water = new Water(waterGeometry, {
  textureWidth: 512,
  textureHeight: 512,
  waterNormals: new THREE.TextureLoader().load(
    "textures/waternormals.jpg",
    function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }
  ),
  alpha: 1.0,
  sunDirection: new THREE.Vector3(),
  sunColor: 0xffffff,
  waterColor: 0x001e0f,
  distortionScale: 3.7,
  fog: scene.fog !== undefined,
});
water.rotation.x = -Math.PI / 2;

scene.add(water);

const sky = new Sky();
sky.scale.setScalar(10000);
scene.add(sky);

let uniforms = sky.material.uniforms;
uniforms["turbidity"].value = 10;
uniforms["rayleigh"].value = 2;
uniforms["mieCoefficient"].value = 0.005;
uniforms["mieDirectionalG"].value = 0.8;

const parameters = {
  inclination: 0.4373,
  azimuth: 0.287,
};

const pmremGenerator = new THREE.PMREMGenerator(renderer);

function updateSun() {
  var theta = Math.PI * (parameters.inclination - 0.5);
  var phi = 2 * Math.PI * (parameters.azimuth - 0.5);

  sun.x = Math.cos(phi);
  sun.y = Math.sin(phi) * Math.sin(theta);
  sun.z = Math.sin(phi) * Math.cos(theta);

  sky.material.uniforms["sunPosition"].value.copy(sun);
  water.material.uniforms["sunDirection"].value.copy(sun).normalize();

  scene.environment = pmremGenerator.fromScene(sky).texture;
}

updateSun();

// AMBIENT LIGHT -----------------------------------
let ambientLight = new THREE.AmbientLight(0xffffff, 0.001);
scene.add(ambientLight);
// POINT LIGHT
let pointLight = new THREE.PointLight(0x097969, 0.1);
pointLight.position.set(-15, 10, 5);
scene.add(pointLight);
// POINT LIGHT HELPER
const lightHelper = new THREE.PointLightHelper(pointLight);
scene.add(lightHelper);

// Airplane Controls
let enableRotatePlane = true;
const airplaneParameters = {
  // Airplane
  rotation: true,
  positionX: 0,
  positionY: 5,
  positionZ: 0,
  scale: 1,
  // Light
  "ambient color": ambientLight.color.getHex(),
  "ambient intensity": ambientLight.intensity,
  "pointLight color": pointLight.color.getHex(),
  "pointLight intensity": pointLight.intensity,
};
function guiControl() {
  // GUI Control Box
  const gui = new GUI();

  const skyFolder = gui.addFolder("Sky");
  skyFolder.add(parameters, "inclination", 0, 0.5, 0.0001).onChange(updateSun);
  skyFolder.add(parameters, "azimuth", 0, 1, 0.0001).onChange(updateSun);
  skyFolder.open();

  const waterFolder = gui.addFolder("Water");
  waterFolder
    .add(water.material.uniforms.distortionScale, "value", 0, 8, 0.1)
    .name("distortionScale");
  waterFolder
    .add(water.material.uniforms.size, "value", 0.1, 10, 0.1)
    .name("size");
  waterFolder.open();

  const airplaneFolder = gui.addFolder("Airplane");
  airplaneFolder
    .add(airplaneParameters, "rotation")
    .onChange(() => (enableRotatePlane = !enableRotatePlane));
  airplaneFolder
    .add(airplaneParameters, "positionX", -50, 50, 0.1)
    .onChange((newX) => (airplane.position.x = newX));
  airplaneFolder
    .add(airplaneParameters, "positionY", -10, 50, 0.1)
    .onChange((newY) => (airplane.position.y = newY));
  airplaneFolder
    .add(airplaneParameters, "positionZ", -50, 50, 0.1)
    .onChange((newZ) => (airplane.position.z = newZ));
  airplaneFolder
    .add(airplaneParameters, "scale", 0.5, 2, 0.1)
    .onChange((s) => airplane.scale.set(s * 0.015, s * 0.015, s * 0.015));
  airplaneFolder.open();

  const lightFolder = gui.addFolder("Lighting");
  lightFolder
    .addColor(airplaneParameters, "ambient color")
    .onChange((col) => ambientLight.color.setHex(col));
  lightFolder
    .add(airplaneParameters, "ambient intensity", 0.001, 1, 0.0001)
    .onChange((intensity) => (ambientLight.intensity = intensity));
  lightFolder
    .addColor(airplaneParameters, "pointLight color")
    .onChange((col) => pointLight.color.setHex(col));
  lightFolder
    .add(airplaneParameters, "pointLight intensity", 0.001, 2, 0.0001)
    .onChange((intensity) => (pointLight.intensity = intensity));
  lightFolder.open();
}
guiControl();

// Render loop to draw the scene every time the screen refreshes
function animate() {
  requestAnimationFrame(animate);

  // Rotation
  //   const time = performance.now() * 0.001;
  if (enableRotatePlane) airplane.rotation.y += 0.01;

  // water update
  water.material.uniforms["time"].value += 1.0 / 60.0;

  renderer.render(scene, camera);
}
animate();
