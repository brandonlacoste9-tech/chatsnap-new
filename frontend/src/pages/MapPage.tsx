import { useCallback, useEffect, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMyPin,
  getShowOnMap,
  listFriendPins,
  publishLocation,
  setShowOnMap,
  type FriendPin,
} from "@/lib/location";
import { useT } from "@/lib/i18n";
import { useToast } from "@/components/Toast";
import { BottomChrome } from "@/components/BottomChrome";

// Fix default marker icons in bundlers
const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const meIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: "chatsnap-me-marker",
});

function FitBounds({ pins }: { pins: FriendPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 12);
      return;
    }
    const b = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 13 });
  }, [pins, map]);
  return null;
}

/** Opt-in friends map — privacy-first (Snap Map without the creep). */
export function MapPage() {
  const t = useT();
  const { toast } = useToast();
  const { user, demoMode, profile } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [pins, setPins] = useState<FriendPin[]>([]);
  const [myPin, setMyPin] = useState<FriendPin | null>(null);
  const [busy, setBusy] = useState(false);
  const [center] = useState<[number, number]>([45.5, -73.57]); // Montréal default

  const load = useCallback(async () => {
    if (!user?.id || demoMode) return;
    setEnabled(await getShowOnMap(user.id));
    setPins(await listFriendPins(user.id));
    setMyPin(await getMyPin(user.id));
  }, [user?.id, demoMode]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(id);
  }, [load]);

  async function toggleMap(on: boolean) {
    if (!user?.id) return;
    setBusy(true);
    const err = await setShowOnMap(user.id, on);
    if (err) {
      toast(err, "err");
      setBusy(false);
      return;
    }
    setEnabled(on);
    if (on) await shareNow();
    else {
      setMyPin(null);
      toast(t("mapOff"), "ok");
    }
    setBusy(false);
    void load();
  }

  async function shareNow() {
    if (!user?.id) return;
    if (!navigator.geolocation) {
      toast(t("noGeo"), "err");
      return;
    }
    setBusy(true);
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const err = await publishLocation(
            user.id,
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.accuracy,
          );
          if (err) toast(err, "err");
          else toast(t("mapUpdated"), "ok");
          setBusy(false);
          void load();
          resolve();
        },
        () => {
          toast(t("noGeo"), "err");
          setBusy(false);
          resolve();
        },
        { enableHighAccuracy: true, timeout: 12000 },
      );
    });
  }

  const allPins = [
    ...(myPin ? [{ ...myPin, profile: profile ?? undefined }] : []),
    ...pins,
  ];

  return (
    <div className="app-root">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          paddingBottom: "calc(56px + var(--safe-bottom))",
        }}
      >
        <div style={{ padding: "12px 14px 8px" }}>
          <h2 style={{ margin: "0 0 6px" }}>🗺️ {t("snapMap")}</h2>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {t("mapHint")}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`chip ${enabled ? "active" : ""}`}
              disabled={busy || demoMode}
              onClick={() => void toggleMap(!enabled)}
            >
              {enabled ? t("mapOn") : t("mapShare")}
            </button>
            {enabled && (
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => void shareNow()}
              >
                {t("updateLocation")}
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 280, position: "relative" }}>
          {demoMode ? (
            <div className="page-center">
              <div className="banner">{t("setupBanner")}</div>
            </div>
          ) : (
            <MapContainer
              center={center}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds pins={allPins} />
              {allPins.map((p) => (
                <Marker
                  key={p.user_id}
                  position={[p.lat, p.lng]}
                  icon={p.user_id === user?.id ? meIcon : pinIcon}
                >
                  <Popup>
                    <strong>
                      {p.user_id === user?.id
                        ? t("you")
                        : `@${p.profile?.username ?? "…"}`}
                    </strong>
                    <br />
                    <span style={{ fontSize: 12 }}>
                      {new Date(p.updated_at).toLocaleString()}
                    </span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>
      <BottomChrome />
    </div>
  );
}
