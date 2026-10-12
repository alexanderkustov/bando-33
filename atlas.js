import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TEMPLES, DAYS } from './data/itinerary.js';
import { renderDaylightCycle } from './components/daylight-cycle.js';

const canvas = document.getElementById('atlasCanvas');
const stage = document.getElementById('atlasStage');
const loading = document.getElementById('atlasLoading');
const tooltip = document.getElementById('atlasTooltip');
const focus = document.getElementById('atlasFocus');
const mapLink = document.getElementById('atlasMap');
const ordinal = document.getElementById('atlasOrdinal');
const kicker = document.getElementById('atlasKicker');
const templeName = document.getElementById('atlasTempleName');
const templeMeta = document.getElementById('atlasTempleMeta');
const skyClock = document.getElementById('atlasSkyClock');
const done = new Set();
const colours = {
  ink: 0x241a18, vermilion: 0xa93d2d, pine: 0x314e42, paper: 0xefe4cb,
  water: 0x285f6e, shore: 0xc9ad68, grass: 0x658458, upland: 0x435f46,
  mountain: 0x344d43, field: 0x8e9d5e, earth: 0x55382f, gold: 0xd4a64e
};
const mapGroup = new THREE.Group();
const terrainMeshes = [];
const terrainCells = [];
const markerPositions = new Map();
const sceneryPositions = [];
const clouds = [];
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

let scene, camera, renderer, controls, raycaster, pointer, waterMaterial, markers = [], selected = null, hovered = null, selectionAura, raf, followingSelection = false, viewTransition = null;
const targetGoal = new THREE.Vector3(-.8,.45,.2);
try { init(); } catch (error) { loading.textContent = 'The atlas could not load in this browser. The itinerary below is still fully available.'; console.error(error); }

function init() {
  scene = new THREE.Scene(); scene.background = makeSkyTexture(); scene.fog = new THREE.FogExp2(0x75949a, .018);
  // Low, south-facing orthographic view: east-west stays horizontal and the
  // northern mountain edge recedes, matching the supplied board-game view.
  camera = new THREE.OrthographicCamera(-12, 12, 7, -7, .1, 100); camera.up.set(0,0,1); camera.position.set(-.8, -25, 20); camera.lookAt(-.8, .45, .2);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(stage.clientWidth, stage.clientHeight); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  controls = new OrbitControls(camera, canvas);
  controls.target.copy(targetGoal);
  controls.enableDamping = true;
  controls.dampingFactor = .075;
  controls.rotateSpeed = .68;
  controls.zoomSpeed = .9;
  controls.panSpeed = .86;
  controls.zoomToCursor = true;
  controls.enablePan = true;
  controls.screenSpacePanning = false;
  controls.minPolarAngle = THREE.MathUtils.degToRad(18);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(88);
  controls.minZoom = .55;
  controls.maxZoom = 7.5;
  controls.update();
  controls.saveState();
  controls.addEventListener('start', () => { followingSelection = false; viewTransition = null; });
  controls.addEventListener('end', () => { targetGoal.copy(controls.target); });
  scene.add(new THREE.HemisphereLight(0xfff0d0, 0x243d3d, 2.35)); const sun = new THREE.DirectionalLight(0xffd29b, 4.4); sun.position.set(-11, -16, 24); sun.castShadow = true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-14; sun.shadow.camera.right=14; sun.shadow.camera.top=13; sun.shadow.camera.bottom=-13; sun.shadow.bias=-.00035; scene.add(sun);
  const fill=new THREE.DirectionalLight(0x8dc4c5,.8); fill.position.set(12,10,8); scene.add(fill);
  makeOcean();
  scene.add(mapGroup); makeKanto(); makeMarkers(); makeForest(); makeMapLabels(); makeClouds(); makeSelectionAura(); raycaster = new THREE.Raycaster(); pointer = new THREE.Vector2();
  canvas.addEventListener('pointermove', onPointerMove); canvas.addEventListener('pointerleave', clearHover); canvas.addEventListener('click', onClick); window.addEventListener('resize', resize); window.addEventListener('keydown', onKeyDown); document.getElementById('atlasReset').addEventListener('click', resetView); document.getElementById('atlasZoomIn').addEventListener('click', () => zoomBy(1.25)); document.getElementById('atlasZoomOut').addEventListener('click', () => zoomBy(.8)); document.getElementById('atlasPrev').addEventListener('click', () => stepTemple(-1)); document.getElementById('atlasNext').addEventListener('click', () => stepTemple(1)); window.addEventListener('bando:progress', updateAtlasProgress);
  document.getElementById('atlasVisibleCount').textContent = TEMPLES.length; buildTempleIndex(); updateAtlasProgress(); renderDaylightCycle(skyClock, DAYS[0].iso, { compact: true }); resize(); loading.remove(); animate();
}
function makeSkyTexture() {
  const sky=document.createElement('canvas'); sky.width=1024; sky.height=1024; const context=sky.getContext('2d');
  const gradient=context.createLinearGradient(0,0,0,1024); gradient.addColorStop(0,'#708f94'); gradient.addColorStop(.42,'#a7b8ad'); gradient.addColorStop(.72,'#d9c8a6'); gradient.addColorStop(1,'#d6a36e'); context.fillStyle=gradient; context.fillRect(0,0,1024,1024);
  const sun=context.createRadialGradient(190,210,4,190,210,170); sun.addColorStop(0,'rgba(255,239,194,.92)'); sun.addColorStop(.16,'rgba(255,220,160,.38)'); sun.addColorStop(1,'rgba(255,210,150,0)'); context.fillStyle=sun; context.fillRect(0,0,1024,1024);
  const texture=new THREE.CanvasTexture(sky); texture.colorSpace=THREE.SRGBColorSpace; return texture;
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
        float wave=sin(position.x*.36+position.y*.12+uTime*.48)*.085
          +sin(position.y*.58-position.x*.09-uTime*.36)*.052
          +sin((position.x+position.y)*.92+uTime*.72)*.018
          +sin(position.x*.11-position.y*.14+uTime*.19)*.035;
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
        float side=smoothMaximum(absoluteLocal.x,dot(absoluteLocal,normalize(vec2(1.0,1.7320508))),.08);
        return vec3(.5-side,hash21(cellId+7.31),1.0-smoothstep(.06,.58,length(local)));
      }
      void main(){
        vec2 p=vWorldPosition.xy;
        float broad=.5+.5*sin(p.x*.14-p.y*.1+uTime*.07);
        float swellA=.5+.5*sin(p.x*.36+p.y*.12+uTime*.48);
        float swellB=.5+.5*sin(p.y*.58-p.x*.09-uTime*.36);
        float movingCrest=smoothstep(.76,.96,swellA*.63+swellB*.37);
        float fineCrest=1.0-smoothstep(.0,.065,abs(sin((p.x+p.y)*.58+uTime*.34)-.94));
        vec2 flow=p*.43;
        flow.x+=sin(p.y*.24+uTime*.46)*.09+sin(p.y*.08-uTime*.2)*.045;
        flow.y+=sin(p.x*.2-uTime*.37)*.075+sin((p.x+p.y)*.09+uTime*.18)*.035;
        flow+=vec2(uTime*.045,-uTime*.026);
        vec3 cells=oceanHex(flow);
        float cellTone=smoothstep(.08,.94,cells.y);
        float hexCore=1.0-smoothstep(.012,.052,cells.x);
        float hexHalo=1.0-smoothstep(.025,.19,cells.x);
        float innerLine=1.0-smoothstep(.0,.075,abs(sin((p.x-p.y)*.42+uTime*.23)-.88));
        vec3 deep=vec3(.045,.16,.22);
        vec3 jade=vec3(.13,.34,.4);
        vec3 mist=vec3(.44,.69,.72);
        float cellGradient=cells.z*(.045+cellTone*.035);
        vec3 colour=mix(deep,jade,.2+broad*.29+cellTone*.075+smoothstep(-.07,.08,vWave)*.08);
        colour=mix(colour,mist,cellGradient);
        float edgePulse=.92+sin(p.x*.11+p.y*.08+uTime*.55)*.08;
        float translucentEdge=(hexHalo*(.075+broad*.035)+hexCore*(.07+cellTone*.025))*edgePulse;
        colour=mix(colour,mist,translucentEdge+innerLine*.018);
        float crestLight=movingCrest*(.075+broad*.045)+fineCrest*.032+smoothstep(.075,.18,vWave)*.05;
        colour=mix(colour,mist,crestLight);
        vec2 bayDistance=(p-vec2(-.45,-2.35))/vec2(1.75,2.25);
        float bayShallows=exp(-dot(bayDistance,bayDistance)*1.6);
        colour=mix(colour,vec3(.2,.43,.47),bayShallows*.16);
        float horizon=clamp((p.y+18.0)/38.0,0.0,1.0);
        colour+=vec3(.08,.065,.035)*horizon;
        gl_FragColor=vec4(colour,1.0);
      }
    `
  });
  const waterFloor=new THREE.Mesh(new THREE.PlaneGeometry(200,200,140,140),waterMaterial);
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
  // Simplified from the GSI Tokyo Bay coastline: the broad inner bay reaches
  // north to Tokyo, with Kanagawa on the west and the Bōsō Peninsula on the east.
  // Keeping this as an open cut-out lets the animated ocean flow into the bay.
  const tokyoBay=[
    [139.64,35.17],[139.84,35.16],[139.97,35.25],[140.04,35.37],
    [140.08,35.49],[140.05,35.58],[139.97,35.64],[139.85,35.67],
    [139.75,35.63],[139.68,35.55],[139.62,35.44],[139.61,35.3]
  ].map(pair=>{const p=toWorld(pair); return new THREE.Vector2(p.x,p.y);});
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
      const palettes=water?[0x316f78,0x3b8187,0x4b9391]:coast?[0xc4a45e,0xd0b773,0xd9c58b]:mountain?[0x314c3f,0x3a5845,0x47664b]:highland?[0x4c6d48,0x58794e,0x405f43]:southernHills?[0x617b50,0x6d8957,0x577049]:[0x788b5b,0x879965,0x6d8055];
      terrainCells.push({x,y,top,water,colour:palettes[variation]});
    }
  }
  const baseGeometry=new THREE.CylinderGeometry(tileRadius,tileRadius,1,6); baseGeometry.rotateX(Math.PI/2); baseGeometry.rotateZ(Math.PI/6);
  const topShape=new THREE.Shape();
  for(let i=0;i<6;i++){const angle=Math.PI/6+i*Math.PI/3,x=Math.cos(angle)*(tileRadius-.018),y=Math.sin(angle)*(tileRadius-.018); if(i===0)topShape.moveTo(x,y); else topShape.lineTo(x,y);}
  topShape.closePath();
  const topGeometry=new THREE.ExtrudeGeometry(topShape,{depth:.1,bevelEnabled:true,bevelSegments:1,bevelSize:.018,bevelThickness:.018}); topGeometry.translate(0,0,-.05);
  const bases=new THREE.InstancedMesh(baseGeometry,new THREE.MeshStandardMaterial({color:colours.earth,roughness:.96,flatShading:true}),terrainCells.length);
  const tops=new THREE.InstancedMesh(topGeometry,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88,flatShading:true}),terrainCells.length);
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
  const shadowMaterial=new THREE.MeshStandardMaterial({color:0x253c36,roughness:.98,flatShading:true});
  [[0,0,1],[-.28,.08,.7],[.3,.12,.78]].forEach(([x,y,s],index)=>{const rock=new THREE.Mesh(new THREE.ConeGeometry(.5*size*s,1.2*size*s,7),index===1?shadowMaterial:material); rock.rotation.x=Math.PI/2; rock.position.set(x*size,y*size,.56*size*s); rock.castShadow=true; group.add(rock);});
  if(size>.6){const cap=new THREE.Mesh(new THREE.ConeGeometry(.17*size,.31*size,7),new THREE.MeshStandardMaterial({color:0xd8d9c8,roughness:.92,flatShading:true})); cap.rotation.x=Math.PI/2; cap.position.z=1.05*size; group.add(cap);}
  mapGroup.add(group);
}
function addFuji() {
  const p=new THREE.Vector3(-7.72,-4.12,0), surface=.25, platform=new THREE.Group(), group=new THREE.Group(); sceneryPositions.push(p.clone());
  const platformBaseGeometry=new THREE.CylinderGeometry(.49,.49,1,6); platformBaseGeometry.rotateX(Math.PI/2); platformBaseGeometry.rotateZ(Math.PI/6);
  const platformTopGeometry=new THREE.CylinderGeometry(.475,.485,.12,6); platformTopGeometry.rotateX(Math.PI/2); platformTopGeometry.rotateZ(Math.PI/6);
  const platformBaseMaterial=new THREE.MeshStandardMaterial({color:colours.earth,roughness:.92,flatShading:true});
  const platformTopColours=[0x5e825c,0x678c62,0x587b57];
  const offsets=[[0,0],...Array.from({length:6},(_,i)=>{const angle=i*Math.PI/3; return [Math.cos(angle)*.84,Math.sin(angle)*.84];})];
  offsets.forEach(([x,y],index)=>{const top=surface-(index%2)*.035,depth=top-.1+.52,base=new THREE.Mesh(platformBaseGeometry,platformBaseMaterial),cap=new THREE.Mesh(platformTopGeometry,new THREE.MeshStandardMaterial({color:platformTopColours[index%3],roughness:.86,flatShading:true})); base.scale.z=depth; base.position.set(x,y,-.52+depth/2); cap.position.set(x,y,top-.06); base.castShadow=true; base.receiveShadow=true; cap.castShadow=true; cap.receiveShadow=true; platform.add(base,cap);});
  platform.position.set(p.x,p.y,0); mapGroup.add(platform);
  group.position.set(p.x,p.y,surface);
  const foothill=new THREE.Mesh(new THREE.CylinderGeometry(1.43,1.56,.16,12),new THREE.MeshStandardMaterial({color:0x344d4b,roughness:.94,flatShading:true})); foothill.rotation.x=Math.PI/2; foothill.position.z=.08; foothill.receiveShadow=true; group.add(foothill);
  const base=new THREE.Mesh(new THREE.ConeGeometry(1.46,3.02,12),new THREE.MeshStandardMaterial({color:0x526d70,roughness:.92,flatShading:true})); base.rotation.x=Math.PI/2; base.position.z=1.49; base.castShadow=true; group.add(base);
  const snow=new THREE.Mesh(new THREE.ConeGeometry(.67,1.08,12),new THREE.MeshStandardMaterial({color:0xf5f4ed,roughness:.86,flatShading:true})); snow.rotation.x=Math.PI/2; snow.position.z=2.51; snow.castShadow=true; group.add(snow); mapGroup.add(group);
}
function makeKanto() {
  makeHexTerrain();
  addFuji();
  [[138.88,36.72,.78],[139.16,36.92,.69],[139.52,37.0,.76],[139.9,37.02,.62],[140.27,36.88,.6],[138.88,36.15,.52],[139.02,35.72,.44],[140.25,35.32,.37]].forEach(m=>addMountain(...m));
}
function makeNumberBadge(num,height=1.18) {
  const label=document.createElement('canvas'); label.width=192; label.height=96; const context=label.getContext('2d');
  context.shadowColor='rgba(20,11,8,.45)'; context.shadowBlur=12; context.shadowOffsetY=5;
  context.fillStyle='rgba(40,25,22,.97)'; context.beginPath(); context.roundRect(38,14,116,62,25); context.fill();
  context.shadowColor='transparent'; context.strokeStyle='#d9ad56'; context.lineWidth=4; context.stroke();
  context.fillStyle='#f7ead1'; context.font='700 38px Iowan Old Style, Georgia'; context.textAlign='center'; context.textBaseline='middle'; context.fillText(String(num).padStart(2,'0'),96,47);
  const texture=new THREE.CanvasTexture(label); texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false})); sprite.scale.set(.76,.38,1); sprite.position.z=height; sprite.renderOrder=8; return sprite;
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
function seeded(index) { const value=Math.sin(index*9283.17+17.31)*43758.5453; return value-Math.floor(value); }
function makeForest() {
  const candidates=terrainCells.filter((cell,index)=>!cell.water && cell.top>.46 && cell.top<1 && seeded(index)>.41 &&
    ![...markerPositions.values()].some(p=>(p.x-cell.x)**2+(p.y-cell.y)**2<.46) &&
    !sceneryPositions.some(p=>(p.x-cell.x)**2+(p.y-cell.y)**2<.58));
  const count=Math.min(candidates.length,145), trunkGeometry=new THREE.CylinderGeometry(.025,.035,.24,5), crownGeometry=new THREE.ConeGeometry(.13,.42,6);
  trunkGeometry.rotateX(Math.PI/2); crownGeometry.rotateX(Math.PI/2);
  const trunks=new THREE.InstancedMesh(trunkGeometry,new THREE.MeshStandardMaterial({color:0x51392d,roughness:1}),count);
  const crowns=new THREE.InstancedMesh(crownGeometry,new THREE.MeshStandardMaterial({color:0xffffff,roughness:.96,flatShading:true}),count);
  const matrix=new THREE.Matrix4(), colour=new THREE.Color(), treeColours=[0x263f35,0x34543e,0x486246,0x6d6c3f,0x7b5738];
  candidates.slice(0,count).forEach((cell,index)=>{
    const size=.72+seeded(index+401)*.7,dx=(seeded(index+71)-.5)*.22,dy=(seeded(index+137)-.5)*.22;
    matrix.compose(new THREE.Vector3(cell.x+dx,cell.y+dy,cell.top+.1*size),new THREE.Quaternion(),new THREE.Vector3(size,size,size)); trunks.setMatrixAt(index,matrix);
    matrix.compose(new THREE.Vector3(cell.x+dx,cell.y+dy,cell.top+.34*size),new THREE.Quaternion(),new THREE.Vector3(size,size,size)); crowns.setMatrixAt(index,matrix); crowns.setColorAt(index,colour.setHex(treeColours[Math.floor(seeded(index+233)*treeColours.length)]));
  });
  trunks.castShadow=true; crowns.castShadow=true; crowns.instanceColor.needsUpdate=true; mapGroup.add(trunks,crowns);
}
function makeTextSprite(text,subtle=false) {
  const label=document.createElement('canvas'); label.width=512; label.height=96; const context=label.getContext('2d');
  context.textAlign='center'; context.textBaseline='middle'; context.font=subtle?'500 28px SFMono-Regular, monospace':'600 34px Iowan Old Style, Georgia'; context.letterSpacing=subtle?'7px':'2px';
  context.fillStyle=subtle?'rgba(238,224,194,.62)':'rgba(41,30,25,.72)'; context.fillText(text,256,48);
  const texture=new THREE.CanvasTexture(label); texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false})); sprite.scale.set(3.1,.58,1); sprite.renderOrder=3; return sprite;
}
function makeMapLabels() {
  [[-7.75,-5.03,3.1,'富士山 · MT FUJI',false],[-.45,-2.35,.45,'TOKYO BAY',true],[-.6,5.65,1.1,'JŌSHŪ MOUNTAINS',true]].forEach(([x,y,z,text,subtle])=>{
    const label=makeTextSprite(text,subtle); label.position.set(x,y,z); mapGroup.add(label);
  });
}
function makeClouds() {
  const lightMaterial=new THREE.MeshStandardMaterial({color:0xffeed4,transparent:true,opacity:.58,roughness:1,depthWrite:false});
  const shadeMaterial=new THREE.MeshStandardMaterial({color:0x809697,transparent:true,opacity:.22,roughness:1,depthWrite:false});
  const puffGeometry=new THREE.SphereGeometry(1,16,10);
  [[-8,3.8,5.8,.9],[6.8,4.7,5.2,.72],[8,-3.4,4.5,.6]].forEach(([x,y,z,size],cloudIndex)=>{
    const group=new THREE.Group();
    [[-.62,.02,.12,.62],[0,0,.2,1],[.62,.01,.1,.68],[-.3,.05,.43,.76],[.32,.04,.4,.82],[-.02,-.08,.62,.58]].forEach(([dx,dy,dz,s],puffIndex)=>{
      const shadow=new THREE.Mesh(puffGeometry,shadeMaterial); shadow.scale.set(.72*size*s,.47*size*s,.3*size*s); shadow.position.set(dx*size,dy*size,dz*size-.12*size); group.add(shadow);
      const puff=new THREE.Mesh(puffGeometry,lightMaterial); puff.scale.set(.66*size*s,.5*size*s,.5*size*s); puff.position.set(dx*size,dy*size,dz*size+(puffIndex>2?.06:0)); group.add(puff);
    });
    group.position.set(x,y,z); group.userData.speed=.00003+cloudIndex*.000008; group.userData.origin=x; scene.add(group); clouds.push(group);
  });
}
function makeSelectionAura() {
  selectionAura=new THREE.Group(); selectionAura.visible=false;
  const outer=new THREE.Mesh(new THREE.TorusGeometry(.48,.018,8,48),new THREE.MeshBasicMaterial({color:0xffd77b,transparent:true,opacity:.9,depthTest:false})); outer.position.z=.08;
  const inner=new THREE.Mesh(new THREE.TorusGeometry(.34,.009,8,40),new THREE.MeshBasicMaterial({color:0xf6e3ad,transparent:true,opacity:.64,depthTest:false})); inner.position.z=.09;
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(.05,.22,1.7,16,1,true),new THREE.MeshBasicMaterial({color:0xf6cc73,transparent:true,opacity:.1,side:THREE.DoubleSide,depthWrite:false})); beam.rotation.x=Math.PI/2; beam.position.z=.85;
  selectionAura.add(outer,inner,beam); selectionAura.userData.outer=outer; selectionAura.userData.inner=inner; mapGroup.add(selectionAura);
}
function hit(e) { const rect=canvas.getBoundingClientRect(); pointer.x=((e.clientX-rect.left)/rect.width)*2-1; pointer.y=-((e.clientY-rect.top)/rect.height)*2+1; raycaster.setFromCamera(pointer,camera); return raycaster.intersectObjects(markers.flatMap(m=>m.children).filter(x=>x.userData.temple),false)[0]; }
function clearHover() { hovered=null; tooltip.hidden=true; canvas.style.cursor='grab'; updateMarkerScales(); }
function updateMarkerScales() { markers.forEach(marker=>{const active=selected?.num===marker.userData.temple.num, over=hovered?.num===marker.userData.temple.num; marker.scale.setScalar(active?marker.userData.baseScale*1.32:over?marker.userData.baseScale*1.13:marker.userData.baseScale);}); }
function onPointerMove(e) { const hitResult=hit(e); hovered=hitResult?.object.userData.temple||null; canvas.style.cursor=hitResult?'pointer':'grab'; updateMarkerScales(); if(hitResult){ const t=hitResult.object.userData.temple; tooltip.hidden=false; tooltip.innerHTML='<span class="tooltip-num">'+String(t.num).padStart(2,'0')+'</span><span><strong>'+t.romaji+'</strong><small>'+t.jp+'</small></span><em>'+t.city+' · '+t.day+'</em>'; const rect=stage.getBoundingClientRect(),x=e.clientX-rect.left+16,y=e.clientY-rect.top+16; tooltip.style.left=Math.min(x,rect.width-220)+'px'; tooltip.style.top=Math.min(y,rect.height-94)+'px'; } else tooltip.hidden=true; }
function onClick(e) { const h=hit(e); if(!h)return; select(h.object.userData.temple); }
function settleControlMotion() {
  const damping=controls.enableDamping;
  controls.enableDamping=false;
  controls.update();
  controls.enableDamping=damping;
}
function approachTemple(point) {
  settleControlMotion();
  const targetTo=point.clone(); targetTo.z+=.52;
  const cameraOffset=camera.position.clone().sub(controls.target);
  const positionTo=targetTo.clone().add(cameraOffset);
  targetGoal.copy(targetTo); followingSelection=false;
  if(reduceMotion){controls.target.copy(targetTo); camera.position.copy(positionTo); camera.zoom=4.2; camera.updateProjectionMatrix(); controls.update(); viewTransition=null; return;}
  const distance=controls.target.distanceTo(targetTo);
  viewTransition={
    started:performance.now(), duration:Math.min(2400,1650+distance*65), easing:'inOut',
    positionFrom:camera.position.clone(), positionTo,
    targetFrom:controls.target.clone(), targetTo,
    zoomFrom:camera.zoom, zoomTo:4.2,
    arcHeight:Math.min(3.2,.9+distance*.14), delayedZoom:true
  };
}
function select(t) {
  selected=t; updateMarkerScales();
  let activeButton;
  document.querySelectorAll('#atlasIndex button').forEach(button=>{const active=Number(button.dataset.temple)===t.num; button.classList.toggle('active',active); if(active)activeButton=button;});
  activeButton?.scrollIntoView({block:'nearest',behavior:reduceMotion?'auto':'smooth'});
  focus.textContent='#'+t.num+' · '+t.romaji+' — '+t.city+' · '+t.day; mapLink.href=t.maps;
  ordinal.textContent=String(t.num).padStart(2,'0'); kicker.textContent=t.jp+' · '+t.day.toUpperCase(); templeName.textContent=t.romaji; templeMeta.textContent=t.city+' · '+t.hours;
  const day=DAYS.find(candidate=>candidate.day===t.day); if(day)renderDaylightCycle(skyClock,day.iso,{compact:true});
  const p=markerPositions.get(t.num)||toWorld(sourceCoord(t)); approachTemple(p); selectionAura.position.copy(p); selectionAura.position.z+=.02; selectionAura.visible=true;
}
function stepTemple(direction) { const currentIndex=selected?templeOrder.findIndex(temple=>temple.num===selected.num):(direction>0?-1:0); select(templeOrder[(currentIndex+direction+templeOrder.length)%templeOrder.length]); }
function zoomBy(amount) { viewTransition=null; camera.zoom = THREE.MathUtils.clamp(camera.zoom * amount, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); }
function onKeyDown(event) { if(event.key==='ArrowRight'){event.preventDefault(); stepTemple(1);} if(event.key==='ArrowLeft'){event.preventDefault(); stepTemple(-1);} if(event.key==='Escape')resetView(); }
function resetView() {
  followingSelection=false;
  if(reduceMotion){controls.reset(); viewTransition=null;}
  else {
    settleControlMotion();
    viewTransition={
      started:performance.now(), duration:1100, easing:'out',
      positionFrom:camera.position.clone(), positionTo:controls.position0.clone(),
      targetFrom:controls.target.clone(), targetTo:controls.target0.clone(),
      zoomFrom:camera.zoom, zoomTo:controls.zoom0, arcHeight:0
    };
  }
  targetGoal.copy(controls.target0); selected=null; selectionAura.visible=false; updateMarkerScales(); document.querySelectorAll('#atlasIndex button').forEach(button=>button.classList.remove('active')); focus.textContent='Select a temple marker to begin.'; mapLink.href='#'; ordinal.textContent='巡礼'; kicker.textContent='BANDŌ KANNON PILGRIMAGE'; templeName.textContent='Thirty-three sacred places'; templeMeta.textContent='Choose a temple, or follow the route with the arrow controls.'; renderDaylightCycle(skyClock,DAYS[0].iso,{compact:true});
}
function resize(){ const w=stage.clientWidth,h=stage.clientHeight, aspect=w/h; const halfHeight=aspect<.8?10.3:Math.max(5.75,9.25/aspect); camera.left=-halfHeight*aspect; camera.right=halfHeight*aspect; camera.top=halfHeight; camera.bottom=-halfHeight; camera.updateProjectionMatrix(); renderer.setSize(w,h); }
function animate(){
  raf=requestAnimationFrame(animate);
  const now=performance.now();
  if(!reduceMotion){
    waterMaterial.uniforms.uTime.value=now*.001;
    clouds.forEach(cloud=>{cloud.position.x=cloud.userData.origin+Math.sin(now*cloud.userData.speed)*.8;});
    if(selectionAura.visible){selectionAura.rotation.z=now*.00045; selectionAura.userData.inner.rotation.z=-now*.0012; selectionAura.userData.outer.material.opacity=.68+Math.sin(now*.003)*.2;}
  }
  if(viewTransition){
    const progress=Math.min((now-viewTransition.started)/viewTransition.duration,1);
    const eased=viewTransition.easing==='inOut'
      ? progress<.5 ? 4*progress*progress*progress : 1-Math.pow(-2*progress+2,3)/2
      : 1-Math.pow(1-progress,3);
    const zoomProgress=viewTransition.delayedZoom?Math.max(0,(progress-.18)/.82):progress;
    const zoomEase=1-Math.pow(1-zoomProgress,3);
    camera.position.lerpVectors(viewTransition.positionFrom,viewTransition.positionTo,eased);
    camera.position.z+=Math.sin(Math.PI*progress)*(viewTransition.arcHeight||0);
    controls.target.lerpVectors(viewTransition.targetFrom,viewTransition.targetTo,eased);
    camera.zoom=THREE.MathUtils.lerp(viewTransition.zoomFrom,viewTransition.zoomTo,zoomEase);
    camera.updateProjectionMatrix(); camera.lookAt(controls.target);
    if(progress===1){viewTransition=null; controls.update();}
  } else {
    if(followingSelection){controls.target.lerp(targetGoal,.08); if(controls.target.distanceToSquared(targetGoal)<.0001){controls.target.copy(targetGoal); followingSelection=false;}}
    controls.update();
  }
  renderer.render(scene,camera);
}
window.BANDO33_ATLAS = { selectTemple: select, reset: resetView };
