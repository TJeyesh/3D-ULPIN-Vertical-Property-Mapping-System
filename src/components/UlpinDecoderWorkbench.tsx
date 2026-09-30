import React, { useState, useMemo } from 'react';
import {
  generate3DULPIN,
  validateULPIN,
  decodeULPIN,
  encodeGeohash,
  encodeVerticalTier,
  encodeSubunitVoxel,
  computeMod36Checksum,
} from '../utils/ulpin';
import {
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Search,
  Compass,
  ArrowRight,
  Layers,
  Box,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';

export const UlpinDecoderWorkbench: React.FC = () => {
  // Encoder inputs
  const [lat, setLat] = useState<number>(28.613939); // New Delhi cadastral
  const [lon, setLon] = useState<number>(77.209021);
  const [floorNum, setFloorNum] = useState<number>(4);
  const [centroidX, setCentroidX] = useState<number>(5.4);
  const [centroidY, setCentroidY] = useState<number>(8.2);
  const [ceilingH, setCeilingH] = useState<number>(3.2);
  const [baseAmsl, setBaseAmsl] = useState<number>(215.0);
  const [unitIdx, setUnitIdx] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);

  // Decoder input
  const [queryUlpin, setQueryUlpin] = useState<string>('77KA8B91-F04-U1-K');

  // Compute live 3D ULPIN
  const liveUlpinResult = useMemo(() => {
    const centroidZ = floorNum * ceilingH + ceilingH / 2.0;
    const amsl = baseAmsl + centroidZ;
    return generate3DULPIN(
      lat,
      lon,
      floorNum,
      { x: centroidX, y: centroidY, z: centroidZ, zAmsl: amsl },
      amsl,
      unitIdx
    );
  }, [lat, lon, floorNum, centroidX, centroidY, ceilingH, baseAmsl, unitIdx]);

  // Decode query ULPIN
  const decodedResult = useMemo(() => {
    return decodeULPIN(queryUlpin);
  }, [queryUlpin]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div id="ulpin-workbench" className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-bold text-white tracking-wide">
            Module 3: Deterministic 3D Vertical ULPIN (Bhu-Aadhaar) Engine
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Standardized 14-digit alphanumeric Vertical Land Parcel Identification Number extending the Ministry of Rural Development 2D standard into 3D volumetric space.
        </p>
      </div>

      {/* Grid: Live Generator & Live Decoder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3D ULPIN Interactive Generator */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              14-Digit 3D ULPIN Generator
            </h3>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
              Luhn Mod-36 Deterministic
            </span>
          </div>

          {/* Form Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 mb-1 font-medium">Cadastral Latitude (WGS84)</label>
              <input
                id="input-ulpin-lat"
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Cadastral Longitude (WGS84)</label>
              <input
                id="input-ulpin-lon"
                type="number"
                step="0.000001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Vertical Floor Tier / Level</label>
              <select
                id="select-ulpin-floor"
                value={floorNum}
                onChange={(e) => setFloorNum(parseInt(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              >
                <option value={-2}>Basement -2 (B2)</option>
                <option value={-1}>Basement -1 (B1)</option>
                <option value={0}>Ground Floor (G0)</option>
                {Array.from({ length: 30 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Floor {i + 1} (F{(i + 1).toString().padStart(2, '0')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Sub-Unit Spatial Index</label>
              <input
                id="input-ulpin-unit-idx"
                type="number"
                min="1"
                max="99"
                value={unitIdx}
                onChange={(e) => setUnitIdx(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Relative Centroid (X, Y) meters</label>
              <div className="flex gap-2">
                <input
                  id="input-ulpin-cx"
                  type="number"
                  step="0.1"
                  value={centroidX}
                  onChange={(e) => setCentroidX(parseFloat(e.target.value) || 0)}
                  placeholder="X"
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                />
                <input
                  id="input-ulpin-cy"
                  type="number"
                  step="0.1"
                  value={centroidY}
                  onChange={(e) => setCentroidY(parseFloat(e.target.value) || 0)}
                  placeholder="Y"
                  className="w-1/2 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">Base Ground Altitude (AMSL)</label>
              <input
                id="input-ulpin-amsl"
                type="number"
                step="1"
                value={baseAmsl}
                onChange={(e) => setBaseAmsl(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          {/* Generated 14-Digit 3D ULPIN Output Display */}
          <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-4 shadow-inner">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span className="font-semibold text-blue-400 uppercase tracking-wider">
                14-Digit Deterministic 3D-ULPIN
              </span>
              <button
                id="btn-copy-ulpin"
                onClick={() => copyToClipboard(liveUlpinResult.ulpin14)}
                className="flex items-center gap-1 text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded transition"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Big 14-Digit Code */}
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-white text-center py-2 tracking-widest bg-slate-900/90 rounded-lg border border-slate-800">
              {liveUlpinResult.formattedUlpin}
            </div>

            {/* 4 Structural Component Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-2 bg-purple-950/40 border border-purple-800/60 rounded-lg">
                <div className="font-mono font-bold text-sm text-purple-300">
                  {liveUlpinResult.breakdown.baseCadastralGeocode}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">1. Base Geocode (8)</div>
              </div>

              <div className="p-2 bg-blue-950/40 border border-blue-800/60 rounded-lg">
                <div className="font-mono font-bold text-sm text-blue-300">
                  {liveUlpinResult.breakdown.verticalFloorTier}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">2. Vertical Tier (3)</div>
              </div>

              <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded-lg">
                <div className="font-mono font-bold text-sm text-amber-300">
                  {liveUlpinResult.breakdown.subunitVoxelHash}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">3. Sub-Unit Voxel (2)</div>
              </div>

              <div className="p-2 bg-emerald-950/40 border border-emerald-800/60 rounded-lg">
                <div className="font-mono font-bold text-sm text-emerald-300">
                  {liveUlpinResult.breakdown.mod36Checksum}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">4. Mod-36 Check (1)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: 3D ULPIN Reverse Decoder & Inspector */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              Reverse 3D ULPIN Decoder
            </h3>
            <span className="text-[10px] text-slate-400">Query & Verification</span>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1 font-medium">
              Enter 14-Digit ULPIN / 3D Bhu-Aadhaar to Decode:
            </label>
            <input
              id="input-query-ulpin"
              type="text"
              value={queryUlpin}
              onChange={(e) => setQueryUlpin(e.target.value.toUpperCase())}
              placeholder="e.g. 77KA8B91F04U1K"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white font-mono text-sm tracking-wider focus:border-cyan-500"
            />
          </div>

          {/* Quick Pre-fill Samples */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="text-slate-400">Presets:</span>
            {['77KA8B91-G00-U1-C', '77KA8B91-F04-U1-K', '77KA8B91-B01-U2-8'].map((presetCode) => (
              <button
                key={presetCode}
                onClick={() => setQueryUlpin(presetCode)}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded font-mono text-cyan-300 border border-slate-700"
              >
                {presetCode}
              </button>
            ))}
          </div>

          {/* Decoded Cadastral Card */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">Cadastral Registry Decoded:</span>
                {decodedResult.isValid ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Valid Checksum
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Invalid / Length Error
                  </span>
                )}
              </div>

              <div className="space-y-2.5 text-xs text-slate-300 font-mono">
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-sans">Cadastral Base GeoCode:</span>
                  <span className="text-purple-300 font-bold">{decodedResult.baseGeocode}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-sans">Floor Classification:</span>
                  <span className="text-blue-300 font-bold">{decodedResult.floorType}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-sans">Decoded Floor Level:</span>
                  <span className="text-white font-bold">{decodedResult.decodedFloorNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400 font-sans">Internal Subunit Voxel:</span>
                  <span className="text-amber-300 font-bold">{decodedResult.voxelHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Integrity Check Character:</span>
                  <span className="text-emerald-300 font-bold">{decodedResult.checksum}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-2.5 bg-blue-950/30 border border-blue-900/50 rounded-lg text-[11px] text-blue-200">
              Deterministic property indexing guarantees zero vertical duplicate deeds across high-rise buildings.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
