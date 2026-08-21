import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Line, Html, useTexture, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

/* ─────────────────────── Global Financial Hubs Data ─────────────────────── */
interface GlobalCityNode {
  name: string;
  country: string;
  lat: number;
  lng: number;
  account: string;
  currency: string;
  currencySymbol: string;
}

const GLOBAL_CITIES: GlobalCityNode[] = [
  // India
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777, account: 'ACC1001', currency: 'INR', currencySymbol: '₹' },
  { name: 'Delhi', country: 'India', lat: 28.6139, lng: 77.209, account: 'ACC1002', currency: 'INR', currencySymbol: '₹' },
  { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946, account: 'ACC1012', currency: 'INR', currencySymbol: '₹' },

  // Middle East
  { name: 'Dubai', country: 'UAE', lat: 25.2048, lng: 55.2708, account: 'ACC2041', currency: 'AED', currencySymbol: 'AED ' },

  // Europe
  { name: 'London', country: 'UK', lat: 51.5074, lng: -0.1278, account: 'ACC3019', currency: 'GBP', currencySymbol: '£' },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417, account: 'ACC3088', currency: 'CHF', currencySymbol: 'CHF ' },
  { name: 'Frankfurt', country: 'Germany', lat: 50.1109, lng: 8.6821, account: 'ACC3042', currency: 'EUR', currencySymbol: '€' },

  // North America
  { name: 'New York', country: 'USA', lat: 40.7128, lng: -74.006, account: 'ACC4011', currency: 'USD', currencySymbol: '$' },
  { name: 'San Francisco', country: 'USA', lat: 37.7749, lng: -122.4194, account: 'ACC4085', currency: 'USD', currencySymbol: '$' },

  // Asia-Pacific
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198, account: 'ACC5022', currency: 'SGD', currencySymbol: 'S$' },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, account: 'ACC5090', currency: 'JPY', currencySymbol: '¥' },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, account: 'ACC6014', currency: 'AUD', currencySymbol: 'A$' },
];

type RiskTier = 'safe' | 'medium' | 'critical';

interface GlobalTransactionRoute {
  id: string;
  fromIdx: number;
  toIdx: number;
  risk: RiskTier;
  amount: string;
  speed: number;
}

const RISK_COLORS: Record<RiskTier, { arc: string; particle: string }> = {
  safe: {
    arc: '#3B82F6',
    particle: '#60A5FA',
  },
  medium: {
    arc: '#F59E0B',
    particle: '#FBBF24',
  },
  critical: {
    arc: '#EF4444',
    particle: '#F87171',
  },
};

const GLOBAL_THREAT_TRIGGERS = [
  { type: 'Cross-Border Hawala Route', corridor: 'Dubai ➔ Mumbai', amount: 'AED 180,000 (₹40.8L)', risk: 'critical' as RiskTier },
  { type: 'Offshore Shell Movement', corridor: 'Zurich ➔ London', amount: '£75,000', risk: 'critical' as RiskTier },
  { type: 'High-Risk Wire Intercept', corridor: 'New York ➔ Mumbai', amount: '$120,000 (₹1.0Cr)', risk: 'critical' as RiskTier },
  { type: 'Velocity Layering Anomaly', corridor: 'Singapore ➔ Bangalore', amount: 'S$65,000 (₹40.5L)', risk: 'medium' as RiskTier },
  { type: 'Capital Flight Corroboration', corridor: 'Tokyo ➔ Dubai', amount: '¥14,500,000', risk: 'medium' as RiskTier },
  { type: 'Domestic Mule Burst', corridor: 'Mumbai ➔ Delhi', amount: '₹1,45,000', risk: 'critical' as RiskTier },
];

/* ─────────────────────── Coordinate Math (Globe Radius = 1.45) ─────────────────────── */
const GLOBE_RADIUS = 1.45;

function geoToCartesian(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function buildArcCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  segments: number = 64,
  altitudeFactor: number = 0.35
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const dist = start.distanceTo(end);
  const maxAltitude = Math.min(0.65, dist * altitudeFactor);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const pt = new THREE.Vector3().lerpVectors(start, end, t);
    const elevation = Math.sin(t * Math.PI) * maxAltitude;
    pt.normalize().multiplyScalar(GLOBE_RADIUS + 0.012 + elevation);
    points.push(pt);
  }
  return points;
}

/* ─────────────────────── Earth Sphere with NASA Night Texture ─────────────────────── */
const TexturedEarthSphere: React.FC = () => {
  const [nightMap, bumpMap] = useTexture([
    '/textures/earth-night.jpg',
    '/textures/earth-topology.png',
  ]);

  return (
    <group>
      {/* Photorealistic Earth Sphere with Global Night Lights */}
      <Sphere args={[GLOBE_RADIUS, 64, 64]}>
        <meshStandardMaterial
          map={nightMap}
          bumpMap={bumpMap}
          bumpScale={0.045}
          roughness={0.6}
          metalness={0.2}
          emissive="#102A45"
          emissiveIntensity={0.12}
        />
      </Sphere>

      {/* Atmospheric Inner Glow Rim */}
      <Sphere args={[GLOBE_RADIUS + 0.045, 48, 48]}>
        <meshBasicMaterial
          color="#38BDF8"
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </Sphere>

      {/* Outer Atmospheric Halo */}
      <Sphere args={[GLOBE_RADIUS + 0.09, 32, 32]}>
        <meshBasicMaterial
          color="#0284C7"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </Sphere>
    </group>
  );
};

/* ─────────────────────── Realistic Horizon Sunlight Flare ─────────────────────── */
const HorizonSunlightFlare: React.FC = () => {
  return (
    <group position={[GLOBE_RADIUS * 0.72, GLOBE_RADIUS * 0.72, -0.2]}>
      {/* Brilliant White Core */}
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* Golden Corona Glow */}
      <mesh>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshBasicMaterial color="#FEF08A" transparent opacity={0.65} />
      </mesh>

      {/* Soft Blue Atmospheric Flare Halo */}
      <mesh>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial color="#38BDF8" transparent opacity={0.25} />
      </mesh>

      {/* Extended Outer Sunlight Beam Spread */}
      <mesh>
        <sphereGeometry args={[0.75, 24, 24]} />
        <meshBasicMaterial color="#0284C7" transparent opacity={0.1} />
      </mesh>
    </group>
  );
};

/* ─────────────────────── Fallback Sphere ─────────────────────── */
const FallbackEarthSphere: React.FC = () => (
  <Sphere args={[GLOBE_RADIUS, 48, 48]}>
    <meshStandardMaterial
      color="#0B192C"
      emissive="#061224"
      emissiveIntensity={0.3}
      roughness={0.8}
    />
  </Sphere>
);

/* ─────────────────────── City Node Marker ─────────────────────── */
const CityNodeMarker: React.FC<{
  city: GlobalCityNode;
  isFlagged: boolean;
  isHighlighted: boolean;
}> = ({ city, isFlagged, isHighlighted }) => {
  const pos = useMemo(() => geoToCartesian(city.lat, city.lng, GLOBE_RADIUS + 0.008), [city]);

  return (
    <group position={pos}>
      {/* Precise Pinpoint Node Dot */}
      <mesh>
        <sphereGeometry args={[isFlagged ? 0.014 : 0.009, 16, 16]} />
        <meshBasicMaterial color={isFlagged ? '#EF4444' : isHighlighted ? '#38BDF8' : '#60A5FA'} />
      </mesh>

      {/* Subtle Target Pulse Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.011, 0.02, 24]} />
        <meshBasicMaterial
          color={isFlagged ? '#EF4444' : '#38BDF8'}
          transparent
          opacity={isFlagged ? 0.85 : 0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Dynamic Multi-Currency Micro-Badge with Depth Occlusion */}
      {isHighlighted && (
        <Html
          position={[0, 0.045, 0]}
          center
          distanceFactor={7.5}
          occlude
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          <div
            className={`px-1.5 py-0.5 rounded-full border backdrop-blur-md whitespace-nowrap flex items-center gap-1 transition-all duration-300 shadow-md ${
              isFlagged
                ? 'bg-red-950/85 border-red-500/70 text-red-200 shadow-red-950/60 scale-105'
                : 'bg-slate-950/80 border-cyan-500/40 text-slate-200 shadow-blue-950/50'
            }`}
          >
            <span className={`w-1 h-1 rounded-full ${isFlagged ? 'bg-red-400 animate-ping' : 'bg-cyan-400'}`} />
            <span className="text-[7.5px] font-bold tracking-tight">{city.name}</span>
            <span className={`text-[6.5px] font-mono font-semibold ${isFlagged ? 'text-red-300' : 'text-cyan-300'}`}>
              {city.currencySymbol}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
};

/* ─────────────────────── Animated Bezier Financial Route Arc ─────────────────────── */
const FinancialRouteArc: React.FC<{
  route: GlobalTransactionRoute;
  isThreatTarget: boolean;
}> = ({ route, isThreatTarget }) => {
  const particleRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(Math.random());

  const fromCity = GLOBAL_CITIES[route.fromIdx];
  const toCity = GLOBAL_CITIES[route.toIdx];

  const { arcPoints } = useMemo(() => {
    const s = geoToCartesian(fromCity.lat, fromCity.lng, GLOBE_RADIUS + 0.008);
    const e = geoToCartesian(toCity.lat, toCity.lng, GLOBE_RADIUS + 0.008);
    return {
      arcPoints: buildArcCurve(s, e, 64, 0.32),
    };
  }, [fromCity, toCity]);

  const palette = RISK_COLORS[isThreatTarget ? 'critical' : route.risk];

  useFrame((_, delta) => {
    progressRef.current = (progressRef.current + delta * route.speed) % 1;
    const index = Math.floor(progressRef.current * (arcPoints.length - 1));
    if (particleRef.current && arcPoints[index]) {
      particleRef.current.position.copy(arcPoints[index]);
    }
  });

  return (
    <group>
      {/* Crisp, Thin Arc Stream */}
      <Line
        points={arcPoints}
        color={palette.arc}
        lineWidth={isThreatTarget ? 2.0 : 1.0}
        transparent
        opacity={isThreatTarget ? 0.95 : 0.55}
      />

      {/* Tiny Glowing Stream Particle */}
      <mesh ref={particleRef}>
        <sphereGeometry args={[isThreatTarget ? 0.018 : 0.011, 10, 10]} />
        <meshBasicMaterial color={palette.particle} />
      </mesh>
    </group>
  );
};

/* ─────────────────────── Globe Assembly (Inside Canvas) ─────────────────────── */
const GlobeAssembly: React.FC<{
  routes: GlobalTransactionRoute[];
  activeThreat: { type: string; corridor: string; amount: string; routeIdx: number } | null;
  focusedCityIdx: number;
}> = ({ routes, activeThreat, focusedCityIdx }) => {
  return (
    <group rotation={[0.15, -0.6, 0]}>
      {/* Textured Earth with fallback */}
      <Suspense fallback={<FallbackEarthSphere />}>
        <TexturedEarthSphere />
      </Suspense>

      {/* Global Financial Hub Nodes */}
      {GLOBAL_CITIES.map((city, idx) => {
        const isThreatNode = activeThreat
          ? routes[activeThreat.routeIdx]?.fromIdx === idx ||
            routes[activeThreat.routeIdx]?.toIdx === idx
          : false;

        const isHighlighted =
          isThreatNode ||
          idx === focusedCityIdx ||
          idx === (focusedCityIdx + 3) % GLOBAL_CITIES.length ||
          idx === (focusedCityIdx + 7) % GLOBAL_CITIES.length;

        return (
          <CityNodeMarker
            key={city.name}
            city={city}
            isFlagged={isThreatNode}
            isHighlighted={isHighlighted}
          />
        );
      })}

      {/* Cross-Border Global Transaction Corridors */}
      {routes.map((route, idx) => (
        <FinancialRouteArc
          key={route.id}
          route={route}
          isThreatTarget={activeThreat?.routeIdx === idx}
        />
      ))}
    </group>
  );
};

/* ─────────────────────── Main 3D Intelligence Globe Component ─────────────────────── */
export const IntelligenceGlobe: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [focusedCityIdx, setFocusedCityIdx] = useState(0);

  // Tab visibility listener for 60fps power saving
  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Pre-configured global cross-border transaction corridors across multi-currency hubs
  const routes = useMemo<GlobalTransactionRoute[]>(() => {
    return [
      // Dubai ➔ Mumbai (Hawala corridor)
      { id: 'GTX-101', fromIdx: 3, toIdx: 0, risk: 'critical', amount: 'AED 180,000', speed: 0.28 },
      // Mumbai ➔ Delhi (Domestic RTGS)
      { id: 'GTX-102', fromIdx: 0, toIdx: 1, risk: 'safe', amount: '₹85,000', speed: 0.24 },
      // Singapore ➔ Bangalore (FinTech corridor)
      { id: 'GTX-103', fromIdx: 9, toIdx: 2, risk: 'safe', amount: 'S$65,000', speed: 0.26 },
      // New York ➔ Mumbai (Cross-border wire)
      { id: 'GTX-104', fromIdx: 7, toIdx: 0, risk: 'critical', amount: '$120,000', speed: 0.2 },
      // London ➔ Delhi (Offshore wire)
      { id: 'GTX-105', fromIdx: 4, toIdx: 1, risk: 'medium', amount: '£45,000', speed: 0.22 },
      // Zurich ➔ London (European private banking)
      { id: 'GTX-106', fromIdx: 5, toIdx: 4, risk: 'critical', amount: 'CHF 90,000', speed: 0.3 },
      // Frankfurt ➔ New York (Inter-bank settlement)
      { id: 'GTX-107', fromIdx: 6, toIdx: 7, risk: 'safe', amount: '€78,000', speed: 0.2 },
      // New York ➔ San Francisco (US Domestic wire)
      { id: 'GTX-108', fromIdx: 7, toIdx: 8, risk: 'safe', amount: '$240,000', speed: 0.25 },
      // Tokyo ➔ Singapore (APAC settlement)
      { id: 'GTX-109', fromIdx: 10, toIdx: 9, risk: 'safe', amount: '¥8,200,000', speed: 0.27 },
      // Sydney ➔ Singapore (Asia-Pac corridor)
      { id: 'GTX-110', fromIdx: 11, toIdx: 9, risk: 'medium', amount: 'A$52,000', speed: 0.22 },
      // Bangalore ➔ Mumbai (High velocity domestic)
      { id: 'GTX-111', fromIdx: 2, toIdx: 0, risk: 'medium', amount: '₹1,45,000', speed: 0.32 },
    ];
  }, []);

  // Rotate highlighted focus hubs every 4s
  useEffect(() => {
    const timer = setInterval(() => {
      setFocusedCityIdx((prev) => (prev + 1) % GLOBAL_CITIES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Periodic multi-currency international threat alert trigger (every 11-14 seconds)
  const [activeThreat, setActiveThreat] = useState<{
    type: string;
    corridor: string;
    amount: string;
    routeIdx: number;
  } | null>(null);

  useEffect(() => {
    const trigger = () => {
      const threatIdx = Math.floor(Math.random() * GLOBAL_THREAT_TRIGGERS.length);
      const threat = GLOBAL_THREAT_TRIGGERS[threatIdx];
      const routeIdx = Math.floor(Math.random() * routes.length);
      setActiveThreat({
        type: threat.type,
        corridor: threat.corridor,
        amount: threat.amount,
        routeIdx,
      });

      setTimeout(() => setActiveThreat(null), 4500);
    };

    const interval = setInterval(trigger, 12000);
    const initial = setTimeout(trigger, 3500);
    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, [routes.length]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#070C18] select-none cursor-grab active:cursor-grabbing">
      {/* Background Starfield / Deep Space Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, #0F1E3A 0%, #080D1A 65%, #03060D 100%)',
        }}
      />

      {/* Subtle Security Operations Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56, 189, 248, 0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56, 189, 248, 0.4) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Global Threat Event Floating Banner (Multi-Currency Alert) */}
      {activeThreat && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="bg-red-950/90 backdrop-blur-md border border-red-500/60 rounded-full px-4 py-1.5 shadow-2xl shadow-red-950/80 flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[11px] font-bold text-red-200 font-mono tracking-wide">
              {activeThreat.type} • <span className="text-cyan-300 font-medium">{activeThreat.corridor}</span> •{' '}
              <span className="text-white font-extrabold">{activeThreat.amount}</span>
            </span>
          </div>
        </div>
      )}

      {/* Interactive Controls Hint */}
      <div className="absolute bottom-8 left-8 z-20 pointer-events-none">
        <div className="flex items-center gap-2 bg-[#090E1A]/80 backdrop-blur-md border border-slate-800/80 rounded-lg px-3 py-1.5 shadow-lg text-[10px] text-slate-400 font-mono">
          <span className="material-symbols-outlined text-[14px] text-cyan-400">public</span>
          <span>Global Telemetry • Drag to Orbit • Scroll to Zoom</span>
        </div>
      </div>

      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0, 0.2, 5.0], fov: 38 }}
        dpr={[1, 2]}
        frameloop={isVisible ? 'always' : 'demand'}
        style={{ background: 'transparent' }}
      >
        {/* Background Deep Space Starfield */}
        <Stars radius={45} depth={25} count={900} factor={3} saturation={0} fade speed={0.4} />

        {/* Cinematic Sunlight from Top-Right Horizon */}
        <ambientLight intensity={0.35} />
        <directionalLight position={[9, 8, 4]} intensity={2.4} color="#FFFBEB" />
        <directionalLight position={[-7, -3, -5]} intensity={0.3} color="#38BDF8" />
        <pointLight position={[GLOBE_RADIUS * 0.8, GLOBE_RADIUS * 0.8, 0]} intensity={1.5} color="#FEF08A" distance={4} />

        {/* Glowing Horizon Sunrise Flare on Top-Right Earth Limb */}
        <HorizonSunlightFlare />

        {/* Interactive 360 Orbit Controls with Auto-Rotate & Inertia */}
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={0.55}
          enableDamping={true}
          dampingFactor={0.06}
          rotateSpeed={0.7}
          minDistance={3.0}
          maxDistance={8.0}
        />

        {/* Global Multi-Currency 3D Earth Network */}
        <GlobeAssembly
          routes={routes}
          activeThreat={activeThreat}
          focusedCityIdx={focusedCityIdx}
        />
      </Canvas>
    </div>
  );
};

export default IntelligenceGlobe;
