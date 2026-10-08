import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
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
  water: 0x36a9d6, shore: 0xe2c77c, grass: 0x77b94c, upland: 0x4f883f,
  mountain: 0x506f49, field: 0xa9c957, earth: 0x6e3f2f
};
const mapGroup = new THREE.Group();
const terrainMeshes = [];
const terrainCells = [];
const markerPositions = new Map();
const sceneryPositions = [];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
const templeOrder = [...TEMPLES].sort((a,b)=>a.num-b.num);
function updateAtlasProgress(event) {
  const progress = event?.detail?.state || JSON.parse(localStorage.getItem('bando33-jiku-v5') || '{}');
  done.clear(); Object.keys(progress).filter(Number).forEach(num => done.add(Number(num)));
  document.getElementById('atlasDoneCount').textContent = done.size;
  markers.forEach(marker => {
    const stamped = done.has(marker.userData.temple.num);
    marker.traverse(part => { if (part.userData.baseRoof !== undefined) part.material.color.setHex(stamped ? colours.pine : part.userData.baseRoof); });
  });
}
// Latitude is compressed slightly so Kantō reads as the broad, game-board landscape
// seen in the reference while preserving every temple's geographic relationship.
const toWorld = ([lon, lat]) => new THREE.Vector3((lon - 139.9) * 6.2, (lat - 35.95) * 5.2, 0);
const kantoOutline = [[138.72,36.78],[139.22,37.08],[139.92,37.1],[140.38,36.96],[140.65,36.7],[140.78,36.3],[140.84,35.92],[140.9,35.72],[140.56,35.53],[140.43,35.25],[140.2,35.0],[139.87,34.95],[139.74,35.12],[139.78,35.31],[139.91,35.45],[140.03,35.53],[140.0,35.63],[139.87,35.63],[139.72,35.5],[139.58,35.31],[139.47,35.22],[139.25,35.25],[138.62,35.23],[138.56,35.5],[138.82,35.8],[138.67,36.2]];

let scene, camera, renderer, controls, raycaster, pointer, waterMaterial, markers = [], selected = null, raf;
const targetGoal = new THREE.Vector3(-.8,.45,.2);
try { init(); } catch (error) { loading.textContent = 'The atlas could not load in this browser. The itinerary below is still fully available.'; console.error(error); }

function init() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x87c8d8); scene.fog = new THREE.Fog(0x87c8d8, 38, 64);
  // Low, south-facing orthographic view: east-west stays horizontal and the
  // northern mountain edge recedes, matching the supplied board-game view.
  camera = new THREE.OrthographicCamera(-12, 12, 7, -7, .1, 100); camera.up.set(0,0,1); camera.position.set(-.8, -25, 19); camera.lookAt(-.8, .45, .2);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(stage.clientWidth, stage.clientHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  controls = new OrbitControls(camera, canvas); controls.target.copy(targetGoal); controls.enableDamping=true; controls.dampingFactor=.075; controls.rotateSpeed=.55; controls.zoomSpeed=.75; controls.zoomToCursor=true; controls.enablePan=false; controls.minPolarAngle=THREE.MathUtils.degToRad(43); controls.maxPolarAngle=THREE.MathUtils.degToRad(62); controls.minZoom=.72; controls.maxZoom=3.6; controls.update(); const initialAzimuth=controls.getAzimuthalAngle(); controls.minAzimuthAngle=initialAzimuth-THREE.MathUtils.degToRad(100); controls.maxAzimuthAngle=initialAzimuth+THREE.MathUtils.degToRad(100); controls.saveState();
  scene.add(new THREE.HemisphereLight(0xfff7de, 0x8a6f60, 2.15)); const sun = new THREE.DirectionalLight(0xffe0ad, 3.7); sun.position.set(-12, -14, 25); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-14; sun.shadow.camera.right=14; sun.shadow.camera.top=13; sun.shadow.camera.bottom=-13; sun.shadow.bias=-.00035; scene.add(sun);
  makeOcean();
  scene.add(mapGroup); makeKanto(); makeMarkers(); raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
  canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('click', onClick); window.addEventListener('resize', resize); document.getElementById('atlasReset').addEventListener('click', resetView); document.getElementById('atlasZoomIn').addEventListener('click', () => zoomBy(1.25)); document.getElementById('atlasZoomOut').addEventListener('click', () => zoomBy(.8)); document.getElementById('atlasPrev').addEventListener('click', () => stepTemple(-1)); document.getElementById('atlasNext').addEventListener('click', () => stepTemple(1)); window.addEventListener('bando:progress', updateAtlasProgress);
  document.getElementById('atlasVisibleCount').textContent = TEMPLES.length; buildTempleIndex(); updateAtlasProgress(); resize(); loading.remove(); animate();
}
function makeOcean() {
  waterMaterial=new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}},
    vertexShader:`
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying float vWave;
      void main(){
        vec3 displaced=position;
        float wave=sin(position.x*.62+uTime*.2)*.035
          +sin(position.y*.48-uTime*.15)*.026
          +sin((position.x+position.y)*.31+uTime*.11)*.018;
        displaced.z+=wave;
        vWave=wave;
        vec4 worldPosition=modelMatrix*vec4(displaced,1.0);
        vWorldPosition=worldPosition.xyz;
        gl_Position=projectionMatrix*viewMatrix*worldPosition;
      }
    `,
    fragmentShader:`
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying float vWave;
      float hash21(vec2 p){
        p=fract(p*vec2(123.34,456.21));
        p+=dot(p,p+45.32);
        return fract(p.x*p.y);
      }
      float smoothMaximum(float a,float b,float softness){
        float blend=clamp(.5+.5*(a-b)/softness,0.0,1.0);
        return mix(b,a,blend)+softness*blend*(1.0-blend);
      }
      vec3 oceanHex(vec2 p){
        const vec2 spacing=vec2(1.0,1.7320508);
        vec2 halfSpacing=spacing*.5;
        vec2 a=mod(p,spacing)-halfSpacing;
        vec2 b=mod(p-halfSpacing,spacing)-halfSpacing;
        bool useFirst=dot(a,a)<dot(b,b);
        vec2 local=useFirst?a:b;
        vec2 firstId=floor(p/spacing)*2.0;
        vec2 secondId=floor((p-halfSpacing)/spacing)*2.0+1.0;
        vec2 cellId=useFirst?firstId:secondId;
        vec2 absoluteLocal=abs(local);
        float side=smoothMaximum(absoluteLocal.x,dot(absoluteLocal,normalize(vec2(1.0,1.7320508))),.09);
        float edge=.5-side;
        float centreGlow=1.0-smoothstep(.08,.58,length(local));
        return vec3(edge,hash21(cellId+7.31),centreGlow);
      }
      void main(){
        vec2 flow=vWorldPosition.xy*.39+vec2(uTime*.012,-uTime*.007);
        flow+=vec2(sin(flow.y*1.2+uTime*.018),sin(flow.x*1.05-uTime*.015))*.055;
        vec3 cells=oceanHex(flow);
        float cellTone=smoothstep(.08,.92,cells.y);
        float broadGradient=.5+.5*sin(vWorldPosition.x*.16-vWorldPosition.y*.1+uTime*.025);
        float blueMix=clamp(.18+cellTone*.5+broadGradient*.16+cells.z*.08,0.0,1.0);
        vec3 deep=vec3(.16,.43,.62);
        vec3 blue=vec3(.47,.73,.82);
        vec3 colour=mix(deep,blue,blueMix);
        colour+=vec3(.025,.045,.05)*smoothstep(-.06,.07,vWave);
        float edgeWidth=fwidth(cells.x);
        float paleEdge=1.0-smoothstep(.025-edgeWidth,.125+edgeWidth,cells.x);
        float foamEdge=1.0-smoothstep(-.008-edgeWidth,.052+edgeWidth,cells.x);
        colour=mix(colour,vec3(.65,.82,.86),paleEdge*.34);
        colour=mix(colour,vec3(.84,.92,.92),foamEdge*.5);
        gl_FragColor=vec4(colour,1.0);
      }
    `
  });
  const waterFloor=new THREE.Mesh(new THREE.PlaneGeometry(200,200,120,120),waterMaterial);
  waterFloor.position.z=-.63;
  scene.add(waterFloor);
}
function buildTempleIndex() { const list=document.getElementById('atlasIndex'); templeOrder.forEach(t => { const button=document.createElement('button'); button.type='button'; button.dataset.temple=t.num; button.innerHTML='<span class="index-num">'+String(t.num).padStart(2,'0')+'</span><span><strong>'+t.romaji+'</strong><small>'+t.city+'</small></span>'; button.addEventListener('click',()=>select(t)); list.appendChild(button); }); }
function pointInPolygon(x,y,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
    const a=polygon[i], b=polygon[j];
    if(((a.y>y)!==(b.y>y)) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside;
}
function nearestTerrainCell(position,includeWater=true) {
  let nearest=null, distance=Infinity;
  for(const cell of terrainCells){
    if(!includeWater && cell.water)continue;
    const d=(cell.x-position.x)**2+(cell.y-position.y)**2;
    if(d<distance){distance=d; nearest=cell;}
  }
  return nearest;
}
function groundHeightAt(position) { return nearestTerrainCell(position)?.top ?? .3; }
function makeHexTerrain() {
  const outline=kantoOutline.map(pair=>{const p=toWorld(pair); return new THREE.Vector2(p.x,p.y);});
  // Tokyo Bay remains open to the Pacific so the animated ocean reads as one
  // continuous body of water between Kanagawa and the Bōsō Peninsula.
  const tokyoBay=[[139.55,34.88],[139.76,34.88],[139.82,35.08],[139.97,35.3],[139.94,35.48],[139.86,35.65],[139.77,35.5],[139.7,35.3],[139.6,35.14]].map(pair=>{const p=toWorld(pair); return new THREE.Vector2(p.x,p.y);});
  const tileRadius=.445, gridSize=.455, xStep=Math.sqrt(3)*gridSize, rowStep=1.5*gridSize;
  const minX=Math.min(...outline.map(p=>p.x))-.5, maxX=Math.max(...outline.map(p=>p.x))+.5;
  const minY=Math.min(...outline.map(p=>p.y))-.5, maxY=Math.max(...outline.map(p=>p.y))+.5;
  let row=0;
  for(let y=minY;y<=maxY;y+=rowStep,row++){
    const offset=(row%2)*xStep/2;
    for(let x=minX+offset;x<=maxX;x+=xStep){
      if(!pointInPolygon(x,y,outline))continue;
      if(pointInPolygon(x,y,tokyoBay))continue;
      const water=((x-4.15)/1.55)**2+((y-.15)/1.35)**2<1;
      const coast=!water && (y<-3.55 || (x>3.8&&y<-1.9));
      const southernHills=!water && ((((x-1.25)/2.65)**2+((y+4.05)/1.4)**2<1) || (x>3.6&&y<-2.15));
      const mountain=!water && (y>4.18 || x<-5.15 || (x<-3.55&&y>1.35));
      const highland=!water && !mountain && (y>2.45 || x<-2.85);
      const variation=Math.abs(Math.round(x*37+y*53))%3;
      const top=water?.12:coast?.26:mountain?1.02+variation*.055:highland?.7+variation*.04:southernHills?.54+variation*.03:.34+variation*.018;
      const palettes=water?[0x208fca,0x27a8da,0x38b5df]:coast?[0xd9bc66,0xe4ca7a,0xe8d28a]:mountain?[0x426d39,0x4b793d,0x568442]:highland?[0x5d9141,0x679d45,0x56883c]:southernHills?[0x68a247,0x72ae4b,0x609941]:[0x75b84c,0x82c653,0x6eae48];
      terrainCells.push({x,y,top,water,colour:palettes[variation]});
    }
  }
  const baseGeometry=new THREE.CylinderGeometry(tileRadius,tileRadius,1,6); baseGeometry.rotateX(Math.PI/2); baseGeometry.rotateZ(Math.PI/6);
  const topShape=new THREE.Shape();
  for(let i=0;i<6;i++){const angle=Math.PI/6+i*Math.PI/3,x=Math.cos(angle)*(tileRadius-.018),y=Math.sin(angle)*(tileRadius-.018); if(i===0)topShape.moveTo(x,y); else topShape.lineTo(x,y);}
  topShape.closePath();
  const topGeometry=new THREE.ExtrudeGeometry(topShape,{depth:.1,bevelEnabled:true,bevelSegments:1,bevelSize:.018,bevelThickness:.018}); topGeometry.translate(0,0,-.05);
  const bases=new THREE.InstancedMesh(baseGeometry,new THREE.MeshStandardMaterial({color:colours.earth,roughness:.92,flatShading:true}),terrainCells.length);
  const tops=new THREE.InstancedMesh(topGeometry,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.82,flatShading:true}),terrainCells.length);
  const matrix=new THREE.Matrix4(), colour=new THREE.Color(), bottom=-.52;
  terrainCells.forEach((cell,index)=>{
    const depth=cell.top-.1-bottom;
    matrix.compose(new THREE.Vector3(cell.x,cell.y,bottom+depth/2),new THREE.Quaternion(),new THREE.Vector3(1,1,depth)); bases.setMatrixAt(index,matrix);
    matrix.makeTranslation(cell.x,cell.y,cell.top-.05); tops.setMatrixAt(index,matrix); tops.setColorAt(index,colour.setHex(cell.colour));
  });
  bases.instanceMatrix.needsUpdate=true; tops.instanceMatrix.needsUpdate=true; tops.instanceColor.needsUpdate=true;
  bases.castShadow=true; bases.receiveShadow=true; tops.castShadow=true; tops.receiveShadow=true; tops.userData.isTerrain=true;
  terrainMeshes.push(tops); mapGroup.add(bases,tops);
}
function addMountain(lon,lat,size=1) {
  const p=toWorld([lon,lat]), group=new THREE.Group(); group.position.set(p.x,p.y,groundHeightAt(p)); sceneryPositions.push(p.clone());
  const material=new THREE.MeshStandardMaterial({color:colours.mountain,roughness:.96,flatShading:true});
  [[0,0,1],[-.28,.08,.7],[.3,.12,.78]].forEach(([x,y,s])=>{const rock=new THREE.Mesh(new THREE.ConeGeometry(.5*size*s,1.2*size*s,7),material); rock.rotation.x=Math.PI/2; rock.position.set(x*size,y*size,.56*size*s); rock.castShadow=true; group.add(rock);});
  mapGroup.add(group);
}
function addFuji() {
  const p=new THREE.Vector3(-8.4,-4.55,0), surface=.25, platform=new THREE.Group(), group=new THREE.Group(); sceneryPositions.push(p.clone());
  const platformBaseGeometry=new THREE.CylinderGeometry(.49,.49,1,6); platformBaseGeometry.rotateX(Math.PI/2); platformBaseGeometry.rotateZ(Math.PI/6);
  const platformTopGeometry=new THREE.CylinderGeometry(.475,.485,.12,6); platformTopGeometry.rotateX(Math.PI/2); platformTopGeometry.rotateZ(Math.PI/6);
  const platformBaseMaterial=new THREE.MeshStandardMaterial({color:colours.earth,roughness:.92,flatShading:true});
  const platformTopColours=[0x5e825c,0x678c62,0x587b57];
  const offsets=[[0,0],...Array.from({length:6},(_,i)=>{const angle=i*Math.PI/3; return [Math.cos(angle)*.84,Math.sin(angle)*.84];})];
  offsets.forEach(([x,y],index)=>{const top=surface-(index%2)*.035,depth=top-.1+.52,base=new THREE.Mesh(platformBaseGeometry,platformBaseMaterial),cap=new THREE.Mesh(platformTopGeometry,new THREE.MeshStandardMaterial({color:platformTopColours[index%3],roughness:.86,flatShading:true})); base.scale.z=depth; base.position.set(x,y,-.52+depth/2); cap.position.set(x,y,top-.06); base.castShadow=true; base.receiveShadow=true; cap.castShadow=true; cap.receiveShadow=true; platform.add(base,cap);});
  platform.position.set(p.x,p.y,0); mapGroup.add(platform);
  group.position.set(p.x,p.y,surface);
  const foothill=new THREE.Mesh(new THREE.CylinderGeometry(1.43,1.56,.16,12),new THREE.MeshStandardMaterial({color:0x496573,roughness:.94,flatShading:true})); foothill.rotation.x=Math.PI/2; foothill.position.z=.08; foothill.receiveShadow=true; group.add(foothill);
  const base=new THREE.Mesh(new THREE.ConeGeometry(1.46,3.02,12),new THREE.MeshStandardMaterial({color:0x58788a,roughness:.92,flatShading:true})); base.rotation.x=Math.PI/2; base.position.z=1.49; base.castShadow=true; group.add(base);
  const snow=new THREE.Mesh(new THREE.ConeGeometry(.67,1.08,12),new THREE.MeshStandardMaterial({color:0xf5f4ed,roughness:.86,flatShading:true})); snow.rotation.x=Math.PI/2; snow.position.z=2.51; snow.castShadow=true; group.add(snow); mapGroup.add(group);
}
function makeKanto() {
  makeHexTerrain();
  addFuji();
  [[138.88,36.72,.72],[139.16,36.92,.65],[139.52,37.0,.74],[139.9,37.02,.58],[140.27,36.88,.58],[138.88,36.15,.5],[139.02,35.72,.43],[140.25,35.32,.36]].forEach(m=>addMountain(...m));
}
function makeNumberBadge(num,height=1.18) {
  const label=document.createElement('canvas'); label.width=128; label.height=64; const context=label.getContext('2d');
  context.fillStyle='rgba(55,38,31,.94)'; context.beginPath(); context.roundRect(22,9,84,46,18); context.fill();
  context.strokeStyle='#f2cf70'; context.lineWidth=4; context.stroke(); context.fillStyle='#fffaf0'; context.font='700 29px Georgia'; context.textAlign='center'; context.textBaseline='middle'; context.fillText(String(num),64,33);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(label),transparent:true,depthTest:false})); sprite.scale.set(.62,.31,1); sprite.position.z=height; sprite.renderOrder=4; return sprite;
}
function reserveTempleCell(position,occupied) {
  let chosen=null, best=Infinity;
  for(const cell of terrainCells){
    if(cell.water||occupied.has(cell))continue;
    const distance=(cell.x-position.x)**2+(cell.y-position.y)**2;
    const sceneryPenalty=sceneryPositions.some(p=>(p.x-cell.x)**2+(p.y-cell.y)**2<.9)?12:0;
    const score=distance+sceneryPenalty;
    if(score<best){best=score; chosen=cell;}
  }
  occupied.add(chosen); return chosen;
}
function makeGabledRoofGeometry(width,depth,height) {
  const w=width/2,d=depth/2,r=width*.28;
  const positions=[
    -w,-d,0,w,-d,0,r,0,height, -w,-d,0,r,0,height,-r,0,height,
    -w,d,0,r,0,height,w,d,0, -w,d,0,-r,0,height,r,0,height,
    -w,-d,0,-r,0,height,-w,d,0, w,-d,0,w,d,0,r,0,height, w,-d,0,r,0,height
  ];
  const geometry=new THREE.BufferGeometry(); geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3)); geometry.computeVertexNormals(); return geometry;
}
function makeMarkers() {
  const occupied=new Set();
  const palettes=[
    {roof:0x3f6280,timber:0xd25d38,wall:0xf0d1a7,accent:0xe67a42,pad:0xe1cf98},
    {roof:0x403746,timber:0xb94632,wall:0xf1d5ae,accent:0xd99a3e,pad:0xd8c68c},
    {roof:0xc99543,timber:0x784a34,wall:0xdca55f,accent:0xb86a42,pad:0xd9c477},
    {roof:0xa8493c,timber:0xcf3d2e,wall:0xe4b66e,accent:0xe0a13f,pad:0xd8bb62},
    {roof:0x536c5d,timber:0x9b5338,wall:0xead3a5,accent:0xd1783f,pad:0xcdbf7d}
  ];
  const padGeometry=new THREE.CylinderGeometry(.39,.42,.12,6); padGeometry.rotateX(Math.PI/2); padGeometry.rotateZ(Math.PI/6);
  const unitSquareRoof=new THREE.ConeGeometry(1,1,4); unitSquareRoof.rotateX(Math.PI/2); unitSquareRoof.rotateZ(Math.PI/4);
  const unitOctRoof=new THREE.ConeGeometry(1,1,8); unitOctRoof.rotateX(Math.PI/2);
  const hallRoofGeometry=makeGabledRoofGeometry(.68,.52,.24);
  [...TEMPLES].sort((a,b)=>a.num-b.num).forEach(temple=>{
    const source=toWorld(sourceCoord(temple)), cell=reserveTempleCell(source,occupied), variant=temple.num%4, palette=palettes[temple.num%palettes.length];
    const position=new THREE.Vector3(cell.x,cell.y,cell.top+.025); markerPositions.set(temple.num,position.clone());
    const group=new THREE.Group(); group.position.copy(position);
    const materials={
      roof:new THREE.MeshStandardMaterial({color:palette.roof,roughness:.68,flatShading:true}),
      timber:new THREE.MeshStandardMaterial({color:palette.timber,roughness:.78}),
      wall:new THREE.MeshStandardMaterial({color:palette.wall,roughness:.84}),
      accent:new THREE.MeshStandardMaterial({color:palette.accent,roughness:.62}),
      pad:new THREE.MeshStandardMaterial({color:palette.pad,roughness:.9,flatShading:true}),
      gold:new THREE.MeshStandardMaterial({color:0xdfaa42,roughness:.5,metalness:.12})
    };
    const pick=(mesh,isRoof=false)=>{mesh.userData.temple=temple; if(isRoof)mesh.userData.baseRoof=palette.roof; mesh.castShadow=true; mesh.receiveShadow=true; group.add(mesh); return mesh;};
    const box=(w,d,h,material,x=0,y=0,z=0)=>{const mesh=pick(new THREE.Mesh(new THREE.BoxGeometry(w,d,h),material)); mesh.position.set(x,y,z); return mesh;};
    const tierRoof=(radius,height,z)=>{const mesh=pick(new THREE.Mesh(unitSquareRoof,materials.roof),true); mesh.scale.set(radius,radius,height); mesh.position.z=z; return mesh;};
    const pad=pick(new THREE.Mesh(padGeometry,materials.pad)); pad.position.z=.06;
    let labelHeight=1.16, baseScale=.8;
    if(variant===0){
      box(.55,.43,.08,materials.accent,0,0,.14); box(.45,.34,.27,materials.wall,0,0,.31);
      [[-.2,-.15],[.2,-.15],[-.2,.15],[.2,.15]].forEach(([x,y])=>box(.045,.045,.29,materials.timber,x,y,.31));
      tierRoof(.43,.2,.5); box(.25,.21,.19,materials.wall,0,0,.63); tierRoof(.31,.16,.77); box(.25,.035,.04,materials.accent,0,0,.88); labelHeight=1.16;
    }else if(variant===1){
      box(.42,.34,.08,materials.accent,0,0,.13);
      [[.3,.2,.2,.25,.19],[.26,.18,.17,.49,.41],[.22,.16,.15,.69,.59]].forEach(([w,d,h,roofZ,bodyZ],i)=>{box(w,d,h,materials.wall,0,0,bodyZ); box(w+.04,d+.04,.035,materials.timber,0,0,bodyZ+h/2); tierRoof(.36-i*.055,.14-i*.012,roofZ);});
      const finial=pick(new THREE.Mesh(new THREE.CylinderGeometry(.023,.035,.19,6),materials.gold)); finial.rotation.x=Math.PI/2; finial.position.z=.85; labelHeight=1.16; baseScale=.76;
    }else if(variant===2){
      box(.58,.44,.08,materials.timber,0,0,.13);
      [[-.22,-.15],[0,-.15],[.22,-.15],[-.22,.15],[0,.15],[.22,.15]].forEach(([x,y])=>box(.045,.045,.4,materials.timber,x,y,.34));
      box(.58,.44,.055,materials.accent,0,0,.36); box(.46,.32,.22,materials.wall,0,0,.49);
      const roof=pick(new THREE.Mesh(hallRoofGeometry,materials.roof),true); roof.position.z=.57; box(.4,.035,.045,materials.accent,0,0,.84);
      box(.32,.13,.045,materials.wall,0,-.26,.11); box(.26,.11,.045,materials.wall,0,-.31,.07); labelHeight=1.13;
    }else{
      const body=pick(new THREE.Mesh(new THREE.CylinderGeometry(.29,.31,.34,8),materials.wall)); body.rotation.x=Math.PI/2; body.position.z=.3;
      for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=Math.cos(angle)*.29,y=Math.sin(angle)*.29,post=pick(new THREE.Mesh(new THREE.CylinderGeometry(.018,.024,.36,6),materials.timber)); post.rotation.x=Math.PI/2; post.position.set(x,y,.31);}
      const roof=pick(new THREE.Mesh(unitOctRoof,materials.roof),true); roof.scale.set(.43,.43,.22); roof.position.z=.57;
      const finial=pick(new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),materials.gold)); finial.position.z=.72; labelHeight=1.05;
    }
    group.add(makeNumberBadge(temple.num,labelHeight));
    group.scale.setScalar(baseScale); group.userData.temple=temple; group.userData.baseScale=baseScale; group.userData.variant=variant; mapGroup.add(group); markers.push(group);
  });
}
function hit(e) { const rect=canvas.getBoundingClientRect(); pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera(pointer,camera); return raycaster.intersectObjects(markers.flatMap(m=>m.children).filter(x=>x.userData.temple),false)[0]; }
function onPointerMove(e) { const hitResult=hit(e); canvas.style.cursor=hitResult?'pointer':'grab'; if(hitResult){ const t=hitResult.object.userData.temple; tooltip.hidden=false; tooltip.innerHTML='<strong>#'+t.num+' · '+t.romaji+'</strong><span>'+t.city+' · '+t.day+'</span>'; tooltip.style.left=(e.clientX-stage.getBoundingClientRect().left+14)+'px'; tooltip.style.top=(e.clientY-stage.getBoundingClientRect().top+14)+'px'; } else tooltip.hidden=true; }
function onClick(e) { const h=hit(e); if(!h)return; select(h.object.userData.temple); }
function select(t) { selected=t; markers.forEach(m=>{ const active=m.userData.temple.num===t.num; m.scale.setScalar(active ? 1.02 : m.userData.baseScale); }); document.querySelectorAll('#atlasIndex button').forEach(button=>button.classList.toggle('active', Number(button.dataset.temple)===t.num)); focus.textContent='#'+t.num+' · '+t.romaji+' — '+t.city+' · '+t.day; mapLink.href=t.maps; const p=markerPositions.get(t.num)||toWorld(sourceCoord(t)); targetGoal.set(p.x,p.y,p.z); }
function stepTemple(direction) { const currentIndex=selected?templeOrder.findIndex(temple=>temple.num===selected.num):(direction>0?-1:0); select(templeOrder[(currentIndex+direction+templeOrder.length)%templeOrder.length]); }
function zoomBy(amount) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * amount, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); }
function resetView() { controls.reset(); targetGoal.copy(controls.target); selected=null; markers.forEach(m=>m.scale.setScalar(m.userData.baseScale)); document.querySelectorAll('#atlasIndex button').forEach(button=>button.classList.remove('active')); focus.textContent='Select a temple marker to begin.'; mapLink.href='#'; }
function resize(){ const w=stage.clientWidth,h=stage.clientHeight, aspect=w/h; const halfHeight=Math.max(5.75,9.25/aspect); camera.left=-halfHeight*aspect; camera.right=halfHeight*aspect; camera.top=halfHeight; camera.bottom=-halfHeight; camera.updateProjectionMatrix(); renderer.setSize(w,h); }
function animate(){
  raf=requestAnimationFrame(animate);
  const now=performance.now();
  if(!reduceMotion){
    waterMaterial.uniforms.uTime.value=now*.001;
  }
  controls.target.lerp(targetGoal,.08); controls.update(); renderer.render(scene,camera);
}
window.BANDO33_ATLAS = { selectTemple: select, reset: resetView };
