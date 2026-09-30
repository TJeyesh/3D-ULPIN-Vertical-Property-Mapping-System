import React, { useState, useMemo } from 'react';
import {
  CadastralPlot,
  CadastralUnit,
  FloorplanPreset,
} from './types/cadastre';
import { FLOORPLAN_PRESETS } from './utils/floorplanPresets';
import { generateCadastralBuilding } from './utils/extrusion3D';
import { Cadastral3DViewer } from './components/Cadastral3DViewer';
import { SegmentationWorkbench } from './components/SegmentationWorkbench';
import { UlpinDecoderWorkbench } from './components/UlpinDecoderWorkbench';
import { CodeAndArchitectureExplorer } from './components/CodeAndArchitectureExplorer';
import { UnitDetailModal } from './components/UnitDetailModal';
import confetti from 'canvas-confetti';
import {
  Layers,
  Box,
  Compass,
  Building2,
  KeyRound,
  FileCode,
  Sparkles,
  Sliders,
  Download,
  Info,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'3d_viewer' | 'ai_segmentation' | 'ulpin_engine' | 'codebase'>('3d_viewer');

  // Cadastral Plot Configuration
  const [plot, setPlot] = useState<CadastralPlot>({
    surveyPlotNo: 'KA-BLR-2026-789',
    villageOrSector: 'Whitefield Electronic City',
    district: 'Bengaluru Urban',
    state: 'Karnataka',
    latitude: 28.613939,
    longitude: 77.209021,
    groundElevationAmsl: 215.0,
    totalFloors: 5,
    ceilingHeightPerFloor: 3.2,
    totalVerticalUnits: 20,
    buildingName: 'Surya Heights Vertical Residency',
  });

  // Selected Floorplan Preset for 2D Segmentation & Extrusion
  const [activePreset, setActivePreset] = useState<FloorplanPreset>(FLOORPLAN_PRESETS[0]);

  // 3D Viewport Controls
  const [explosionFactor, setExplosionFactor] = useState<number>(0.4);
  const [selectedFloorFilter, setSelectedFloorFilter] = useState<number | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<CadastralUnit | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Generate 3D Building Units
  const units = useMemo(() => {
    return generateCadastralBuilding(plot, activePreset);
  }, [plot, activePreset]);

  // Handler when user selects a unit
  const handleSelectUnit = (unit: CadastralUnit | null) => {
    setSelectedUnit(unit);
    if (unit) {
      setIsDetailModalOpen(true);
    }
  };

  // Trigger regeneration with confetti
  const handleRegenerate = () => {
    confetti({
      particleCount: 70,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#3b82f6', '#10b981', '#a855f7'],
    });
  };

  // Export full JSON dataset
  const handleExportJSON = () => {
    const payload = {
      project: 'SIH26011 - 3D ULPIN & Vertical Property Mapping',
      ministry: 'Ministry of Rural Development / Dept of Land Resources',
      cadastral_plot: plot,
      units,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `3D_ULPIN_Cadastre_${plot.surveyPlotNo}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="sih26011-app-root" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Ministry & SIH Navigation Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
                3D ULPIN & Vertical Property Mapping System
              </h1>
              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                SIH26011
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Ministry of Rural Development • 3D Bhu-Aadhaar Cadastral Digital Twin
            </div>
          </div>
        </div>

        {/* Center Primary Tab Bar */}
        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 shadow-inner">
          <button
            id="nav-tab-3d-viewer"
            onClick={() => setActiveTab('3d_viewer')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === '3d_viewer'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>3D Cadastre Visualizer</span>
          </button>

          <button
            id="nav-tab-ai-segmentation"
            onClick={() => setActiveTab('ai_segmentation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'ai_segmentation'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Module 1: AI Pipeline</span>
          </button>

          <button
            id="nav-tab-ulpin-engine"
            onClick={() => setActiveTab('ulpin_engine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'ulpin_engine'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Module 3: ULPIN Engine</span>
          </button>

          <button
            id="nav-tab-codebase"
            onClick={() => setActiveTab('codebase')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'codebase'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Codebase & Guide</span>
          </button>
        </nav>

        {/* Right Actions: Cadastre Settings & Export */}
        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-plot-settings"
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition flex items-center gap-1.5 ${
              isSettingsOpen
                ? 'bg-slate-800 border-blue-500 text-blue-300'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Plot Config</span>
          </button>

          <button
            id="btn-export-cadastre-json"
            onClick={handleExportJSON}
            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-medium transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export JSON</span>
          </button>
        </div>
      </header>

      {/* Cadastral Settings Drawer (Collapsible) */}
      {isSettingsOpen && (
        <div className="bg-slate-900 border-b border-slate-800 p-4 lg:px-8 shadow-2xl animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Cadastral Plot Survey No.</label>
              <input
                type="text"
                value={plot.surveyPlotNo}
                onChange={(e) => setPlot({ ...plot, surveyPlotNo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Total Vertical Floors</label>
              <select
                value={plot.totalFloors}
                onChange={(e) => {
                  setPlot({ ...plot, totalFloors: parseInt(e.target.value) });
                  handleRegenerate();
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              >
                {[3, 4, 5, 6, 8, 10, 15, 20].map((num) => (
                  <option key={num} value={num}>
                    {num} Floors (Ground + {num - 1})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Ceiling Height (meters)</label>
              <input
                type="number"
                step="0.1"
                min="2.5"
                max="6.0"
                value={plot.ceilingHeightPerFloor}
                onChange={(e) => setPlot({ ...plot, ceilingHeightPerFloor: parseFloat(e.target.value) || 3.0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Ground Altitude (AMSL m)</label>
              <input
                type="number"
                step="1"
                value={plot.groundElevationAmsl}
                onChange={(e) => setPlot({ ...plot, groundElevationAmsl: parseFloat(e.target.value) || 200 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Plot Latitude (WGS84)</label>
              <input
                type="number"
                step="0.000001"
                value={plot.latitude}
                onChange={(e) => setPlot({ ...plot, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Plot Longitude (WGS84)</label>
              <input
                type="number"
                step="0.000001"
                value={plot.longitude}
                onChange={(e) => setPlot({ ...plot, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 space-y-6">
        {/* Tab 1: 3D Digital Twin Viewer */}
        {activeTab === '3d_viewer' && (
          <div className="space-y-6">
            {/* 3D Visualizer Container */}
            <div className="w-full h-[580px] rounded-xl overflow-hidden shadow-2xl">
              <Cadastral3DViewer
                units={units}
                selectedUnit={selectedUnit}
                onSelectUnit={handleSelectUnit}
                explosionFactor={explosionFactor}
                onExplosionChange={setExplosionFactor}
                selectedFloorFilter={selectedFloorFilter}
                onFloorFilterChange={setSelectedFloorFilter}
                totalFloors={plot.totalFloors}
              />
            </div>

            {/* Extruded Vertical Units Registry Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    3D Cadastral Digital Registry ({units.length} Extruded Units)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Deterministic 14-digit Vertical ULPIN / 3D Bhu-Aadhaar records mapping individual vertical apartments.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono">Survey: {plot.surveyPlotNo}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-emerald-400 font-bold">{plot.totalFloors} Floors</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Unit ID</th>
                      <th className="py-2.5 px-3">Property Name</th>
                      <th className="py-2.5 px-3">14-Digit 3D ULPIN</th>
                      <th className="py-2.5 px-3">Altitude (AMSL)</th>
                      <th className="py-2.5 px-3">3D Centroid (X,Y,Z)</th>
                      <th className="py-2.5 px-3">Area</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {units.map((unit) => {
                      const isSelected = selectedUnit?.unitId === unit.unitId;
                      return (
                        <tr
                          key={unit.unitId}
                          id={`row-unit-${unit.unitId}`}
                          onClick={() => handleSelectUnit(unit)}
                          className={`hover:bg-slate-800/60 transition cursor-pointer ${
                            isSelected ? 'bg-blue-950/40 text-blue-200' : 'text-slate-300'
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-slate-200">{unit.unitId}</td>
                          <td className="py-2.5 px-3 font-sans font-medium text-white">{unit.unitName}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded tracking-wider">
                              {unit.formattedUlpin}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-cyan-300">{unit.altitudeAmslCentroid}m</td>
                          <td className="py-2.5 px-3 text-slate-400">
                            ({unit.centroid3D.x}, {unit.centroid3D.y}, {unit.centroid3D.z})m
                          </td>
                          <td className="py-2.5 px-3 text-slate-200 font-sans">{unit.floorAreaSqMeters} m²</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectUnit(unit);
                              }}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded text-[11px] font-sans font-medium transition"
                            >
                              Inspect Deed
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: AI Floorplan Segmentation Pipeline */}
        {activeTab === 'ai_segmentation' && (
          <SegmentationWorkbench
            activePreset={activePreset}
            onSelectPreset={setActivePreset}
            onExtrudeTo3D={() => {
              setActiveTab('3d_viewer');
              handleRegenerate();
            }}
          />
        )}

        {/* Tab 3: 3D ULPIN Engine & Validator */}
        {activeTab === 'ulpin_engine' && <UlpinDecoderWorkbench />}

        {/* Tab 4: Codebase, Swift files & SIH Submission Guide */}
        {activeTab === 'codebase' && <CodeAndArchitectureExplorer />}
      </main>

      {/* Cadastral Property Deed Modal */}
      {isDetailModalOpen && (
        <UnitDetailModal
          unit={selectedUnit}
          plot={plot}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 px-4 text-center text-xs text-slate-500 space-y-1 bg-slate-950">
        <div>Smart India Hackathon 2026 • Problem Statement SIH26011</div>
        <div>
          Ministry of Rural Development • Department of Land Resources (DoLR) • 3D ULPIN / Bhu-Aadhaar Cadastral Framework
        </div>
      </footer>
    </div>
  );
}
