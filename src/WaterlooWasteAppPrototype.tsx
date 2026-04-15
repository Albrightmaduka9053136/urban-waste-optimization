import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Database,
  Gauge,
  MapPinned,
  RefreshCw,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  TimerReset,
  Truck,
} from 'lucide-react';

type TrafficMode = 'Normal' | 'Moderate' | 'Heavy';
type Priority = 'High' | 'Medium' | 'Low';
type GpsStatus = 'On Track' | 'Minor Delay' | 'Watch';
type ServiceType = 'Garbage' | 'Recycling' | 'Organics';
type City = 'Waterloo' | 'Kitchener' | 'Cambridge';

type Zone = {
  id: number;
  code: string;
  name: string;
  city: City;
  serviceType: ServiceType;
  bagLimit: number;
  numUnits: number;
  x: number;
  y: number;
};

type TruckType = {
  id: number;
  startX: number;
  startY: number;
  driver: string;
  teamArea: string;
  capacity: string;
};

type EvaluatedZone = Zone & {
  risk: number;
  priority: Priority;
  predictedFill: number;
  gpsStatus: GpsStatus;
  etaMinutes: number;
};

type RouteStop = EvaluatedZone & {
  stopNumber: number;
  routeDecision: string;
  approxPoint: string;
  routeEtaMinutes: number;
};

const trafficModes: TrafficMode[] = ['Normal', 'Moderate', 'Heavy'];

const priorityStyles: Record<Priority, string> = {
  High: 'bg-red-500/15 text-red-200 ring-1 ring-red-400/30',
  Medium: 'bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30',
  Low: 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30',
};

const priorityDot: Record<Priority, string> = {
  High: '#ef4444',
  Medium: '#f59e0b',
  Low: '#22c55e',
};

const serviceAccent: Record<ServiceType, string> = {
  Garbage: 'text-red-200',
  Recycling: 'text-cyan-200',
  Organics: 'text-lime-200',
};

const baseZones: Zone[] = [
  { id: 1, code: 'WT-01', name: 'Waterloo North', city: 'Waterloo', serviceType: 'Garbage', bagLimit: 1, numUnits: 7, x: 28, y: 22 },
  { id: 2, code: 'WT-02', name: 'Sunnydale', city: 'Waterloo', serviceType: 'Recycling', bagLimit: 2, numUnits: 4, x: 21, y: 34 },
  { id: 3, code: 'WT-03', name: 'Westmount', city: 'Waterloo', serviceType: 'Garbage', bagLimit: 1, numUnits: 6, x: 30, y: 43 },
  { id: 4, code: 'KT-01', name: 'Bingemans', city: 'Kitchener', serviceType: 'Organics', bagLimit: 2, numUnits: 5, x: 50, y: 36 },
  { id: 5, code: 'KT-02', name: 'Chicopee', city: 'Kitchener', serviceType: 'Garbage', bagLimit: 1, numUnits: 5, x: 57, y: 46 },
  { id: 6, code: 'KT-03', name: 'South Kitchener', city: 'Kitchener', serviceType: 'Recycling', bagLimit: 2, numUnits: 3, x: 47, y: 60 },
  { id: 7, code: 'CB-01', name: 'Preston', city: 'Cambridge', serviceType: 'Garbage', bagLimit: 1, numUnits: 4, x: 73, y: 70 },
  { id: 8, code: 'CB-02', name: 'Cambridge Core', city: 'Cambridge', serviceType: 'Organics', bagLimit: 2, numUnits: 6, x: 81, y: 82 },
];

const trucks: TruckType[] = [
  { id: 1, startX: 24, startY: 18, driver: 'A. Silva', teamArea: 'Waterloo North Team', capacity: '86% available' },
  { id: 2, startX: 48, startY: 40, driver: 'M. Chen', teamArea: 'Kitchener Central Team', capacity: '73% available' },
  { id: 3, startX: 76, startY: 76, driver: 'J. Brown', teamArea: 'Cambridge South Team', capacity: '64% available' },
];

// Rule-based stand-in for a future ML model.
function scoreRisk(zone: Zone): number {
  let score = 0;
  if (zone.numUnits >= 5) score += 2;
  if (zone.bagLimit <= 1) score += 2;
  if (zone.serviceType === 'Garbage') score += 1;
  return score;
}

function getPriority(risk: number): Priority {
  if (risk >= 4) return 'High';
  if (risk >= 2) return 'Medium';
  return 'Low';
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getGpsStatus(id: number, tick: number): GpsStatus {
  const marker = (id * 7 + tick) % 9;
  if (marker <= 4) return 'On Track';
  if (marker <= 6) return 'Minor Delay';
  return 'Watch';
}

function estimateFillLevel(zone: Zone, liveTick: number): number {
  const baseValue = 38;
  const densityEffect = zone.numUnits * 4.8;
  const bagLimitEffect = zone.bagLimit <= 1 ? 16 : 6;
  const serviceTypeEffect = zone.serviceType === 'Garbage' ? 14 : zone.serviceType === 'Organics' ? 8 : 3;
  const periodicVariation = Math.sin((liveTick + zone.id) * 0.65) * 5 + (liveTick % 3) * 1.5;
  return Math.max(18, Math.min(98, Math.round(baseValue + densityEffect + bagLimitEffect + serviceTypeEffect + periodicVariation)));
}

function trafficFactor(mode: TrafficMode): number {
  if (mode === 'Heavy') return 1.45;
  if (mode === 'Moderate') return 1.2;
  return 1;
}

function evaluateZones(zones: Zone[], trafficMode: TrafficMode, liveTick: number): EvaluatedZone[] {
  const factor = trafficFactor(trafficMode);
  return zones.map((zone, index) => {
    const risk = scoreRisk(zone);
    const predictedFill = estimateFillLevel(zone, liveTick);
    const etaMinutes = Math.round((8 + index * 3 + predictedFill / 20) * factor);
    return { ...zone, risk, priority: getPriority(risk), predictedFill, gpsStatus: getGpsStatus(zone.id, liveTick), etaMinutes };
  });
}

// Greedy routing balances urgency and travel distance unless strict priority is enabled.
function buildDynamicRoute(zones: EvaluatedZone[], truck: TruckType, strictPriority: boolean): RouteStop[] {
  const remaining = [...zones];
  const route: RouteStop[] = [];
  let current = { x: truck.startX, y: truck.startY };
  let totalEta = 0;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    remaining.forEach((zone, index) => {
      const travelDistance = distance(current, zone);
      const urgency = zone.risk * 14 + zone.predictedFill * 0.62;
      const candidateScore = strictPriority
        ? zone.risk * 50 + zone.predictedFill - travelDistance * 0.35
        : urgency - travelDistance * 1.8;

      if (candidateScore > bestScore) {
        bestScore = candidateScore;
        bestIndex = index;
      }
    });

    const [nextZone] = remaining.splice(bestIndex, 1);
    const segmentDistance = distance(current, nextZone);
    totalEta += Math.round(4 + segmentDistance * 0.95);

    route.push({
      ...nextZone,
      stopNumber: route.length + 1,
      routeDecision: strictPriority
        ? `Strict priority selected ${nextZone.code} first because its overflow risk (${nextZone.risk}) outranks lower-risk stops.`
        : `Balanced reroute favored ${nextZone.code} using urgency (${nextZone.risk}) and travel distance (${segmentDistance.toFixed(1)}).`,
      approxPoint: `${Math.round(nextZone.x)}, ${Math.round(nextZone.y)}`,
      routeEtaMinutes: totalEta,
    });

    current = { x: nextZone.x, y: nextZone.y };
  }

  return route;
}

function priorityCount(zones: EvaluatedZone[], target: Priority): number {
  return zones.filter((zone) => zone.priority === target).length;
}

function curvePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const offset = from.x < to.x ? -7 : 7;
  return `M ${from.x} ${from.y} Q ${midX + offset} ${midY - 5} ${to.x} ${to.y}`;
}

function formatPercent(value: number): string {
  return `${value}%`;
}

const WaterlooWasteAppPrototype: React.FC = () => {
  const [selectedTruckId, setSelectedTruckId] = useState<number>(1);
  const [trafficMode, setTrafficMode] = useState<TrafficMode>('Moderate');
  const [autoTraffic, setAutoTraffic] = useState<boolean>(true);
  const [strictPriority, setStrictPriority] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1.2);
  const [liveTick, setLiveTick] = useState<number>(0);

  useEffect(() => {
    const timer = window.setInterval(() => setLiveTick((current) => current + 1), 2400);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!autoTraffic) return;
    const timer = window.setInterval(() => {
      setTrafficMode((current) => trafficModes[(trafficModes.indexOf(current) + 1) % trafficModes.length]);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [autoTraffic]);

  const selectedTruck = useMemo(() => trucks.find((truck) => truck.id === selectedTruckId) ?? trucks[0], [selectedTruckId]);
  const evaluatedZones = useMemo(() => evaluateZones(baseZones, trafficMode, liveTick), [trafficMode, liveTick]);
  const routeQueue = useMemo(() => buildDynamicRoute(evaluatedZones, selectedTruck, strictPriority), [evaluatedZones, selectedTruck, strictPriority]);
  const routeMap = useMemo(() => new Map(routeQueue.map((stop) => [stop.id, stop])), [routeQueue]);
  const activeStopIndex = routeQueue.length > 0 ? liveTick % routeQueue.length : 0;
  const activeStop = routeQueue[activeStopIndex];
  const truckTarget = activeStop
    ? { left: `calc(${activeStop.x}% - 18px)`, top: `calc(${activeStop.y}% - 18px)` }
    : { left: `calc(${selectedTruck.startX}% - 18px)`, top: `calc(${selectedTruck.startY}% - 18px)` };
  const summary = {
    high: priorityCount(evaluatedZones, 'High'),
    medium: priorityCount(evaluatedZones, 'Medium'),
    low: priorityCount(evaluatedZones, 'Low'),
  };

  const selfChecks = useMemo(
    () => [
      { label: 'High risk scoring test', pass: scoreRisk({ id: 99, code: 'T-1', name: 'Test High', city: 'Waterloo', serviceType: 'Garbage', bagLimit: 1, numUnits: 5, x: 0, y: 0 }) === 5 },
      { label: 'Low risk scoring test', pass: scoreRisk({ id: 100, code: 'T-2', name: 'Test Low', city: 'Cambridge', serviceType: 'Recycling', bagLimit: 3, numUnits: 2, x: 0, y: 0 }) === 0 },
      { label: 'Priority mapping test', pass: getPriority(4) === 'High' && getPriority(2) === 'Medium' && getPriority(0) === 'Low' },
      { label: 'Evaluation pipeline test', pass: evaluateZones(baseZones.slice(0, 1), 'Normal', 2)[0]?.priority === getPriority(scoreRisk(baseZones[0])) },
      { label: 'Strict priority route test', pass: buildDynamicRoute(evaluateZones(baseZones, 'Normal', 0), trucks[0], true)[0]?.priority === 'High' },
    ],
    [],
  );

  const routePoints = useMemo(
    () => [{ x: selectedTruck.startX, y: selectedTruck.startY }, ...routeQueue.map((stop) => ({ x: stop.x, y: stop.y }))],
    [routeQueue, selectedTruck],
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/70 shadow-2xl shadow-cyan-950/20">
          <div className="grid gap-6 p-6 md:grid-cols-[1.6fr_1fr] md:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
                <BrainCircuit className="h-4 w-4" />
                Simplified AI/ML Dispatch Simulation
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Urban Waste Collection Optimization
                </h1>
                <p className="text-lg text-cyan-100/90 md:text-xl">Dynamic Routing + Waterloo Dispatch App</p>
                <p className="max-w-3xl text-sm leading-6 text-slate-300 md:text-base">
                  A presentation-safe prototype that simulates GPS, route prioritization, and dispatch
                  decisions without external map dependencies.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-1">
              {[
                { label: 'High Risk', value: summary.high, icon: AlertTriangle, style: 'from-red-500/20 to-red-900/20 text-red-100' },
                { label: 'Medium Risk', value: summary.medium, icon: Gauge, style: 'from-amber-500/20 to-amber-900/20 text-amber-100' },
                { label: 'Low Risk', value: summary.low, icon: ShieldCheck, style: 'from-emerald-500/20 to-emerald-900/20 text-emerald-100' },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className={`rounded-2xl border border-white/10 bg-gradient-to-br ${card.style} p-4 shadow-lg backdrop-blur`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-200">{card.label}</p>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-3xl font-semibold text-white">{card.value}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
          <div className="mb-5 flex items-center gap-3">
            <Database className="h-5 w-5 text-cyan-300" />
            <h2 className="text-xl font-semibold text-white">Data Sources, Model Logic &amp; Update Frequency</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-cyan-400/10 bg-slate-950/60 p-5">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Data sources</p>
              <div className="grid gap-2 text-sm text-slate-300">
                <div>Past collection records</div>
                <div>Number of households (units)</div>
                <div>Service type (garbage, recycling, organics)</div>
                <div>Bag limits and city policies</div>
                <div>Truck GPS and collection timestamps</div>
                <div>Estimated fill level based on historical patterns, units, and service type</div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-400/10 bg-slate-950/60 p-5">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Model logic</p>
              <div className="grid gap-2 text-sm text-slate-300">
                <div>+2 if units &gt;= 5</div>
                <div>+2 if bag limit &lt;= 1</div>
                <div>+1 if service type is garbage</div>
                <div>Zones classified as High, Medium, or Low priority</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm leading-6 text-slate-300">
              <p className="font-medium text-white">In simple terms</p>
              <p className="mt-2">
                In simple terms, areas with more households, stricter bag limits, and garbage collection
                tend to fill up faster. We convert these factors into a risk score, and higher-risk areas
                are prioritized earlier in the route to prevent overflow.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5 text-sm leading-6 text-slate-300">
              <p className="font-medium text-white">Update frequency</p>
              <div className="mt-2 grid gap-2">
                <div>Routing decisions - daily or real time</div>
                <div>Model training - weekly or monthly historical data</div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
              EDA -&gt; feature -&gt; routing decision
            </p>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              <div>Higher-density areas -&gt; numUnits feature -&gt; higher risk score -&gt; earlier collection</div>
              <div>Low bag-limit areas -&gt; bagLimit feature -&gt; faster fill estimate -&gt; earlier collection</div>
              <div>Garbage service -&gt; serviceType feature -&gt; higher urgency than recycling/organics</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
          <div className="mb-5 flex items-center gap-3">
            <SlidersHorizontal className="h-5 w-5 text-emerald-300" />
            <h2 className="text-xl font-semibold text-white">Simulation Scope &amp; Tooling</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-200">
                What this prototype simulates
              </p>
              <div className="grid gap-2 text-sm text-slate-300">
                <div>Rule-based overflow risk scoring</div>
                <div>Dynamic rerouting based on urgency and travel distance</div>
                <div>GPS-style truck movement and ETA updates</div>
                <div>Dispatcher controls for traffic and priority mode</div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                How this aligns with the final system
              </p>
              <div className="grid gap-2 text-sm text-slate-300">
                <div>This is a simulation of the decision layer</div>
                <div>A production version would replace scoring rules with a trained ML model</div>
                <div>Python notebooks would handle EDA, testing, and model training</div>
                <div>The app shows how predicted risk changes routing decisions</div>
                <div>Version 1 does not require smart bins or IoT sensors</div>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-violet-200">Tool stack</p>
            <div className="grid gap-2 text-sm text-slate-300 md:grid-cols-3">
              <div>Python + pandas + notebooks for EDA and validation</div>
              <div>React + TypeScript for the prototype UI</div>
              <div>Framer Motion for route and truck animation</div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <Truck className="h-5 w-5 text-cyan-300" />
                <h2 className="text-xl font-semibold text-white">Dispatcher Controls</h2>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Truck selector</span>
                  <select
                    value={selectedTruckId}
                    onChange={(event) => setSelectedTruckId(Number(event.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-0"
                  >
                    {trucks.map((truck) => (
                      <option key={truck.id} value={truck.id}>
                        {truck.teamArea}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">Traffic mode selector</span>
                  <select
                    value={trafficMode}
                    onChange={(event) => setTrafficMode(event.target.value as TrafficMode)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none ring-0"
                  >
                    {trafficModes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={() => setLiveTick((current) => current + 1)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:bg-cyan-500/20"
                >
                  <RefreshCw className="h-4 w-4" />
                  Simulate GPS Refresh
                </button>

                <div className="grid gap-3">
                  <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                    <span className="text-sm text-slate-300">Auto Traffic</span>
                    <input
                      type="checkbox"
                      checked={autoTraffic}
                      onChange={(event) => setAutoTraffic(event.target.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                  </label>

                  <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                    <span className="text-sm text-slate-300">Strict Priority</span>
                    <input
                      type="checkbox"
                      checked={strictPriority}
                      onChange={(event) => setStrictPriority(event.target.checked)}
                      className="h-4 w-4 accent-amber-400"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm text-slate-300">
                    Animation speed slider: {animationSpeed.toFixed(1)}x
                  </span>
                  <input
                    type="range"
                    min="0.8"
                    max="2.2"
                    step="0.1"
                    value={animationSpeed}
                    onChange={(event) => setAnimationSpeed(Number(event.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">Active truck info</p>
                <div className="mt-3 grid gap-2 text-sm text-slate-300">
                  <div>Team: {selectedTruck.teamArea}</div>
                  <div>Driver: {selectedTruck.driver}</div>
                  <div>Capacity: {selectedTruck.capacity}</div>
                  <div>Traffic mode: {trafficMode}</div>
                  <div>Priority mode: {strictPriority ? 'Strict' : 'Balanced'}</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                <h2 className="text-xl font-semibold text-white">Prototype Checks</h2>
              </div>
              <div className="grid gap-2">
                {selfChecks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2"
                  >
                    <span className="text-sm text-slate-300">{check.label}</span>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        check.pass ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'
                      }`}
                    >
                      {check.pass ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <MapPinned className="h-5 w-5 text-cyan-300" />
                  <div>
                    <h2 className="text-xl font-semibold text-white">Main Dispatch Map</h2>
                    <p className="text-sm text-slate-400">Rule-based simulation running</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                    High
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    Medium
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Low
                  </span>
                </div>
              </div>

              <div className="relative h-[520px] overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
                <div className="absolute inset-0">
                  <div className="absolute left-[7%] top-[8%] h-[32%] w-[27%] rounded-[40px] border border-cyan-400/10 bg-cyan-500/8" />
                  <div className="absolute left-[31%] top-[24%] h-[34%] w-[28%] rounded-[46px] border border-emerald-400/10 bg-emerald-500/8" />
                  <div className="absolute left-[58%] top-[55%] h-[28%] w-[28%] rounded-[44px] border border-amber-400/10 bg-amber-500/8" />
                  <div className="absolute left-[10%] top-[18%] h-[4px] w-[48%] rotate-[18deg] rounded-full bg-white/10" />
                  <div className="absolute left-[22%] top-[44%] h-[4px] w-[41%] -rotate-[12deg] rounded-full bg-white/10" />
                  <div className="absolute left-[43%] top-[28%] h-[4px] w-[33%] rotate-[38deg] rounded-full bg-white/10" />
                  <div className="absolute left-[56%] top-[62%] h-[4px] w-[22%] -rotate-[18deg] rounded-full bg-white/10" />
                  <div className="absolute left-[18%] top-[14%] text-sm font-medium text-cyan-100/85">Waterloo</div>
                  <div className="absolute left-[43%] top-[35%] text-sm font-medium text-emerald-100/85">Kitchener</div>
                  <div className="absolute left-[71%] top-[72%] text-sm font-medium text-amber-100/85">Cambridge</div>
                </div>

                <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                  {routePoints.slice(0, -1).map((point, index) => {
                    const next = routePoints[index + 1];
                    return (
                      <path
                        key={`${point.x}-${point.y}-${next.x}-${next.y}`}
                        d={curvePath(point, next)}
                        fill="none"
                        stroke="rgba(34, 211, 238, 0.55)"
                        strokeWidth="1.6"
                        strokeDasharray="3 2"
                      />
                    );
                  })}
                </svg>

                {evaluatedZones.map((zone) => {
                  const mappedStop = routeMap.get(zone.id);
                  return (
                    <motion.div
                      key={zone.id}
                      initial={{ scale: 0.9, opacity: 0.8 }}
                      animate={{ scale: mappedStop?.id === activeStop?.id ? 1.18 : 1, opacity: 1 }}
                      className="absolute"
                      style={{ left: `calc(${zone.x}% - 8px)`, top: `calc(${zone.y}% - 8px)` }}
                    >
                      <div
                        className="h-4 w-4 rounded-full border-2 border-slate-950 shadow-lg"
                        style={{ backgroundColor: priorityDot[zone.priority] }}
                      />
                      <div className="mt-1 -translate-x-1/4 whitespace-nowrap text-[10px] font-medium text-slate-200">
                        {zone.code}
                      </div>
                    </motion.div>
                  );
                })}

                <motion.div
                  className="absolute z-20"
                  initial={truckTarget}
                  animate={truckTarget}
                  transition={{ duration: Math.max(0.55, 1.8 / animationSpeed), ease: 'easeInOut' }}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/40 bg-cyan-400/20 shadow-lg shadow-cyan-500/20 backdrop-blur">
                    <Truck className="h-4 w-4 text-cyan-100" />
                  </div>
                </motion.div>

                {activeStop && (
                  <div className="absolute bottom-4 right-4 w-full max-w-xs rounded-2xl border border-white/10 bg-slate-950/80 p-4 backdrop-blur">
                    <p className="text-sm font-semibold text-white">Current active stop</p>
                    <div className="mt-3 grid gap-2 text-sm text-slate-300">
                      <div>Code: {activeStop.code}</div>
                      <div>Neighborhood: {activeStop.name}</div>
                      <div>City: {activeStop.city}</div>
                      <div className={serviceAccent[activeStop.serviceType]}>Service: {activeStop.serviceType}</div>
                      <div>Risk: {activeStop.risk}</div>
                      <div>Predicted fill: {formatPercent(activeStop.predictedFill)}</div>
                      <div>ETA: {activeStop.routeEtaMinutes} min</div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <TimerReset className="h-5 w-5 text-cyan-300" />
                <h2 className="text-xl font-semibold text-white">Live Zone Monitor</h2>
              </div>

              <div className="grid gap-3">
                {evaluatedZones.map((zone) => {
                  const stop = routeMap.get(zone.id);
                  return (
                    <div
                      key={zone.id}
                      className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 md:grid-cols-[0.9fr_1.1fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr_0.8fr_0.7fr]"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Code</p>
                        <p className="text-sm font-medium text-white">{zone.code}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Neighborhood</p>
                        <p className="text-sm text-white">{zone.name}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">City</p>
                        <p className="text-sm text-slate-300">{zone.city}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Service</p>
                        <p className={`text-sm ${serviceAccent[zone.serviceType]}`}>{zone.serviceType}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Units</p>
                        <p className="text-sm text-slate-300">{zone.numUnits}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Predicted fill</p>
                        <p className="text-sm text-slate-300">{formatPercent(zone.predictedFill)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ETA</p>
                        <p className="text-sm text-slate-300">{stop?.routeEtaMinutes ?? zone.etaMinutes} min</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">GPS</p>
                        <p className="text-sm text-slate-300">{zone.gpsStatus}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Priority</p>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs ${priorityStyles[zone.priority]}`}>
                          {zone.priority}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <Route className="h-5 w-5 text-cyan-300" />
                <h2 className="text-xl font-semibold text-white">Dynamic Route Queue</h2>
              </div>

              <div className="grid gap-3">
                {routeQueue.map((stop) => (
                  <div
                    key={stop.id}
                    className="grid gap-3 rounded-2xl border border-white/10 bg-slate-950/60 p-4 md:grid-cols-[0.6fr_0.8fr_1.2fr_2fr_0.8fr_0.8fr_0.8fr]"
                  >
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Stop</p>
                      <p className="text-sm font-medium text-white">{stop.stopNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Zone</p>
                      <p className="text-sm text-white">{stop.code}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Neighborhood</p>
                      <p className="text-sm text-slate-300">{stop.name}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Route decision</p>
                      <p className="text-sm text-slate-300">{stop.routeDecision}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Map point</p>
                      <p className="text-sm text-slate-300">{stop.approxPoint}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">ETA</p>
                      <p className="text-sm text-slate-300">{stop.routeEtaMinutes} min</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Priority</p>
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs ${priorityStyles[stop.priority]}`}>
                        {stop.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: 'Simulates how higher-risk zones are identified before overflow',
              text: 'The scoring layer turns operational data into a visible priority signal for dispatch.',
            },
            {
              title: 'Dynamically reorders stops during dispatch',
              text: 'The route queue changes based on urgency, predicted fill, and approximate travel distance.',
            },
            {
              title: 'Shows how a dispatcher would monitor live operations',
              text: 'Traffic mode, GPS refresh, ETAs, and stop logic are presented in one dashboard flow.',
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20"
            >
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">What Our Product Does</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{card.text}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 shadow-xl shadow-black/20">
          <h2 className="text-xl font-semibold text-white">What This Does That Current Urban Waste Management Does Not</h2>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid bg-slate-950/80 md:grid-cols-2">
              <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-slate-300 md:border-b-0 md:border-r">
                Current system
              </div>
              <div className="px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-cyan-200">
                Our product
              </div>
            </div>
            {[
              {
                current: 'Fixed/static planning logic',
                ours: 'Dynamic routing based on changing risk, predicted fill, and travel distance',
              },
              {
                current: 'Reactive service after complaints',
                ours: 'Predictive prioritization before overflow',
              },
              {
                current: 'Limited operational visibility',
                ours: 'Dispatcher dashboard with simulated GPS, route progress, ETA, and reroute logic',
              },
            ].map((row) => (
              <div key={row.current} className="grid border-t border-white/10 bg-slate-950/40 md:grid-cols-2">
                <div className="px-4 py-4 text-sm text-slate-300 md:border-r md:border-white/10">{row.current}</div>
                <div className="px-4 py-4 text-sm text-slate-200">{row.ours}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-950/40 to-slate-900 p-6 shadow-xl shadow-black/20">
          <h2 className="text-xl font-semibold text-white">How to explain this in class</h2>
          <p className="mt-3 max-w-5xl text-sm leading-7 text-slate-300">
            This prototype is a simplified simulation of the decision layer. It uses rule-based overflow
            scoring as a stand-in for a future machine learning model, then shows how predicted risk
            changes routing decisions in real time. It aligns with the presentation by making the
            feature-to-decision path explicit: data patterns become input features, features become risk
            scores, and risk scores change route order. The purpose of the simulation is to make the
            routing logic visible and presentation-ready while staying aligned with the final system
            design.
          </p>
        </section>
      </div>
    </div>
  );
};

export default WaterlooWasteAppPrototype;
