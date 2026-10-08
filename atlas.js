import * as THREE from 'three';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { TEMPLES } from './data/itinerary.js';

const canvas = document.getElementById('atlasCanvas');
const stage = document.getElementById('atlasStage');
const loading = document.getElementById('atlasLoading');
const tooltip = document.getElementById('atlasTooltip');
const focus = document.getElementById('atlasFocus');
const mapLink = document.getElementById('atlasMap');
const done = new Set();
const colours = {
  ink: 0x29251f, vermilion: 0xb94b36, pine: 0x4f6d54, paper: 0xe9e1cf,
  water: 0x769da0, shore: 0xd6c695, grass: 0xb2bc78, upland: 0x73875a,
  mountain: 0x66705c, field: 0xc7aa68, road: 0xe3c37a
};
const mapGroup = new THREE.Group();
const terrainMeshes = [];
// Exact shrine positions supplied as latitude/longitude. These replace the
// former city-centre approximations and keep the route geographically honest.
const templeCoords = {
  1:[139.567444,35.322611], 2:[139.572306,35.305056], 3:[139.555278,35.314167],
  4:[139.533056,35.3125], 5:[139.164333,35.280028], 6:[139.303833,35.471611],
  7:[139.288778,35.35875], 8:[139.398889,35.484889], 9:[139.229889,36.010944],
  10:[139.362361,36.001389], 11:[139.438278,36.054333], 12:[139.710778,35.979444],
  13:[139.79675,35.714722], 14:[139.597417,35.424167], 15:[138.932639,36.385278],
  16:[138.945278,36.479333], 17:[139.58925,36.475528], 18:[139.491667,36.730917],
  19:[139.820917,36.596222], 20:[140.117361,36.452778], 21:[140.273722,36.921194],
  22:[140.504667,36.526028], 23:[140.259611,36.386306], 24:[140.120833,36.330833],
  25:[140.099417,36.212639], 26:[140.167361,36.165194], 27:[140.840611,35.731944],
  28:[140.341944,35.867083], 29:[140.131694,35.595139], 30:[139.994444,35.338806],
  31:[140.198917,35.399611], 32:[140.356333,35.290139], 33:[139.857972,35.025556]
};
const sourceCoord = temple => templeCoords[temple.num] || [140,35.5];
function updateAtlasProgress(event) {
  const progress = event?.detail?.state || JSON.parse(localStorage.getItem('bando33-jiku-v5') || '{}');
  done.clear(); Object.keys(progress).filter(Number).forEach(num => done.add(Number(num)));
  document.getElementById('atlasDoneCount').textContent = done.size;
  markers.forEach(marker => {
    const colour = done.has(marker.userData.temple.num) ? colours.pine : colours.vermilion;
    marker.traverse(part => { if (part.userData.vermilion) part.material.color.setHex(colour); });
  });
}
const toWorld = ([lon, lat]) => new THREE.Vector3((lon - 139.9) * 6.2, (lat - 35.95) * 6.4, 0);
const kantoOutline = [[138.72,36.78],[139.22,37.08],[139.92,37.1],[140.38,36.96],[140.65,36.7],[140.78,36.3],[140.84,35.92],[140.9,35.72],[140.56,35.53],[140.43,35.25],[140.2,35.0],[139.87,34.95],[139.74,35.12],[139.78,35.31],[139.91,35.45],[140.03,35.53],[140.0,35.63],[139.87,35.63],[139.72,35.5],[139.58,35.31],[139.47,35.22],[139.25,35.25],[138.62,35.23],[138.56,35.5],[138.82,35.8],[138.67,36.2]];

let scene, camera, renderer, controls, raycaster, pointer, markers = [], selected = null, raf;
try { init(); } catch (error) { loading.textContent = 'The atlas could not load in this browser. The itinerary below is still fully available.'; console.error(error); }

function init() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xb9ccca); scene.fog = new THREE.Fog(0xb9ccca, 34, 58);
  // Classic orthographic isometric view: equal X/Y angle and roughly 35° above the ground.
  camera = new THREE.OrthographicCamera(-12, 12, 9, -9, .1, 100); camera.position.set(22, -22, 22.5); camera.lookAt(0, 0, 0);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(stage.clientWidth, stage.clientHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  controls = new TrackballControls(camera, canvas); controls.rotateSpeed = 2.2; controls.zoomSpeed = 1; controls.panSpeed = .45; controls.staticMoving = false; controls.dynamicDampingFactor = .12; controls.minZoom = .72; controls.maxZoom = 3.6;
  scene.add(new THREE.HemisphereLight(0xfff3cf, 0x526d74, 2.2)); const sun = new THREE.DirectionalLight(0xffe0aa, 4.2); sun.position.set(-14, -10, 24); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-16; sun.shadow.camera.right=16; sun.shadow.camera.top=16; sun.shadow.camera.bottom=-16; scene.add(sun);
  scene.add(mapGroup); makeKanto(); makeMarkers(); raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
  canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('click', onClick); window.addEventListener('resize', resize); document.getElementById('atlasReset').addEventListener('click', resetView); document.getElementById('atlasZoomIn').addEventListener('click', () => zoomBy(1.25)); document.getElementById('atlasZoomOut').addEventListener('click', () => zoomBy(.8)); document.getElementById('atlasTiltLeft').addEventListener('click', () => rollView(-Math.PI/18)); document.getElementById('atlasTiltRight').addEventListener('click', () => rollView(Math.PI/18)); window.addEventListener('bando:progress', updateAtlasProgress);
  document.getElementById('atlasVisibleCount').textContent = TEMPLES.length; buildTempleIndex(); updateAtlasProgress(); resize(); loading.remove(); animate();
}
function buildTempleIndex() { const list=document.getElementById('atlasIndex'); [...TEMPLES].sort((a,b)=>a.num-b.num).forEach(t => { const button=document.createElement('button'); button.type='button'; button.dataset.temple=t.num; button.innerHTML='<span class="index-num">'+String(t.num).padStart(2,'0')+'</span><span><strong>'+t.romaji+'</strong><small>'+t.city+'</small></span>'; button.addEventListener('click',()=>select(t)); list.appendChild(button); }); }
function makeLand(points, colour, height = 0, depth = .42) {
  const shape = new THREE.Shape(points.map(pair => { const p=toWorld(pair); return new THREE.Vector2(p.x,p.y); }));
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.12,bevelThickness:.08}),new THREE.MeshStandardMaterial({color:colour,roughness:.92,flatShading:true}));
  mesh.position.z=height; mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.isTerrain=true; terrainMeshes.push(mesh); mapGroup.add(mesh); return mesh;
}
function groundHeightAt(position) {
  const groundRay=new THREE.Raycaster(new THREE.Vector3(position.x,position.y,20),new THREE.Vector3(0,0,-1));
  return groundRay.intersectObjects(terrainMeshes,false)[0]?.point.z ?? .5;
}
function addMountain(lon,lat,size=1) {
  const p=toWorld([lon,lat]), group=new THREE.Group(); group.position.set(p.x,p.y,.5);
  const rock=new THREE.Mesh(new THREE.ConeGeometry(.48*size,1.25*size,6),new THREE.MeshStandardMaterial({color:colours.mountain,roughness:1,flatShading:true})); rock.rotation.x=Math.PI/2; rock.position.z=.58*size; rock.castShadow=true; group.add(rock);
  const cap=new THREE.Mesh(new THREE.ConeGeometry(.2*size,.38*size,6),new THREE.MeshStandardMaterial({color:0xe9e1ce,roughness:1,flatShading:true})); cap.rotation.x=Math.PI/2; cap.position.z=1.05*size; group.add(cap); mapGroup.add(group);
}
function addFuji() {
  const p=toWorld([138.7274,35.3606]), group=new THREE.Group(); group.position.set(p.x,p.y,.48);
  const base=new THREE.Mesh(new THREE.ConeGeometry(1.32,2.75,12),new THREE.MeshStandardMaterial({color:0x59675e,roughness:.96,flatShading:true})); base.rotation.x=Math.PI/2; base.position.z=1.32; base.castShadow=true; base.receiveShadow=true; group.add(base);
  const snow=new THREE.Mesh(new THREE.ConeGeometry(.63,1.12,12),new THREE.MeshStandardMaterial({color:0xf4efe2,roughness:.9,flatShading:true})); snow.rotation.x=Math.PI/2; snow.position.z=2.18; snow.castShadow=true; group.add(snow);
  const foothill=new THREE.Mesh(new THREE.CylinderGeometry(1.48,1.62,.16,12),new THREE.MeshStandardMaterial({color:0x697956,roughness:1,flatShading:true})); foothill.rotation.x=Math.PI/2; foothill.position.z=.08; foothill.receiveShadow=true; group.add(foothill);
  mapGroup.add(group);
}
function addTree(lon,lat,size=1) {
  const p=toWorld([lon,lat]), group=new THREE.Group(); group.position.set(p.x,p.y,.48);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.035,.05,.28,6),new THREE.MeshStandardMaterial({color:0x674b35,roughness:1})); trunk.rotation.x=Math.PI/2; trunk.position.z=.14; group.add(trunk);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(.18*size,.55*size,7),new THREE.MeshStandardMaterial({color:size>.9?0x49684d:0x5d7852,roughness:1,flatShading:true})); crown.rotation.x=Math.PI/2; crown.position.z=.5*size; crown.castShadow=true; group.add(crown); mapGroup.add(group);
}
function addLake(lon,lat,width,height) {
  const p=toWorld([lon,lat]), lake=new THREE.Mesh(new THREE.CircleGeometry(width,24),new THREE.MeshStandardMaterial({color:0x659397,roughness:.55,metalness:.05})); lake.position.set(p.x,p.y,.51); lake.scale.y=height/width; mapGroup.add(lake);
}
function makeKanto() {
  const water=new THREE.Mesh(new THREE.BoxGeometry(22,20,.45),new THREE.MeshStandardMaterial({color:colours.water,roughness:.82,metalness:.04})); water.position.z=-.34; water.receiveShadow=true; mapGroup.add(water);
  makeLand(kantoOutline,colours.shore,-.02,.46);
  makeLand(kantoOutline,colours.grass,.18,.28);
  // Broad elevation terraces model the real low plain with mountain rims to the west and north.
  makeLand([[138.56,35.5],[138.62,35.23],[139.25,35.25],[139.4,35.55],[139.35,35.9],[139.55,36.25],[139.72,36.55],[139.72,37.08],[139.22,37.08],[138.72,36.78],[138.67,36.2],[138.82,35.8]],0x8fa169,.43,.18);
  makeLand([[138.62,35.35],[139.05,35.32],[139.18,35.55],[139.12,35.85],[139.38,36.18],[139.5,36.55],[139.45,36.92],[138.85,36.85],[138.65,36.3]],colours.upland,.59,.2);
  makeLand([[139.35,36.65],[139.55,37.02],[140.38,36.96],[140.65,36.7],[140.5,36.42],[140.1,36.48],[139.75,36.58]],0x7f9160,.48,.18);
  makeLand([[138.62,35.23],[139.25,35.25],[139.45,35.42],[139.35,35.62],[139.08,35.7],[138.56,35.5]],0x7b8c5c,.54,.17);
  makeLand([[139.87,34.95],[140.2,35.0],[140.43,35.25],[140.35,35.48],[140.1,35.52],[139.91,35.45],[139.78,35.31],[139.74,35.12]],0x91a46a,.42,.14);
  makeLand([[140.01,36.1],[140.08,36.3],[140.2,36.34],[140.28,36.16],[140.2,36.02]],0x879b62,.45,.12);
  addFuji();
  addLake(140.37,36.04,.74,.34); addLake(139.48,36.74,.36,.15);
  [[139.02,36.68,1.12],[139.22,36.82,.92],[139.48,36.83,1.18],[139.68,36.76,.78],[138.9,36.3,.9],[139.1,36.08,.82],[139.18,35.82,.72],[139.12,35.57,.68],[139.32,35.5,.55],[140.18,36.8,.72],[140.4,36.74,.82],[140.55,36.58,.64],[140.1,36.25,.58],[140.22,35.32,.42]].forEach(m=>addMountain(...m));
  [[139.23,36.18],[139.38,36.25],[139.52,36.35],[139.15,35.78],[139.32,35.72],[139.04,35.5],[139.42,36.62],[139.75,36.8],[140.2,36.65],[140.4,36.5],[140.34,36.3],[140.22,35.35],[140.38,35.18],[140.04,35.2],[139.9,35.08]].forEach((t,i)=>addTree(t[0],t[1],.72+(i%3)*.12));
  [[140.12,35.88,.72],[140.36,36.05,.6],[139.72,36.14,.55],[139.56,35.68,.48]].forEach(([lon,lat,s])=>{ const p=toWorld([lon,lat]); const field=new THREE.Mesh(new THREE.CircleGeometry(s,6),new THREE.MeshStandardMaterial({color:colours.field,roughness:1,flatShading:true})); field.position.set(p.x,p.y,.5); field.scale.y=.55; mapGroup.add(field); });
}
function makeNumberBadge(num) {
  const label=document.createElement('canvas'); label.width=128; label.height=64; const context=label.getContext('2d');
  context.fillStyle='rgba(38,31,25,.92)'; context.beginPath(); context.roundRect(18,8,92,48,22); context.fill();
  context.strokeStyle='#e6c982'; context.lineWidth=4; context.stroke(); context.fillStyle='#fff7df'; context.font='600 30px Georgia'; context.textAlign='center'; context.textBaseline='middle'; context.fillText(String(num),64,33);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(label),transparent:true,depthTest:false})); sprite.scale.set(.75,.38,1); sprite.position.z=1.55; sprite.renderOrder=4; return sprite;
}
function makeMarkers() { TEMPLES.forEach((temple) => { const pos=toWorld(sourceCoord(temple)); const group=new THREE.Group(); group.position.copy(pos); group.position.z=groundHeightAt(pos)+.025; group.scale.setScalar(.62);
    const dark = new THREE.MeshStandardMaterial({color:0x30261f, roughness:.78});
    const vermilion = new THREE.MeshStandardMaterial({color:0xb84b35, roughness:.62});
    const gold = new THREE.MeshStandardMaterial({color:0xd3a45c, roughness:.5, metalness:.15});
    const pick = (mesh, isVermilion=false) => { mesh.userData.temple=temple; mesh.userData.vermilion=isVermilion; mesh.castShadow=true; group.add(mesh); return mesh; };
    // A restrained torii silhouette that remains readable from directly above.
    const left = pick(new THREE.Mesh(new THREE.CylinderGeometry(.075,.105,.86,10), vermilion),true); left.rotation.x=Math.PI/2; left.position.set(-.25,0,.43);
    const right = pick(new THREE.Mesh(new THREE.CylinderGeometry(.075,.105,.86,10), vermilion),true); right.rotation.x=Math.PI/2; right.position.set(.25,0,.43);
    const lintel = pick(new THREE.Mesh(new THREE.BoxGeometry(.68,.09,.09), vermilion),true); lintel.position.z=.76;
    const roof = pick(new THREE.Mesh(new THREE.BoxGeometry(.82,.07,.08), dark)); roof.position.z=.9;
    const plaque = pick(new THREE.Mesh(new THREE.BoxGeometry(.13,.025,.14), gold)); plaque.position.set(0,-.018,.71);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.58,.035,8,24), new THREE.MeshBasicMaterial({color:0xf0c679,transparent:true,opacity:.48})); ring.rotation.x=Math.PI/2; ring.position.z=.035; group.add(ring); group.add(makeNumberBadge(temple.num));
    group.userData.temple=temple; group.userData.ring=ring; mapGroup.add(group); markers.push(group);
  }); }
function hit(e) { const rect=canvas.getBoundingClientRect(); pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera(pointer,camera); return raycaster.intersectObjects(markers.flatMap(m=>m.children).filter(x=>x.userData.temple),false)[0]; }
function onPointerMove(e) { const hitResult=hit(e); canvas.style.cursor=hitResult?'pointer':'grab'; if(hitResult){ const t=hitResult.object.userData.temple; tooltip.hidden=false; tooltip.innerHTML='<strong>#'+t.num+' · '+t.romaji+'</strong><span>'+t.city+' · '+t.day+'</span>'; tooltip.style.left=(e.clientX-stage.getBoundingClientRect().left+14)+'px'; tooltip.style.top=(e.clientY-stage.getBoundingClientRect().top+14)+'px'; } else tooltip.hidden=true; }
function onClick(e) { const h=hit(e); if(!h)return; select(h.object.userData.temple); }
function select(t) { selected=t; markers.forEach(m=>{ const active=m.userData.temple.num===t.num; m.scale.setScalar(active ? .9 : .62); }); document.querySelectorAll('#atlasIndex button').forEach(button=>button.classList.toggle('active', Number(button.dataset.temple)===t.num)); focus.textContent='#'+t.num+' · '+t.romaji+' — '+t.city+' · '+t.day; mapLink.href=t.maps; const p=toWorld(sourceCoord(t)); controls.target.set(p.x,p.y,.55); }
function zoomBy(amount) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * amount, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); }
function rollView(angle) { const viewAxis=new THREE.Vector3().subVectors(controls.target,camera.position).normalize(); camera.up.applyAxisAngle(viewAxis,angle).normalize(); camera.lookAt(controls.target); }
function resetView() { controls.reset(); selected=null; markers.forEach(m=>m.scale.setScalar(.62)); document.querySelectorAll('#atlasIndex button').forEach(button=>button.classList.remove('active')); focus.textContent='Select a temple marker to begin.'; mapLink.href='#'; }
function resize(){ const w=stage.clientWidth,h=stage.clientHeight, aspect=w/h; camera.left=-9.5*aspect; camera.right=9.5*aspect; camera.top=9.5; camera.bottom=-9.5; camera.updateProjectionMatrix(); renderer.setSize(w,h); controls.handleResize(); }
function animate(){ raf=requestAnimationFrame(animate); const pulse=.5+Math.sin(performance.now()*.004)*.18; markers.forEach(marker=>{ marker.userData.ring.material.opacity=selected?.num===marker.userData.temple.num?pulse:.36; }); controls.update(); renderer.render(scene,camera); }
window.BANDO33_ATLAS = { selectTemple: select, reset: resetView };
