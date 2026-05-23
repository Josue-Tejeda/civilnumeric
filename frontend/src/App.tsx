import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  ChevronDown, 
  ChevronUp, 
  Play, 
  AlertTriangle, 
  TrendingUp, 
  Table, 
  Waves,
  Info
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './App.css';

// Dynamically target local development port or relative path for production
const API_URL = import.meta.env.DEV ? 'http://localhost:8000' : '';

interface Iteration {
  iteration: number;
  x: number;
  fx: number;
  error: number | null;
}

interface SolverResult {
  root: number;
  converged: boolean;
  iterations: Iteration[];
  error?: string;
}

interface HydraulicProperties {
  y: number;
  A: number;
  P: number;
  T: number;
  Rh: number;
  v: number;
  E: number;
  Fr: number;
}

interface SolveResponse {
  bisection: SolverResult;
  newton_raphson: SolverResult;
  secant: SolverResult;
  hydraulic_properties: HydraulicProperties;
}

function App() {
  // 1. Core State
  const [channelType, setChannelType] = useState<string>('rectangular');
  const [calculationType, setCalculationType] = useState<string>('normal_depth');
  
  // Physical parameters
  const [b, setB] = useState<number>(2.0);
  const [z, setZ] = useState<number>(1.5);
  const [D, setD] = useState<number>(2.0);
  const [Q, setQ] = useState<number>(2.0);
  const [n, setN] = useState<number>(0.015);
  const [S0, setS0] = useState<number>(0.001);
  const [y1, setY1] = useState<number>(0.3); // for hydraulic jump
  
  // Solver settings
  const [tol, setTol] = useState<number>(1e-6);
  const [maxIter, setMaxIter] = useState<number>(100);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  
  // Manual solver seeds
  const [bisectA, setBisectA] = useState<number>(0.1);
  const [bisectB, setBisectB] = useState<number>(2.0);
  const [newtonX0, setNewtonX0] = useState<number>(0.5);
  const [secantX0, setSecantX0] = useState<number>(0.5);
  const [secantX1, setSecantX1] = useState<number>(1.0);
  
  // Flag to check if seed states are dirty/manually customized
  const [isSeedsCustomized, setIsSeedsCustomized] = useState<boolean>(false);

  // 2. Results & UI States
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<SolveResponse | null>(null);
  const [activeTab, setActiveTab] = useState<string>('svg'); // 'svg' | 'chart' | 'tables'
  const [tableSolver, setTableSolver] = useState<string>('newton_raphson'); // 'bisection' | 'newton_raphson' | 'secant'

  // Helper to calculate geometry on the client for live validation
  const getGeometryJS = (type: string, yVal: number, bVal: number, zVal: number, DVal: number) => {
    if (yVal <= 0) return { A: 0, P: 0, T: 0, Ay_bar: 0 };
    if (type === 'rectangular') {
      return {
        A: bVal * yVal,
        P: bVal + 2 * yVal,
        T: bVal,
        Ay_bar: 0.5 * bVal * yVal * yVal
      };
    } else if (type === 'trapezoidal') {
      return {
        A: (bVal + zVal * yVal) * yVal,
        P: bVal + 2 * yVal * Math.sqrt(1 + zVal * zVal),
        T: bVal + 2 * zVal * yVal,
        Ay_bar: (bVal / 2 + (zVal * yVal) / 3) * yVal * yVal
      };
    } else if (type === 'triangular') {
      return {
        A: zVal * yVal * yVal,
        P: 2 * yVal * Math.sqrt(1 + zVal * zVal),
        T: 2 * zVal * yVal,
        Ay_bar: (zVal * yVal * yVal * yVal) / 3
      };
    } else { // circular
      const cosVal = Math.max(-1, Math.min(1, 1 - (2 * yVal) / DVal));
      const theta = 2 * Math.acos(cosVal);
      const A = (DVal * DVal / 8) * (theta - Math.sin(theta));
      const P = (DVal * theta) / 2;
      const T = DVal * Math.sin(theta / 2);
      const Ay_bar = (DVal * DVal * DVal / 12) * Math.pow(Math.sin(theta / 2), 3) - A * (DVal / 2 - yVal);
      return { A, P, T, Ay_bar };
    }
  };

  // Helper to evaluate residual function value on client
  const evaluateResidual = (yVal: number) => {
    const geom = getGeometryJS(channelType, yVal, b, z, D);
    const g = 9.81;
    if (calculationType === 'normal_depth') {
      if (geom.P === 0) return -Q;
      const Rh = geom.A / geom.P;
      return (1.0 / n) * geom.A * Math.pow(Rh, 2/3) * Math.sqrt(S0) - Q;
    } else if (calculationType === 'critical_depth') {
      return g * Math.pow(geom.A, 3) - Q * Q * geom.T;
    } else { // hydraulic_jump
      const geom1 = getGeometryJS(channelType, y1, b, z, D);
      const M1 = (Q * Q) / (g * geom1.A) + geom1.Ay_bar;
      if (geom.A === 0) return -M1;
      return (Q * Q) / (g * geom.A) + geom.Ay_bar - M1;
    }
  };

  // 3. Auto-calculation of Seeds
  useEffect(() => {
    if (!isSeedsCustomized) {
      if (calculationType === 'hydraulic_jump') {
        setBisectA(y1 * 1.05);
        setBisectB(channelType === 'circular' ? D * 0.99 : y1 * 6.0);
        setNewtonX0(channelType === 'circular' ? y1 + (D - y1) * 0.5 : y1 * 2.0);
        setSecantX0(y1 * 1.5);
        setSecantX1(channelType === 'circular' ? y1 + (D - y1) * 0.7 : y1 * 2.5);
      } else {
        if (channelType === 'circular') {
          setBisectA(0.01);
          setBisectB(D * 0.95);
          setNewtonX0(D * 0.5);
          setSecantX0(D * 0.4);
          setSecantX1(D * 0.6);
        } else {
          setBisectA(0.01);
          setBisectB(5.0);
          setNewtonX0(1.0);
          setSecantX0(0.5);
          setSecantX1(1.5);
        }
      }
    }
  }, [channelType, calculationType, b, z, D, Q, y1, isSeedsCustomized]);

  // Client validations for UI warnings
  const validationErrors: string[] = [];
  if (Q <= 0) validationErrors.push("El caudal Q debe ser mayor que cero.");
  if (calculationType === 'normal_depth') {
    if (n <= 0) validationErrors.push("La rugosidad n debe ser mayor que cero.");
    if (S0 <= 0) validationErrors.push("La pendiente S0 debe ser mayor que cero.");
  } else if (calculationType === 'hydraulic_jump') {
    if (y1 <= 0) validationErrors.push("El tirante inicial y1 debe ser mayor que cero.");
    if (channelType === 'circular' && y1 >= D) validationErrors.push("El tirante inicial y1 debe ser menor que el diámetro D.");
  }

  if (channelType === 'rectangular' || channelType === 'trapezoidal') {
    if (b <= 0) validationErrors.push("La plantilla b debe ser mayor que cero.");
  }
  if (channelType === 'trapezoidal' && z < 0) validationErrors.push("El talud z debe ser mayor o igual a cero.");
  if (channelType === 'triangular' && z <= 0) validationErrors.push("El talud z debe ser mayor que cero.");
  if (channelType === 'circular' && D <= 0) validationErrors.push("El diámetro D debe ser mayor que cero.");

  if (bisectA <= 0 || bisectB <= 0 || newtonX0 <= 0 || secantX0 <= 0 || secantX1 <= 0) {
    validationErrors.push("Todos los valores de partida del solver deben ser mayores que cero.");
  }
  if (bisectA >= bisectB) {
    validationErrors.push("El límite inferior bisect_a debe ser estrictamente menor que bisect_b.");
  }
  if (channelType === 'circular' && D > 0) {
    if (bisectA >= D || bisectB >= D || newtonX0 >= D || secantX0 >= D || secantX1 >= D) {
      validationErrors.push("Todas las semillas del solver deben ser menores que el diámetro D.");
    }
  }

  // Check sign change for Bisection on client
  let signChangeError: string | null = null;
  if (validationErrors.length === 0) {
    const fa = evaluateResidual(bisectA);
    const fb = evaluateResidual(bisectB);
    if (fa * fb > 0) {
      signChangeError = `El intervalo de Bisección [${bisectA}, ${bisectB}] no contiene un cambio de signo (f(a) = ${fa.toFixed(4)}, f(b) = ${fb.toFixed(4)}). Ajusta los límites.`;
    }
  }

  const handleCalculate = async () => {
    if (validationErrors.length > 0 || signChangeError) return;
    
    setLoading(true);
    setErrorMsg(null);
    
    const payload = {
      channel_type: channelType,
      calculation_type: calculationType,
      b: (channelType === 'rectangular' || channelType === 'trapezoidal') ? b : undefined,
      z: (channelType === 'trapezoidal' || channelType === 'triangular') ? z : undefined,
      D: channelType === 'circular' ? D : undefined,
      Q,
      n: calculationType === 'normal_depth' ? n : undefined,
      S0: calculationType === 'normal_depth' ? S0 : undefined,
      y1: calculationType === 'hydraulic_jump' ? y1 : undefined,
      bisect_a: bisectA,
      bisect_b: bisectB,
      newton_x0: newtonX0,
      secant_x0: secantX0,
      secant_x1: secantX1,
      tol,
      max_iter: maxIter
    };

    try {
      const response = await fetch(`${API_URL}/api/solve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Error en el servidor al realizar el cálculo.");
      }
      
      setResults(data);
      // Auto switch to SVG view
      setActiveTab('svg');
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo conectar con el servidor backend.");
    } finally {
      setLoading(false);
    }
  };

  // Compile Recharts semilog convergence data
  const getChartData = () => {
    if (!results) return [];
    const biIters = results.bisection.iterations;
    const nrIters = results.newton_raphson.iterations;
    const secIters = results.secant.iterations;
    
    const maxIters = Math.max(biIters.length, nrIters.length, secIters.length);
    const dataPoints = [];
    
    for (let i = 0; i < maxIters; i++) {
      dataPoints.push({
        iteration: i,
        // Plot error if available, else null to avoid lines breaking
        bisection: biIters[i] ? Math.max(1e-15, biIters[i].error || 0) : null,
        newton_raphson: nrIters[i] ? Math.max(1e-15, nrIters[i].error || 0) : null,
        secant: secIters[i] ? Math.max(1e-15, secIters[i].error || 0) : null,
      });
    }
    return dataPoints;
  };

  // SVG Geometry Constants & Draw Call
  const renderSVGGeometry = () => {
    if (!results) return null;
    const { y } = results.hydraulic_properties;
    const width = 420;
    const height = 300;
    const bottom = 240;
    const center = 210;
    
    // Scale mapping
    let scale = 1.0;
    let waterPath = "";
    let channelPath = "";
    let annotations: React.ReactNode = null;
    
    if (channelType === 'rectangular') {
      const yMax = Math.max(y * 1.5, 1.0);
      scale = Math.min(300 / b, 170 / yMax);
      const cW = b * scale;
      const cH = yMax * scale;
      const wH = y * scale;
      
      const xLeft = center - cW / 2;
      const xRight = center + cW / 2;
      const yTop = bottom - cH;
      const yWater = bottom - wH;
      
      channelPath = `M ${xLeft} ${yTop} L ${xLeft} ${bottom} L ${xRight} ${bottom} L ${xRight} ${yTop}`;
      waterPath = `M ${xLeft} ${bottom} L ${xLeft} ${yWater} Q ${center - cW/4} ${yWater - 2} ${center} ${yWater} T ${xRight} ${yWater} L ${xRight} ${bottom} Z`;
      
      annotations = (
        <>
          {/* b indicator */}
          <line x1={xLeft} y1={bottom + 15} x2={xRight} y2={bottom + 15} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
          <text x={center} y={bottom + 28} fill="#94a3b8" fontSize={11} textAnchor="middle">b = {b.toFixed(2)} m</text>
          {/* y indicator */}
          <line x1={xLeft - 15} y1={bottom} x2={xLeft - 15} y2={yWater} stroke="#0ea5e9" strokeWidth={1.5} />
          <text x={xLeft - 22} y={(bottom + yWater) / 2} fill="#38bdf8" fontSize={11} textAnchor="end" alignmentBaseline="middle">y = {y.toFixed(4)} m</text>
        </>
      );
    } else if (channelType === 'trapezoidal') {
      const yMax = Math.max(y * 1.5, 1.0);
      const bMax = b + 2.0 * z * yMax;
      scale = Math.min(320 / bMax, 170 / yMax);
      
      const cW = b * scale;
      const cH = yMax * scale;
      const wH = y * scale;
      
      const xLeftBot = center - cW / 2;
      const xRightBot = center + cW / 2;
      const xLeftTop = center - (b + 2.0 * z * yMax) * scale / 2;
      const xRightTop = center + (b + 2.0 * z * yMax) * scale / 2;
      const yTop = bottom - cH;
      const yWater = bottom - wH;
      
      const xLeftWater = center - (b + 2.0 * z * y) * scale / 2;
      const xRightWater = center + (b + 2.0 * z * y) * scale / 2;
      
      channelPath = `M ${xLeftTop} ${yTop} L ${xLeftBot} ${bottom} L ${xRightBot} ${bottom} L ${xRightTop} ${yTop}`;
      waterPath = `M ${xLeftBot} ${bottom} L ${xLeftWater} ${yWater} Q ${center} ${yWater - 3} ${xRightWater} ${yWater} L ${xRightBot} ${bottom} Z`;
      
      annotations = (
        <>
          {/* b indicator */}
          <line x1={xLeftBot} y1={bottom + 12} x2={xRightBot} y2={bottom + 12} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
          <text x={center} y={bottom + 24} fill="#94a3b8" fontSize={11} textAnchor="middle">b = {b.toFixed(2)} m</text>
          {/* y indicator */}
          <line x1={xLeftBot - 20} y1={bottom} x2={xLeftBot - 20} y2={yWater} stroke="#0ea5e9" strokeWidth={1.5} />
          <text x={xLeftBot - 27} y={(bottom + yWater) / 2} fill="#38bdf8" fontSize={11} textAnchor="end" alignmentBaseline="middle">y = {y.toFixed(4)} m</text>
          {/* Slope indicator */}
          <path d={`M ${xRightBot} ${bottom - 30} L ${xRightBot + 30} ${bottom - 30} L ${xRightBot + 30} ${bottom}`} fill="none" stroke="#64748b" strokeWidth={1} />
          <text x={xRightBot + 15} y={bottom - 35} fill="#94a3b8" fontSize={9} textAnchor="middle">z = {z.toFixed(2)}</text>
          <text x={xRightBot + 36} y={bottom - 15} fill="#94a3b8" fontSize={9} alignmentBaseline="middle">1</text>
        </>
      );
    } else if (channelType === 'triangular') {
      const yMax = Math.max(y * 1.5, 1.0);
      const bMax = 2.0 * z * yMax;
      scale = Math.min(320 / bMax, 170 / yMax);
      
      const cH = yMax * scale;
      const wH = y * scale;
      
      const xLeftTop = center - (z * yMax) * scale;
      const xRightTop = center + (z * yMax) * scale;
      const yTop = bottom - cH;
      const yWater = bottom - wH;
      
      const xLeftWater = center - (z * y) * scale;
      const xRightWater = center + (z * y) * scale;
      
      channelPath = `M ${xLeftTop} ${yTop} L ${center} ${bottom} L ${xRightTop} ${yTop}`;
      waterPath = `M ${center} ${bottom} L ${xLeftWater} ${yWater} Q ${center} ${yWater - 3} ${xRightWater} ${yWater} Z`;
      
      annotations = (
        <>
          {/* y indicator */}
          <line x1={center - 30} y1={bottom} x2={center - 30} y2={yWater} stroke="#0ea5e9" strokeWidth={1.5} />
          <text x={center - 37} y={(bottom + yWater) / 2} fill="#38bdf8" fontSize={11} textAnchor="end" alignmentBaseline="middle">y = {y.toFixed(4)} m</text>
          {/* Slope indicator */}
          <path d={`M ${center + 20} ${bottom - 30} L ${center + 20 + 20 * z} ${bottom - 30} L ${center + 20 + 20 * z} ${bottom}`} fill="none" stroke="#64748b" strokeWidth={1} />
          <text x={center + 20 + (10 * z)} y={bottom - 35} fill="#94a3b8" fontSize={9} textAnchor="middle">z = {z.toFixed(2)}</text>
          <text x={center + 25 + (20 * z)} y={bottom - 15} fill="#94a3b8" fontSize={9} alignmentBaseline="middle">1</text>
        </>
      );
    } else { // circular
      scale = 90 / (D / 2); // 180px diameter circle representation
      const radius = (D / 2) * scale;
      const cx = center;
      const cy = 135;
      const yBottom = cy + radius;
      const yWater = yBottom - y * scale;
      
      // Water segment
      if (y >= D) {
        waterPath = `M ${cx} ${cy} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
      } else if (y > 0) {
        const dy = Math.abs(yWater - cy);
        const dx = Math.sqrt(Math.max(0, radius * radius - dy * dy));
        const xL = cx - dx;
        const xR = cx + dx;
        const largeArc = y > D / 2 ? 1 : 0;
        waterPath = `M ${xL} ${yWater} A ${radius} ${radius} 0 ${largeArc} 0 ${xR} ${yWater} Z`;
      }
      
      channelPath = `M ${cx} ${cy} m -${radius}, 0 a ${radius},${radius} 0 1,0 ${radius * 2},0 a ${radius},${radius} 0 1,0 -${radius * 2},0`;
      
      annotations = (
        <>
          {/* D indicator */}
          <line x1={cx - radius} y1={yBottom + 12} x2={cx + radius} y2={yBottom + 12} stroke="#64748b" strokeWidth={1} strokeDasharray="3 3" />
          <text x={cx} y={yBottom + 25} fill="#94a3b8" fontSize={11} textAnchor="middle">D = {D.toFixed(2)} m</text>
          {/* y indicator */}
          <line x1={cx - radius - 20} y1={yBottom} x2={cx - radius - 20} y2={yWater} stroke="#0ea5e9" strokeWidth={1.5} />
          <text x={cx - radius - 27} y={(yBottom + yWater) / 2} fill="#38bdf8" fontSize={11} textAnchor="end" alignmentBaseline="middle">y = {y.toFixed(4)} m</text>
        </>
      );
    }
    
    return (
      <div className="svg-container">
        <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
          {/* Grid helper lines */}
          <line x1={40} y1={bottom} x2={380} y2={bottom} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
          
          {/* 1. Draw Water */}
          {waterPath && (
            <path 
              d={waterPath} 
              fill="rgba(14, 165, 233, 0.28)" 
              stroke="#38bdf8" 
              strokeWidth={2}
              className="water-wave"
            />
          )}
          
          {/* 2. Draw Channel walls */}
          <path 
            d={channelPath} 
            fill="none" 
            stroke="#94a3b8" 
            strokeWidth={3} 
            strokeLinecap="round"
          />
          
          {/* 3. Render annotations */}
          {annotations}
        </svg>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <Waves className="header-logo" />
          <div>
            <h1>CivilNumeric</h1>
            <p className="subtitle">Hidráulica de Canales y Solucionadores No Lineales Didácticos</p>
          </div>
        </div>
        <div className="header-status">
          <span className="badge">v1.0.0</span>
        </div>
      </header>

      {/* Main Grid */}
      <main className="main-grid">
        
        {/* Left Side: Inputs Panel */}
        <section className="inputs-panel glass">
          <h2 className="section-title"><Sliders className="inline-icon" /> Parámetros del Problema</h2>
          
          <div className="form-group">
            <label>Tipo de Sección de Canal</label>
            <div className="select-container">
              <select value={channelType} onChange={(e) => setChannelType(e.target.value)}>
                <option value="rectangular">Rectangular</option>
                <option value="trapezoidal">Trapezoidal</option>
                <option value="triangular">Triangular</option>
                <option value="circular">Circular</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Tipo de Ecuación Hidráulica</label>
            <div className="select-container">
              <select value={calculationType} onChange={(e) => setCalculationType(e.target.value)}>
                <option value="normal_depth">Tirante Normal (Manning)</option>
                <option value="critical_depth">Tirante Crítico (Energía Mínima)</option>
                <option value="hydraulic_jump">Resalto Hidráulico (Momentum)</option>
              </select>
            </div>
          </div>

          {/* Physical Parameters Inputs */}
          <div className="input-grid">
            {(channelType === 'rectangular' || channelType === 'trapezoidal') && (
              <div className="form-field">
                <label>Plantilla, b (m)</label>
                <input type="number" step="0.1" value={b} onChange={(e) => setB(parseFloat(e.target.value) || 0)} />
              </div>
            )}
            
            {(channelType === 'trapezoidal' || channelType === 'triangular') && (
              <div className="form-field">
                <label>Talud, z (H:1V)</label>
                <input type="number" step="0.1" value={z} onChange={(e) => setZ(parseFloat(e.target.value) || 0)} />
              </div>
            )}

            {channelType === 'circular' && (
              <div className="form-field">
                <label>Diámetro, D (m)</label>
                <input type="number" step="0.1" value={D} onChange={(e) => setD(parseFloat(e.target.value) || 0)} />
              </div>
            )}

            <div className="form-field">
              <label>Caudal, Q (m³/s)</label>
              <input type="number" step="0.1" value={Q} onChange={(e) => setQ(parseFloat(e.target.value) || 0)} />
            </div>

            {calculationType === 'normal_depth' && (
              <>
                <div className="form-field">
                  <label>Manning, n</label>
                  <input type="number" step="0.001" value={n} onChange={(e) => setN(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-field">
                  <label>Pendiente, S₀ (m/m)</label>
                  <input type="number" step="0.0001" value={S0} onChange={(e) => setS0(parseFloat(e.target.value) || 0)} />
                </div>
              </>
            )}

            {calculationType === 'hydraulic_jump' && (
              <div className="form-field">
                <label>Tirante y₁ (m)</label>
                <input type="number" step="0.05" value={y1} onChange={(e) => setY1(parseFloat(e.target.value) || 0)} />
              </div>
            )}
          </div>

          {/* Advanced Solver seeds colapsable */}
          <div className="advanced-section">
            <button 
              type="button" 
              className="advanced-toggle-btn"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Configuración de Solvers 
              {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showAdvanced && (
              <div className="advanced-content glass-dark">
                <div className="checkbox-field">
                  <input 
                    type="checkbox" 
                    id="customSeeds" 
                    checked={isSeedsCustomized} 
                    onChange={(e) => setIsSeedsCustomized(e.target.checked)} 
                  />
                  <label htmlFor="customSeeds">Personalizar semillas de búsqueda</label>
                </div>

                <div className="advanced-grid">
                  <div className="form-field">
                    <label>Bisección Límite a</label>
                    <input type="number" step="0.05" disabled={!isSeedsCustomized} value={bisectA} onChange={(e) => setBisectA(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Bisección Límite b</label>
                    <input type="number" step="0.05" disabled={!isSeedsCustomized} value={bisectB} onChange={(e) => setBisectB(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Newton x₀ (semilla)</label>
                    <input type="number" step="0.05" disabled={!isSeedsCustomized} value={newtonX0} onChange={(e) => setNewtonX0(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Secante x₀ (semilla)</label>
                    <input type="number" step="0.05" disabled={!isSeedsCustomized} value={secantX0} onChange={(e) => setSecantX0(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Secante x₁ (semilla)</label>
                    <input type="number" step="0.05" disabled={!isSeedsCustomized} value={secantX1} onChange={(e) => setSecantX1(parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="form-field">
                    <label>Tolerancia (tol)</label>
                    <input type="number" step="0.000001" value={tol} onChange={(e) => setTol(parseFloat(e.target.value) || 1e-6)} />
                  </div>
                  <div className="form-field">
                    <label>Máx Iteraciones</label>
                    <input type="number" value={maxIter} onChange={(e) => setMaxIter(parseInt(e.target.value) || 100)} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="validation-panel error-border">
              <h4 className="alert-title"><AlertTriangle className="alert-icon" /> Restricciones de Entrada</h4>
              <ul>
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Sign Change Warnings (preventive Biseccion) */}
          {validationErrors.length === 0 && signChangeError && (
            <div className="validation-panel warning-border">
              <h4 className="alert-title text-warning"><AlertTriangle className="alert-icon" /> Sin cambio de signo</h4>
              <p className="warning-text">{signChangeError}</p>
            </div>
          )}

          <button 
            type="button" 
            className="calculate-btn"
            disabled={loading || validationErrors.length > 0 || !!signChangeError}
            onClick={handleCalculate}
          >
            {loading ? "Ejecutando..." : <><Play className="play-icon" /> Calcular</>}
          </button>

          {errorMsg && (
            <div className="error-banner">
              <strong>Error: </strong> {errorMsg}
            </div>
          )}
        </section>

        {/* Right Side: Dashboard Panel */}
        <section className="dashboard-panel">
          {results ? (
            <div className="results-wrapper">
              
              {/* Summary Method Cards */}
              <div className="methods-summary-grid">
                
                {/* Bisection Card */}
                <div className="method-card bisect-border glass">
                  <div className="card-header">
                    <span className="method-title text-bisect">Bisección</span>
                    <span className={`status-badge ${results.bisection.converged ? 'bg-success' : 'bg-danger'}`}>
                      {results.bisection.converged ? 'Convergente' : 'No converge'}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="result-metric">
                      <span className="metric-label">Raíz (y)</span>
                      <span className="metric-val">{results.bisection.root.toFixed(5)} m</span>
                    </div>
                    <div className="result-metric">
                      <span className="metric-label">Iteraciones</span>
                      <span className="metric-val">{results.bisection.iterations.length}</span>
                    </div>
                  </div>
                </div>

                {/* Newton Raphson Card */}
                <div className="method-card nr-border glass">
                  <div className="card-header">
                    <span className="method-title text-nr">Newton-Raphson</span>
                    <span className={`status-badge ${results.newton_raphson.converged ? 'bg-success' : 'bg-danger'}`}>
                      {results.newton_raphson.converged ? 'Convergente' : 'No converge'}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="result-metric">
                      <span className="metric-label">Raíz (y)</span>
                      <span className="metric-val">{results.newton_raphson.root.toFixed(5)} m</span>
                    </div>
                    <div className="result-metric">
                      <span className="metric-label">Iteraciones</span>
                      <span className="metric-val">{results.newton_raphson.iterations.length}</span>
                    </div>
                  </div>
                </div>

                {/* Secant Card */}
                <div className="method-card secant-border glass">
                  <div className="card-header">
                    <span className="method-title text-secant">Secante</span>
                    <span className={`status-badge ${results.secant.converged ? 'bg-success' : 'bg-danger'}`}>
                      {results.secant.converged ? 'Convergente' : 'No converge'}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="result-metric">
                      <span className="metric-label">Raíz (y)</span>
                      <span className="metric-val">{results.secant.root.toFixed(5)} m</span>
                    </div>
                    <div className="result-metric">
                      <span className="metric-label">Iteraciones</span>
                      <span className="metric-val">{results.secant.iterations.length}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Visualization and Tab Panels */}
              <div className="dashboard-content glass">
                
                {/* View Tabs Selector */}
                <div className="tab-selector">
                  <button 
                    className={`tab-btn ${activeTab === 'svg' ? 'active' : ''}`}
                    onClick={() => setActiveTab('svg')}
                  >
                    <Waves size={16} className="inline-icon" /> Canal (Sección SVG)
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'chart' ? 'active' : ''}`}
                    onClick={() => setActiveTab('chart')}
                  >
                    <TrendingUp size={16} className="inline-icon" /> Convergencia (Error)
                  </button>
                  <button 
                    className={`tab-btn ${activeTab === 'tables' ? 'active' : ''}`}
                    onClick={() => setActiveTab('tables')}
                  >
                    <Table size={16} className="inline-icon" /> Tablas de Iteración
                  </button>
                </div>

                {/* Tab content */}
                <div className="tab-pane">
                  {activeTab === 'svg' && (
                    <div className="svg-pane-layout">
                      <div className="svg-visualization">
                        {renderSVGGeometry()}
                      </div>
                      
                      {/* Hydraulic Properties list */}
                      <div className="hydraulic-props glass-dark">
                        <h3>Propiedades Hidráulicas Finales</h3>
                        <div className="props-list">
                          <div className="prop-row">
                            <span className="prop-name">Tirante Resolvente (y)</span>
                            <span className="prop-val font-mono">{results.hydraulic_properties.y.toFixed(5)} m</span>
                          </div>
                          <div className="prop-row">
                            <span className="prop-name">Área Mojada (A)</span>
                            <span className="prop-val font-mono">{results.hydraulic_properties.A.toFixed(4)} m²</span>
                          </div>
                          <div className="prop-row">
                            <span className="prop-name">Perímetro Mojado (P)</span>
                            <span className="prop-val font-mono">{results.hydraulic_properties.P.toFixed(4)} m</span>
                          </div>
                          <div className="prop-row">
                            <span className="prop-name">Espejo de Agua (T)</span>
                            <span className="prop-val font-mono">{results.hydraulic_properties.T.toFixed(4)} m</span>
                          </div>
                          <div className="prop-row">
                            <span className="prop-name">Radio Hidráulico (Rₕ)</span>
                            <span className="prop-val font-mono">{results.hydraulic_properties.Rh.toFixed(4)} m</span>
                          </div>
                          <div className="prop-row">
                            <span className="prop-name">Velocidad Media (v)</span>
                            <span className="prop-val font-mono">{results.hydraulic_properties.v.toFixed(3)} m/s</span>
                          </div>
                          <div className="prop-row">
                            <span className="prop-name">Energía Específica (E)</span>
                            <span className="prop-val font-mono">{results.hydraulic_properties.E.toFixed(4)} m-t</span>
                          </div>
                          <div className="prop-row">
                            <span className="prop-name">Número de Froude (Fᵣ)</span>
                            <span className="prop-val font-mono">
                              {results.hydraulic_properties.Fr.toFixed(4)} 
                              <span className="froude-regime">
                                {results.hydraulic_properties.Fr < 1.0 ? ' (Subcrítico)' : results.hydraulic_properties.Fr > 1.0 ? ' (Supercrítico)' : ' (Crítico)'}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'chart' && (
                    <div className="chart-wrapper">
                      <h3>Convergencia de Error por Iteración (Semilog)</h3>
                      <p className="chart-desc">{"Eje Y en escala logarítmica representando el error relativo calculado $|x_k - x_{k-1}| / |x_k|$"}</p>
                      
                      <div className="recharts-container" style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                          <LineChart
                            data={getChartData()}
                            margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#232b3c" />
                            <XAxis 
                              dataKey="iteration" 
                              stroke="#64748b" 
                              label={{ value: 'Iteración', position: 'insideBottom', offset: -5, fill: '#64748b' }}
                            />
                            <YAxis 
                              scale="log" 
                              domain={['auto', 'auto']} 
                              stroke="#64748b"
                              label={{ value: 'Error Relativo', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                            />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6' }}
                              formatter={(value: any) => [value ? value.toExponential(4) : 'N/A', 'Error']}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Line 
                              type="monotone" 
                              dataKey="bisection" 
                              name="Bisección" 
                              stroke="#f97316" 
                              strokeWidth={2}
                              activeDot={{ r: 6 }} 
                              connectNulls
                            />
                            <Line 
                              type="monotone" 
                              dataKey="newton_raphson" 
                              name="Newton-Raphson" 
                              stroke="#10b981" 
                              strokeWidth={2}
                              activeDot={{ r: 6 }} 
                              connectNulls
                            />
                            <Line 
                              type="monotone" 
                              dataKey="secant" 
                              name="Secante" 
                              stroke="#8b5cf6" 
                              strokeWidth={2}
                              activeDot={{ r: 6 }} 
                              connectNulls
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {activeTab === 'tables' && (
                    <div className="tables-pane-layout">
                      <div className="solver-table-selector">
                        <button 
                          className={`table-select-btn bisect-btn-sel ${tableSolver === 'bisection' ? 'active' : ''}`}
                          onClick={() => setTableSolver('bisection')}
                        >
                          Bisección
                        </button>
                        <button 
                          className={`table-select-btn nr-btn-sel ${tableSolver === 'newton_raphson' ? 'active' : ''}`}
                          onClick={() => setTableSolver('newton_raphson')}
                        >
                          Newton-Raphson
                        </button>
                        <button 
                          className={`table-select-btn secant-btn-sel ${tableSolver === 'secant' ? 'active' : ''}`}
                          onClick={() => setTableSolver('secant')}
                        >
                          Secante
                        </button>
                      </div>

                      <div className="table-responsive">
                        <table>
                          <thead>
                            <tr>
                              <th>Iter. (k)</th>
                              <th>Estimación (x_k)</th>
                              <th>Residuo f(x_k)</th>
                              <th>Error Relativo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results[tableSolver as 'bisection' | 'newton_raphson' | 'secant'].iterations.map((iter, idx) => (
                              <tr key={idx}>
                                <td className="font-mono">{iter.iteration}</td>
                                <td className="font-mono">{iter.x.toFixed(6)}</td>
                                <td className="font-mono">{iter.fx.toExponential(4)}</td>
                                <td className="font-mono">
                                  {iter.error !== null ? iter.error.toExponential(4) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="dashboard-placeholder glass">
              <Waves className="placeholder-logo" />
              <h3>Preparado para el Cálculo</h3>
              <p>Ingresa los parámetros geométricos e hidráulicos a la izquierda y pulsa el botón <strong>Calcular</strong> para evaluar los solucionadores paralelos y ver las visualizaciones.</p>
              
              <div className="didactic-box glass-dark">
                <h4><Info className="info-icon" /> Guía Didáctica</h4>
                <p>
                  <strong>CivilNumeric</strong> evalúa los tres solucionadores clásicos simultáneamente:
                </p>
                <ul>
                  <li><strong className="text-bisect">Bisección</strong>: Método cerrado. Lento pero 100% convergente si la función es continua y hay cambio de signo en el intervalo $[a, b]$.</li>
                  <li><strong className="text-nr">Newton-Raphson</strong>: Método abierto de convergencia cuadrática rápida. Requiere la derivada exacta $f'(y)$, calculada aquí simbólicamente por el servidor usando SymPy.</li>
                  <li><strong className="text-secant">Secante</strong>: Método abierto que simula la derivada mediante diferencias finitas a partir de dos semillas $x_0$ y $x_1$.</li>
                </ul>
              </div>
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

export default App;
