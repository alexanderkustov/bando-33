import * as THREE from 'three';

const WIDTH = 320;
const HEIGHT = 220;
const previews = [];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let renderer;
let animationFrame;
let lastFrame = 0;

const palettes = [
  { roof: 0x3f6280, timber: 0xb94a34, wall: 0xefd0a5, accent: 0xdf7441, pad: 0xd8c58c },
  { roof: 0x403746, timber: 0xa83f31, wall: 0xeed4ae, accent: 0xd3943d, pad: 0xcfbc82 },
  { roof: 0xb9843f, timber: 0x704432, wall: 0xd9a25d, accent: 0xa95c3d, pad: 0xd1b96f },
  { roof: 0x98463b, timber: 0xb83c2f, wall: 0xdfb36e, accent: 0xd79a3e, pad: 0xcfb15d },
  { roof: 0x4d6658, timber: 0x8d4d37, wall: 0xe6cda0, accent: 0xc36c3b, pad: 0xc6b676 }
];

function getRenderer() {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.setPixelRatio(1);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  return renderer;
}

function material(colour, roughness = .78, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color: colour, roughness, metalness, flatShading: true });
}

function makeGabledRoof(width, depth, height) {
  const w = width / 2;
  const d = depth / 2;
  const ridge = width * .28;
  const vertices = [
    -w,-d,0, w,-d,0, ridge,0,height, -w,-d,0, ridge,0,height, -ridge,0,height,
    -w,d,0, ridge,0,height, w,d,0, -w,d,0, -ridge,0,height, ridge,0,height,
    -w,-d,0, -ridge,0,height, -w,d,0, w,-d,0, w,d,0, ridge,0,height, w,-d,0, ridge,0,height
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeTempleModel(temple) {
  const palette = palettes[temple.num % palettes.length];
  const group = new THREE.Group();
  const mats = {
    roof: material(palette.roof, .66), timber: material(palette.timber, .8),
    wall: material(palette.wall, .9), accent: material(palette.accent, .72),
    pad: material(palette.pad, .95), gold: material(0xd5a74e, .48, .12)
  };
  const add = mesh => { mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh; };
  const box = (w,d,h,mat,x=0,y=0,z=0) => { const mesh=add(new THREE.Mesh(new THREE.BoxGeometry(w,d,h),mat)); mesh.position.set(x,y,z); return mesh; };
  const padGeometry = new THREE.CylinderGeometry(.92,.98,.18,6); padGeometry.rotateX(Math.PI/2); padGeometry.rotateZ(Math.PI/6);
  const pad = add(new THREE.Mesh(padGeometry,mats.pad)); pad.position.z=.01;
  const squareRoof = new THREE.ConeGeometry(1,1,4); squareRoof.rotateX(Math.PI/2); squareRoof.rotateZ(Math.PI/4);
  const octRoof = new THREE.ConeGeometry(1,1,8); octRoof.rotateX(Math.PI/2);
  const roof = (radius,height,z) => { const mesh=add(new THREE.Mesh(squareRoof,mats.roof)); mesh.scale.set(radius,radius,height); mesh.position.z=z; return mesh; };
  const variant = temple.num % 4;

  if (variant === 0) {
    box(1.12,.82,.13,mats.accent,0,0,.18); box(.91,.66,.5,mats.wall,0,0,.47);
    [[-.39,-.28],[.39,-.28],[-.39,.28],[.39,.28]].forEach(([x,y]) => box(.07,.07,.53,mats.timber,x,y,.47));
    roof(.82,.36,.78); box(.5,.41,.32,mats.wall,0,0,1.01); roof(.6,.27,1.23); box(.4,.06,.07,mats.accent,0,0,1.39);
  } else if (variant === 1) {
    box(.84,.66,.13,mats.accent,0,0,.17);
    [[.62,.43,.34,.59,.45],[.53,.37,.3,.96,.79],[.43,.31,.25,1.26,1.12]].forEach(([w,d,h,roofZ,bodyZ],index) => {
      box(w,d,h,mats.wall,0,0,bodyZ); box(w+.08,d+.08,.06,mats.timber,0,0,bodyZ+h/2); roof(.7-index*.11,.24-index*.025,roofZ);
    });
    const finial=add(new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.28,7),mats.gold)); finial.rotation.x=Math.PI/2; finial.position.z=1.47;
  } else if (variant === 2) {
    box(1.22,.88,.14,mats.timber,0,0,.18);
    [[-.46,-.3],[0,-.3],[.46,-.3],[-.46,.3],[0,.3],[.46,.3]].forEach(([x,y]) => box(.075,.075,.7,mats.timber,x,y,.52));
    box(1.2,.86,.08,mats.accent,0,0,.55); box(.96,.62,.42,mats.wall,0,0,.8);
    const hallRoof=add(new THREE.Mesh(makeGabledRoof(1.42,1.02,.42),mats.roof)); hallRoof.position.z=.9;
    box(.7,.07,.07,mats.accent,0,-.03,1.37); box(.64,.25,.07,mats.wall,0,-.52,.2); box(.5,.2,.07,mats.wall,0,-.65,.11);
  } else {
    const body=add(new THREE.Mesh(new THREE.CylinderGeometry(.56,.61,.58,8),mats.wall)); body.rotation.x=Math.PI/2; body.position.z=.49;
    for(let i=0;i<8;i++){const angle=i*Math.PI/4,post=add(new THREE.Mesh(new THREE.CylinderGeometry(.028,.04,.65,6),mats.timber)); post.rotation.x=Math.PI/2; post.position.set(Math.cos(angle)*.57,Math.sin(angle)*.57,.51);}
    const pavilionRoof=add(new THREE.Mesh(octRoof,mats.roof)); pavilionRoof.scale.set(.86,.86,.4); pavilionRoof.position.z=.91;
    const finial=add(new THREE.Mesh(new THREE.SphereGeometry(.09,10,7),mats.gold)); finial.position.z=1.2;
  }
  group.rotation.x = .025;
  return group;
}

function makePreview(temple) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(27, WIDTH / HEIGHT, .1, 30);
  camera.up.set(0,0,1); camera.position.set(3.1,-5.1,2.85); camera.lookAt(0,0,.62);
  scene.add(new THREE.HemisphereLight(0xfff4dc,0x6c7e75,2.8));
  const key = new THREE.DirectionalLight(0xffd6ae,4.2); key.position.set(-3,-4,7); scene.add(key);
  const fill = new THREE.DirectionalLight(0x9bc4c5,1.15); fill.position.set(4,2,3); scene.add(fill);
  const model = makeTempleModel(temple); scene.add(model);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1.1,32),new THREE.MeshBasicMaterial({color:0x6e5548,transparent:true,opacity:.1,depthWrite:false})); shadow.scale.y=.47; shadow.position.z=-.09; scene.add(shadow);
  return { scene, camera, model, phase: temple.num * .37 };
}

function paintFallback(canvas) {
  const context = canvas.getContext('2d');
  context.clearRect(0,0,canvas.width,canvas.height);
  context.fillStyle = 'rgba(157,59,49,.12)'; context.beginPath(); context.arc(canvas.width/2,canvas.height/2,52,0,Math.PI*2); context.fill();
  context.fillStyle = '#9d3b31'; context.font = '64px Yu Mincho, serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText('寺',canvas.width/2,canvas.height/2);
}

function renderPreviews(time = 0) {
  animationFrame = 0;
  if (document.hidden || (!reduceMotion && time-lastFrame<42)) { schedule(); return; }
  lastFrame = time;
  const webgl = getRenderer();
  for (let index=previews.length-1; index>=0; index--) {
    const preview = previews[index];
    if (!preview.canvas.isConnected) { previews.splice(index,1); continue; }
    const rect = preview.canvas.getBoundingClientRect();
    if (rect.bottom<0 || rect.top>innerHeight || rect.right<0 || rect.left>innerWidth) continue;
    preview.model.rotation.z = reduceMotion ? -.18 : time*.00028+preview.phase;
    preview.model.position.z = reduceMotion ? 0 : Math.sin(time*.0012+preview.phase)*.018;
    webgl.render(preview.scene,preview.camera);
    preview.context.clearRect(0,0,WIDTH,HEIGHT);
    preview.context.drawImage(webgl.domElement,0,0,WIDTH,HEIGHT);
  }
  if (!reduceMotion) schedule();
}

function schedule() {
  if (!animationFrame && previews.length) animationFrame=requestAnimationFrame(renderPreviews);
}

export function mountTemplePreview(canvas, temple) {
  try {
    const preview = makePreview(temple);
    preview.canvas = canvas;
    preview.context = canvas.getContext('2d');
    previews.push(preview);
    schedule();
  } catch (error) {
    paintFallback(canvas);
    console.warn('Temple preview unavailable',error);
  }
}
