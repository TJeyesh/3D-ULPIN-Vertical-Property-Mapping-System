import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CadastralUnit } from '../types/cadastre';
import {
  Layers,
  Box,
  Eye,
  Maximize2,
  Minimize2,
  Compass,
  RotateCcw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  units: CadastralUnit[];
  selectedUnit: CadastralUnit | null;
  onSelectUnit: (unit: CadastralUnit | null) => void;
  explosionFactor: number;
  onExplosionChange: (val: number) => void;
  selectedFloorFilter: number | null;
  onFloorFilterChange: (floor: number | null) => void;
  totalFloors: number;
}

export const Cadastral3DViewer: React.FC<Props> = ({
  units,
  selectedUnit,
  onSelectUnit,
  explosionFactor,
  onExplosionChange,
  selectedFloorFilter,
  onFloorFilterChange,
  totalFloors,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showCentroidPins, setShowCentroidPins] = useState(true);
  const [showGroundGrid, setShowGroundGrid] = useState(true);
  const [hoveredUnit, setHoveredUnit] = useState<CadastralUnit | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Three.js instances ref
  const threeRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    unitMeshes: Map<string, THREE.Mesh>;
    wireframeMeshes: Map<string, THREE.LineSegments>;
    pinObjects: Map<string, THREE.Group>;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    isDragging: boolean;
    previousMousePosition: { x: number; y: number };
    spherical: { radius: number; theta: number; phi: number };
    target: THREE.Vector3;
    animationFrameId: number | null;
  } | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a0e17');
    scene.fog = new THREE.FogExp2('#0a0e17', 0.008);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Spherical orbit controls state
    const spherical = {
      radius: 48,
      theta: Math.PI / 4,
      phi: Math.PI / 3,
    };
    const target = new THREE.Vector3(10, 8, 8);

    const updateCameraPos = () => {
      camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
      camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
      camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
      camera.lookAt(target);
    };
    updateCameraPos();

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(35, 60, 40);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const blueFillLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
    blueFillLight.position.set(-30, 20, -30);
    scene.add(blueFillLight);

    // Ground Grid & Cadastral Footprint
    const gridHelper = new THREE.GridHelper(80, 40, 0x3b82f6, 0x1e293b);
    gridHelper.position.set(10, -0.05, 8);
    scene.add(gridHelper);

    // Ground Base Plate
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      metalness: 0.1,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(10, -0.1, 8);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    threeRef.current = {
      scene,
      camera,
      renderer,
      unitMeshes: new Map(),
      wireframeMeshes: new Map(),
      pinObjects: new Map(),
      raycaster,
      mouse,
      isDragging: false,
      previousMousePosition: { x: 0, y: 0 },
      spherical,
      target,
      animationFrameId: null,
    };

    // Render loop
    const animate = () => {
      renderer.render(scene, camera);
      threeRef.current!.animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Mouse Orbit & Pan handlers
    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      threeRef.current!.isDragging = true;
      threeRef.current!.previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      threeRef.current!.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      threeRef.current!.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (threeRef.current!.isDragging) {
        const deltaX = e.clientX - threeRef.current!.previousMousePosition.x;
        const deltaY = e.clientY - threeRef.current!.previousMousePosition.y;

        if (e.buttons === 1) {
          // Left click: Orbit
          threeRef.current!.spherical.theta -= deltaX * 0.008;
          threeRef.current!.spherical.phi = Math.max(
            0.1,
            Math.min(Math.PI / 2 - 0.05, threeRef.current!.spherical.phi - deltaY * 0.008)
          );
          updateCameraPos();
        } else if (e.buttons === 2 || e.shiftKey) {
          // Right click / Shift: Pan
          const panSpeed = 0.05;
          target.x -= deltaX * panSpeed;
          target.z -= deltaY * panSpeed;
          updateCameraPos();
        }

        threeRef.current!.previousMousePosition = { x: e.clientX, y: e.clientY };
      } else {
        // Hover Raycast
        raycaster.setFromCamera(threeRef.current!.mouse, camera);
        const meshList: THREE.Mesh[] = Array.from(threeRef.current!.unitMeshes.values());
        const activeMeshes = meshList.filter((m) => m.visible);
        const intersects = raycaster.intersectObjects(activeMeshes);

        if (intersects.length > 0) {
          const hitMesh = intersects[0].object as THREE.Mesh;
          const uId = hitMesh.name;
          const unit = units.find((u) => u.unitId === uId);
          setHoveredUnit(unit || null);
          dom.style.cursor = 'pointer';
        } else {
          setHoveredUnit(null);
          dom.style.cursor = 'default';
        }
      }
    };

    const onMouseUp = () => {
      threeRef.current!.isDragging = false;
    };

    const onClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      const mouseVec = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      raycaster.setFromCamera(mouseVec, camera);
      const meshList: THREE.Mesh[] = Array.from(threeRef.current!.unitMeshes.values());
      const activeMeshes = meshList.filter((m) => m.visible);
      const intersects = raycaster.intersectObjects(activeMeshes);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const uId = hitMesh.name;
        const unit = units.find((u) => u.unitId === uId);
        if (unit) onSelectUnit(unit);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      threeRef.current!.spherical.radius = Math.max(
        15,
        Math.min(120, threeRef.current!.spherical.radius + e.deltaY * 0.05)
      );
      updateCameraPos();
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('click', onClick);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', onContextMenu);

    // Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !threeRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      if (threeRef.current?.animationFrameId) {
        cancelAnimationFrame(threeRef.current.animationFrameId);
      }
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('click', onClick);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('contextmenu', onContextMenu);
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, []);

  // Update Geometry and Meshes when units change
  useEffect(() => {
    if (!threeRef.current) return;
    const { scene, unitMeshes, wireframeMeshes, pinObjects } = threeRef.current;

    // Clean old meshes
    unitMeshes.forEach((mesh) => scene.remove(mesh));
    wireframeMeshes.forEach((mesh) => scene.remove(mesh));
    pinObjects.forEach((pin) => scene.remove(pin));
    unitMeshes.clear();
    wireframeMeshes.clear();
    pinObjects.clear();

    units.forEach((unit) => {
      const geo = new THREE.BufferGeometry();
      const vertices = new Float32Array(unit.mesh.vertices);
      const normals = new Float32Array(unit.mesh.normals);
      const indices = new Uint32Array(unit.mesh.indices);

      geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      if (normals.length === vertices.length) {
        geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      } else {
        geo.computeVertexNormals();
      }
      geo.setIndex(new THREE.BufferAttribute(indices, 1));

      // Solid Unit Mesh
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(unit.color || '#3b82f6'),
        roughness: 0.35,
        metalness: 0.2,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = unit.unitId;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      unitMeshes.set(unit.unitId, mesh);

      // Wireframe Outline Mesh
      const wireGeo = new THREE.WireframeGeometry(geo);
      const wireMat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1,
        transparent: true,
        opacity: 0.35,
      });
      const wireMesh = new THREE.LineSegments(wireGeo, wireMat);
      wireMesh.name = `wire_${unit.unitId}`;
      scene.add(wireMesh);
      wireframeMeshes.set(unit.unitId, wireMesh);

      // Centroid 3D Pin & Label Group
      const pinGroup = new THREE.Group();
      const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      sphere.position.set(unit.centroid3D.x, unit.centroid3D.z, unit.centroid3D.y);
      pinGroup.add(sphere);

      scene.add(pinGroup);
      pinObjects.set(unit.unitId, pinGroup);
    });
  }, [units]);

  // Handle Dynamic Explosion, Filtering, Selection Highlights, Wireframe toggles
  useEffect(() => {
    if (!threeRef.current) return;
    const { unitMeshes, wireframeMeshes, pinObjects } = threeRef.current;

    units.forEach((unit) => {
      const mesh = unitMeshes.get(unit.unitId);
      const wireMesh = wireframeMeshes.get(unit.unitId);
      const pin = pinObjects.get(unit.unitId);

      const isVisible = selectedFloorFilter === null || unit.floorNumber === selectedFloorFilter;
      const verticalExplosionOffset = unit.floorNumber * explosionFactor * 4.0;

      if (mesh) {
        mesh.visible = isVisible;
        mesh.position.y = verticalExplosionOffset;

        const isSelected = selectedUnit?.unitId === unit.unitId;
        const isHovered = hoveredUnit?.unitId === unit.unitId;

        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.wireframe = showWireframe;

        if (isSelected) {
          mat.emissive = new THREE.Color('#10b981');
          mat.emissiveIntensity = 0.6;
          mat.opacity = 1.0;
        } else if (isHovered) {
          mat.emissive = new THREE.Color('#38bdf8');
          mat.emissiveIntensity = 0.4;
          mat.opacity = 0.95;
        } else {
          mat.emissive = new THREE.Color(0x000000);
          mat.emissiveIntensity = 0;
          mat.opacity = selectedUnit ? 0.45 : 0.88;
        }
      }

      if (wireMesh) {
        wireMesh.visible = isVisible && (showWireframe || selectedUnit?.unitId === unit.unitId);
        wireMesh.position.y = verticalExplosionOffset;
      }

      if (pin) {
        pin.visible = isVisible && showCentroidPins;
        pin.position.y = verticalExplosionOffset;
      }
    });
  }, [
    units,
    explosionFactor,
    selectedFloorFilter,
    selectedUnit,
    hoveredUnit,
    showWireframe,
    showCentroidPins,
  ]);

  // Reset Camera View
  const resetCamera = () => {
    if (!threeRef.current) return;
    threeRef.current.spherical.radius = 48;
    threeRef.current.spherical.theta = Math.PI / 4;
    threeRef.current.spherical.phi = Math.PI / 3;
    threeRef.current.target.set(10, 8, 8);
    const camera = threeRef.current.camera;
    const target = threeRef.current.target;
    const spherical = threeRef.current.spherical;
    camera.position.x = target.x + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
    camera.position.y = target.y + spherical.radius * Math.cos(spherical.phi);
    camera.position.z = target.z + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
    camera.lookAt(target);
  };

  return (
    <div
      id="3d-cadastre-viewport-container"
      className={`relative w-full h-full min-h-[500px] rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : ''
      }`}
    >
      {/* 3D Canvas Canvas Mount */}
      <div ref={containerRef} className="w-full h-full flex-1 relative cursor-grab active:cursor-grabbing" />

      {/* Top Floating Cadastral Overlay */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2.5 rounded-lg shadow-lg pointer-events-auto flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <div className="text-xs font-semibold text-slate-200 tracking-wide uppercase flex items-center gap-1.5">
              3D Cadastral Digital Twin
              <span className="bg-blue-600/30 text-blue-400 border border-blue-500/40 text-[10px] px-1.5 py-0.5 rounded font-mono">
                SIH26011
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Interactive Vertical Volumetric Cadastre ({units.length} Units Extruded)
            </div>
          </div>
        </div>

        {/* View Controls & Action Bar */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            id="btn-toggle-wireframe"
            onClick={() => setShowWireframe(!showWireframe)}
            className={`p-2 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 backdrop-blur-md ${
              showWireframe
                ? 'bg-blue-600 border-blue-400 text-white'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle Wireframe Structural Boundaries"
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wireframe</span>
          </button>

          <button
            id="btn-toggle-centroids"
            onClick={() => setShowCentroidPins(!showCentroidPins)}
            className={`p-2 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 backdrop-blur-md ${
              showCentroidPins
                ? 'bg-cyan-600 border-cyan-400 text-white'
                : 'bg-slate-900/80 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            title="Toggle 3D Centroid Pins"
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Centroids</span>
          </button>

          <button
            id="btn-reset-camera"
            onClick={resetCamera}
            className="p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 text-xs font-medium transition backdrop-blur-md"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-toggle-fullscreen"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 hover:bg-slate-800 text-xs font-medium transition backdrop-blur-md"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Hover Info Tooltip */}
      {hoveredUnit && !selectedUnit && (
        <div className="absolute bottom-24 left-4 bg-slate-900/95 backdrop-blur-md border border-blue-500/50 p-3 rounded-lg shadow-xl pointer-events-none max-w-xs animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-bold text-white">{hoveredUnit.unitName}</span>
            <span className="text-[10px] font-mono bg-blue-900/50 text-blue-300 px-1.5 py-0.5 rounded">
              {hoveredUnit.floorLabel}
            </span>
          </div>
          <div className="text-[11px] font-mono text-emerald-400 font-bold mb-1.5 tracking-wider">
            {hoveredUnit.formattedUlpin}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-300">
            <div>Area: {hoveredUnit.floorAreaSqMeters} m²</div>
            <div>Volume: {hoveredUnit.volumeCubicMeters} m³</div>
            <div>Altitude: {hoveredUnit.altitudeAmslCentroid} m AMSL</div>
            <div>Centroid: ({hoveredUnit.centroid3D.x}, {hoveredUnit.centroid3D.y}, {hoveredUnit.centroid3D.z})</div>
          </div>
          <div className="mt-1 text-[9px] text-slate-400 italic">Click unit to view full cadastral deed</div>
        </div>
      )}

      {/* Bottom Interactive HUD: Floor Separation Slider & Floor Badges */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-3 rounded-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Explosion Separation Slider */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Layers className="w-4 h-4 text-blue-400 shrink-0" />
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-300 font-medium">Floor Separation (Exploded 3D View)</span>
              <span className="font-mono text-blue-400 font-bold">{(explosionFactor * 100).toFixed(0)}%</span>
            </div>
            <input
              id="slider-floor-explosion"
              type="range"
              min="0"
              max="2.5"
              step="0.05"
              value={explosionFactor}
              onChange={(e) => onExplosionChange(parseFloat(e.target.value))}
              className="w-48 sm:w-60 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mt-1"
            />
          </div>
        </div>

        {/* Floor Quick Isolator Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            id="filter-all-floors"
            onClick={() => onFloorFilterChange(null)}
            className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
              selectedFloorFilter === null
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All Floors ({units.length})
          </button>
          {Array.from({ length: totalFloors }, (_, idx) => (
            <button
              key={idx}
              id={`filter-floor-${idx}`}
              onClick={() => onFloorFilterChange(idx)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition whitespace-nowrap ${
                selectedFloorFilter === idx
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {idx === 0 ? 'Ground (G0)' : `Floor ${idx}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
