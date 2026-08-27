import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Crosshair, Loader } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's broken default icon path in bundlers
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom pulsing marker icon
const pulsingIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:36px;height:36px;">
      <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:36px;height:36px;
        border-radius:50%;
        background:rgba(37,99,235,0.25);
        animation:mapPulse 1.6s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:16px;height:16px;
        border-radius:50%;
        background:#2563eb;
        border:3px solid #fff;
        box-shadow:0 2px 8px rgba(0,0,0,0.5);
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const DEFAULT_CENTER = [20.5937, 78.9629]; // India
const DEFAULT_ZOOM = 5;

/**
 * MapPicker
 * Props:
 *   value        { lat, lng } | null
 *   onChange     ({ lat, lng, address }) => void
 *   readOnly     boolean — shows pin only, no interaction
 *   height       string   — CSS height (default "320px")
 */
export default function MapPicker({ value, onChange, readOnly = false, height = '320px' }) {
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const containerRef = useRef(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [coords, setCoords] = useState(value || null);

  // Reverse geocode via Nominatim
  const reverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onChange({ lat, lng, address });
    } catch {
      onChange({ lat, lng, address: `${lat.toFixed(5)}, ${lng.toFixed(5)}` });
    } finally {
      setGeocoding(false);
    }
  }, [onChange]);

  const placeMarker = useCallback((lat, lng, map) => {
    setCoords({ lat, lng });
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: pulsingIcon,
        draggable: !readOnly,
      }).addTo(map);

      if (!readOnly) {
        markerRef.current.on('dragend', (e) => {
          const pos = e.target.getLatLng();
          setCoords({ lat: pos.lat, lng: pos.lng });
          reverseGeocode(pos.lat, pos.lng);
        });
      }
    }
    if (!readOnly) reverseGeocode(lat, lng);
  }, [readOnly, reverseGeocode]);

  // Initialize map once
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const initialCenter = value ? [value.lat, value.lng] : DEFAULT_CENTER;
    const initialZoom = value ? 15 : DEFAULT_ZOOM;

    const map = L.map(containerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: !readOnly,
      scrollWheelZoom: !readOnly,
      doubleClickZoom: !readOnly,
      dragging: !readOnly,
      touchZoom: !readOnly,
    });

    // OpenStreetMap free tile layer (no API key required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    if (value) {
      placeMarker(value.lat, value.lng, map);
    }

    if (!readOnly) {
      map.on('click', (e) => {
        placeMarker(e.latlng.lat, e.latlng.lng, map);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. GPS button outside component)
  useEffect(() => {
    if (!mapRef.current || !value) return;
    placeMarker(value.lat, value.lng, mapRef.current);
    mapRef.current.setView([value.lat, value.lng], 15, { animate: true });
  }, [value?.lat, value?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        if (mapRef.current) {
          placeMarker(lat, lng, mapRef.current);
          mapRef.current.setView([lat, lng], 16, { animate: true });
        }
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Map container */}
      <div ref={containerRef} style={{ height, width: '100%' }} />

      {/* GPS button (only in edit mode) */}
      {!readOnly && (
        <button
          type="button"
          onClick={handleGPS}
          disabled={gpsLoading}
          title="Use my GPS location"
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 1000,
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            background: 'rgba(15,23,41,0.92)', border: '1px solid rgba(37,99,235,0.5)',
            color: '#60a5fa', cursor: 'pointer', backdropFilter: 'blur(6px)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.3)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(15,23,41,0.92)'}
        >
          {gpsLoading
            ? <Loader size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
            : <Crosshair size={13} />
          }
          {gpsLoading ? 'Locating…' : 'My Location'}
        </button>
      )}

      {/* Hint overlay (only shown before pin is placed) */}
      {!readOnly && !coords && (
        <div style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
          zIndex: 1000, display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500,
          background: 'rgba(15,23,41,0.88)', border: '1px solid rgba(255,255,255,0.12)',
          color: '#94a3b8', backdropFilter: 'blur(6px)',
          pointerEvents: 'none',
        }}>
          <MapPin size={12} /> Click on the map to pin the issue location
        </div>
      )}

      {/* Coordinates badge (shown after pin placed) */}
      {coords && (
        <div style={{
          position: 'absolute', bottom: 10, left: 10, zIndex: 1000,
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 6, fontSize: 11,
          background: 'rgba(15,23,41,0.9)', border: '1px solid rgba(37,99,235,0.4)',
          color: '#60a5fa', backdropFilter: 'blur(4px)',
          pointerEvents: 'none', fontFamily: 'monospace',
        }}>
          {geocoding
            ? <><Loader size={10} style={{ animation: 'spin 0.7s linear infinite' }} /> Resolving address…</>
            : <><MapPin size={10} /> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</>
          }
        </div>
      )}
    </div>
  );
}
