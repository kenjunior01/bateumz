// Seletor de localização em mapa real (Leaflet) — usado nos formulários de
// anúncios (Prestações + Alienação). O vendedor clica no mapa ou usa o GPS;
// as coordenadas fazem o bem aparecer no jogo BATEU MUNDO ABERTO GO.
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  lat?: number | null;
  lng?: number | null;
  onChange: (v: { lat: number; lng: number } | null) => void;
}

const PIN_HTML = `<div style="width:100%;height:100%;border-radius:9999px;border:2.5px solid #22c55e;background:rgba(10,14,28,.92);display:flex;align-items:center;justify-content:center;font-size:15px;box-shadow:0 0 12px #22c55e88">📍</div>`;

export default function MapLocationPicker({ lat, lng, onChange }: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const pinRef = useRef<L.Marker | null>(null);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!wrapRef.current || mapRef.current) return;
    const hasInit = typeof lat === "number" && typeof lng === "number";
    const init: [number, number] = hasInit ? [lat as number, lng as number] : [-25.9692, 32.5732];
    const map = L.map(wrapRef.current, { zoomControl: false }).setView(init, hasInit ? 16 : 11);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 20,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © CARTO',
    }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    map.on("click", (e: L.LeafletMouseEvent) => setPin(e.latlng.lat, e.latlng.lng, false));
    if (hasInit) setPin(lat as number, lng as number, false);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      pinRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setPin = (la: number, ln: number, recenter = true) => {
    const map = mapRef.current;
    if (!map) return;
    const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [30, 30], iconAnchor: [15, 15] });
    if (!pinRef.current) pinRef.current = L.marker([la, ln], { icon }).addTo(map);
    else pinRef.current.setLatLng([la, ln]);
    if (recenter) map.setView([la, ln], Math.max(map.getZoom(), 15));
    cbRef.current({ lat: +Number(la).toFixed(6), lng: +Number(ln).toFixed(6) });
  };

  const useGps = () => {
    setErr(null);
    if (!navigator.geolocation) {
      setErr("GPS não disponível neste dispositivo");
      return;
    }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPin(p.coords.latitude, p.coords.longitude);
        setBusy(false);
      },
      () => {
        setBusy(false);
        setErr("Não foi possível obter a localização — toca no mapa para marcar");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );
  };

  const clear = () => {
    const map = mapRef.current;
    if (pinRef.current && map) {
      pinRef.current.remove();
      pinRef.current = null;
    }
    cbRef.current(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={useGps} disabled={busy} className="gap-1.5">
          <Crosshair className="h-3.5 w-3.5" /> {busy ? "A localizar…" : "Usar a minha localização"}
        </Button>
        {lat != null && lng != null && (
          <Button type="button" variant="ghost" size="sm" onClick={clear} className="gap-1.5 text-muted-foreground">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
        {lat != null && lng != null && (
          <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> {lat.toFixed(5)}, {lng.toFixed(5)}
          </span>
        )}
      </div>
      {err && <p className="text-[11px] text-red-500">{err}</p>}
      <div
        ref={wrapRef}
        className="h-[190px] w-full rounded-lg overflow-hidden border border-border z-0"
        style={{ background: "#0b1020" }}
      />
      <p className="text-[10px] text-muted-foreground">
        Toca no mapa para marcar o local exato. Com localização, o teu anúncio aparece no jogo Mundo Aberto GO para quem estiver perto! 🎮
      </p>
    </div>
  );
}
