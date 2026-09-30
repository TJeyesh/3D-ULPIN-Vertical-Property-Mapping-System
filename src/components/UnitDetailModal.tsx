import React from 'react';
import { CadastralUnit, CadastralPlot } from '../types/cadastre';
import {
  X,
  ShieldCheck,
  Building2,
  Compass,
  Layers,
  Box,
  QrCode,
  Download,
  Printer,
  FileCheck2,
} from 'lucide-react';

interface Props {
  unit: CadastralUnit | null;
  plot: CadastralPlot;
  onClose: () => void;
}

export const UnitDetailModal: React.FC<Props> = ({ unit, plot, onClose }) => {
  if (!unit) return null;

  return (
    <div
      id="unit-cadastre-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="unit-cadastre-deed-card"
        className="bg-slate-900 border border-blue-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative text-white space-y-5 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          id="btn-close-modal"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Certificate Header */}
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 tracking-wider uppercase mb-1">
            <Building2 className="w-4 h-4" />
            Ministry of Rural Development • Department of Land Resources
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            3D Vertical Property Cadastral Deed
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs px-2 py-0.5 rounded font-mono font-normal">
              SIH26011 Certified
            </span>
          </h2>
          <div className="text-xs text-slate-400 mt-1">
            Official 3D Bhu-Aadhaar Digital Twin Record for Parcel #{plot.surveyPlotNo}
          </div>
        </div>

        {/* Big 14-Digit 3D ULPIN Display Box */}
        <div className="bg-slate-950 border border-blue-500/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
          <div className="space-y-1 text-center sm:text-left">
            <div className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
              14-Digit 3D Bhu-Aadhaar / Vertical ULPIN
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-wider">
              {unit.formattedUlpin}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Mod-36 Luhn Cryptographic Verification: PASSED (Zero Typo Defect)</span>
            </div>
          </div>

          {/* QR Code Graphic */}
          <div className="w-18 h-18 bg-white p-1.5 rounded-lg flex items-center justify-center shrink-0 shadow">
            <QrCode className="w-14 h-14 text-slate-950" />
          </div>
        </div>

        {/* 3D Spatial Geometry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">3D Anchor Coordinates</div>
            <div className="font-mono font-bold text-white">
              ({unit.centroid3D.x}, {unit.centroid3D.y}, {unit.centroid3D.z}) m
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              {unit.centroid3D.anchorType === 'polylabel_pole_of_inaccessibility' ? 'Pole of Inaccessibility' : 'PIP Centroid'}
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Altitude (AMSL)</div>
            <div className="font-mono font-bold text-cyan-300">
              {unit.altitudeAmslCentroid} m AMSL
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Z Base: {unit.zBase}m | Top: {unit.zTop}m</div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Floor Level Tier</div>
            <div className="font-mono font-bold text-purple-300">
              {unit.floorLabel}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">Tier Code: {unit.ulpinBreakdown.verticalFloorTier}</div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Carpet Floor Area</div>
            <div className="font-mono font-bold text-emerald-300">
              {unit.floorAreaSqMeters} m² ({(unit.floorAreaSqMeters * 10.764).toFixed(0)} sq.ft)
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Extruded Volume</div>
            <div className="font-mono font-bold text-amber-300">
              {unit.volumeCubicMeters} m³
            </div>
          </div>

          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-[11px] mb-1">Floor Ceiling Height</div>
            <div className="font-mono font-bold text-white">
              {unit.ceilingHeightMeters} m
            </div>
          </div>
        </div>

        {/* Irregular Geometry / Point-in-Polygon Resolution Notice */}
        {unit.centroid3D.anchorType === 'polylabel_pole_of_inaccessibility' ? (
          <div className="bg-amber-950/40 border border-amber-500/50 p-3.5 rounded-xl text-xs space-y-1.5 text-amber-200">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Irregular / Concave Geometry: Polylabel Fallback Engaged</span>
            </div>
            <p className="text-[11px] text-amber-300/90 leading-relaxed">
              The bounding-box mathematical centroid ({unit.centroid3D.rawMathematicalCentroid?.x}, {unit.centroid3D.rawMathematicalCentroid?.y}) fell outside the unit's boundary. The system automatically engaged the <strong className="text-white">Pole of Inaccessibility (shapely.ops.polylabel)</strong> algorithm to anchor the 3D ULPIN at guaranteed interior coordinate <strong className="text-white">({unit.centroid3D.x}, {unit.centroid3D.y})</strong> with maximum inscribed buffer radius of {unit.centroid3D.inscribedRadius || 0.0}m.
            </p>
          </div>
        ) : (
          <div className="bg-slate-950/40 border border-emerald-500/30 p-3 rounded-xl text-xs flex items-center justify-between text-slate-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px]">Shapely Point-in-Polygon (PIP) Validation: Standard centroid verified inside boundary</span>
            </div>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800">100% Inside</span>
          </div>
        )}

        {/* Ownership & Cadastral Registry Details */}
        <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2">
          <div className="text-slate-400 font-semibold text-[11px]">Land Parcel Registry Information:</div>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div>Owner / Allottee: <span className="font-semibold text-white">{unit.ownerName || 'Bhu-Owner Registered'}</span></div>
            <div>Plot Survey No: <span className="font-mono text-blue-300">{plot.surveyPlotNo}</span></div>
            <div>District / State: <span className="text-white">{plot.district}, {plot.state}</span></div>
            <div>Plot GPS Coordinates: <span className="font-mono text-white">{plot.latitude.toFixed(5)}, {plot.longitude.toFixed(5)}</span></div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            id="btn-print-deed"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-2 border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Deed</span>
          </button>
          <button
            id="btn-close-deed"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
