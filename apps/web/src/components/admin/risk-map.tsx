'use client';

import type { Shop } from '@qrguard/types';
import 'leaflet/dist/leaflet.css';
import { latLngBounds } from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { RISK_STYLE, riskLevel } from '@/components/risk-badge';

// Whole island, used when there are no shops yet.
const SRI_LANKA = latLngBounds([5.9, 79.6], [9.9, 81.9]);

// Map of every shop, coloured by risk. Loaded only in the browser (Leaflet needs window).
export default function RiskMap({ shops }: { shops: Shop[] }) {
  const bounds = shops.length
    ? latLngBounds(shops.map((s) => [s.lat, s.lng] as [number, number])).pad(0.3)
    : SRI_LANKA;
  // Riskiest last, so they are drawn on top.
  const sorted = [...shops].sort((a, b) => a.riskScore - b.riskScore);

  return (
    <div className="relative h-96 overflow-hidden rounded-xl border">
      <MapContainer bounds={bounds} scrollWheelZoom={false} className="size-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {sorted.map((s) => {
          const style = RISK_STYLE[riskLevel(s.riskScore)];
          return (
            <CircleMarker
              key={s.id}
              center={[s.lat, s.lng]}
              radius={9}
              // White ring keeps dots readable on top of the map and each other.
              pathOptions={{ color: '#ffffff', weight: 2, fillColor: style.color, fillOpacity: 1 }}
            >
              <Popup>
                <p className="font-semibold">{s.name}</p>
                <p>{s.address}</p>
                <p>
                  {style.label}: {s.riskScore}/100
                </p>
                <a href={`/dashboard?shop=${s.id}`}>Open dashboard</a>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="absolute right-2 bottom-6 z-[1000] grid gap-1 rounded-md border bg-card/95 p-2 text-xs shadow">
        {(['high', 'medium', 'low'] as const).map((level) => {
          const { label, icon: Icon, color } = RISK_STYLE[level];
          return (
            <span key={level} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-3 rounded-full ring-2 ring-white"
                style={{ backgroundColor: color }}
              />
              <Icon className="size-3" aria-hidden /> {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
