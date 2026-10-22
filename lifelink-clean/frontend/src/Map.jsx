import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

export default function Map({
  donors = [],
  banks = [],
  requests = [],
  center = [19.15, 72.94],
  radius = 0,
  selected = null,
  tileUrl,
}) {
  const root = useRef(null),
    map = useRef(null),
    markers = useRef({});
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    map.current = L.map(root.current, { scrollWheelZoom: false }).setView(
      center,
      10,
    );
    const tile = L.tileLayer(
      tileUrl || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(map.current);
    tile.on("tileerror", () => setOffline(true));
    const observer = new ResizeObserver(() => map.current?.invalidateSize());
    observer.observe(root.current);
    return () => {
      observer.disconnect();
      map.current?.remove();
      map.current = null;
    };
  }, [tileUrl]);
  useEffect(() => {
    if (!map.current) return;
    markers.current = {};
    const layer = L.markerClusterGroup({
      maxClusterRadius: 32,
      disableClusteringAtZoom: 13,
    });
    const add = (items, type) =>
      items.forEach((x) => {
        const status =
          type === "donor" ? (x.available ? "available" : "unavailable") : type;
        const label = type === "bank" ? "+" : x.blood_group;
        const marker = L.marker([x.lat, x.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div class="map-pin ${status}">${label}</div>`,
            iconSize: [38, 38],
            iconAnchor: [19, 19],
          }),
        });
        const popup = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = x.name || x.hospital;
        const info = document.createElement("p");
        info.textContent =
          x.city +
          (x.demo ? " · DEMO DATA" : "") +
          (type === "donor" ? " · Approximate area only" : "");
        popup.append(title, info);
        marker.bindPopup(popup);
        layer.addLayer(marker);
        markers.current[type + "-" + x.id] = marker;
      });
    add(donors, "donor");
    add(banks, "bank");
    add(requests, "request");
    map.current.addLayer(layer);
    const circle = radius
      ? L.circle(center, {
          radius: radius * 1000,
          color: "#b91c1c",
          weight: 1,
          fillOpacity: 0.025,
        }).addTo(map.current)
      : null;
    map.current.setView(center, radius > 70 ? 9 : radius > 20 ? 10 : 11);
    return () => {
      if (map.current) {
        map.current.removeLayer(layer);
        if (circle) map.current.removeLayer(circle);
      }
    };
  }, [donors, banks, requests, center[0], center[1], radius, tileUrl]);
  useEffect(() => {
    const marker = markers.current[selected];
    if (marker && map.current) {
      map.current.setView(marker.getLatLng(), 14);
      marker.openPopup();
    }
  }, [selected]);
  return (
    <div className="map-wrap">
      <div
        ref={root}
        className="map-canvas"
        aria-label="Interactive donor and blood-bank map"
      />
      {offline && (
        <div className="map-warning">
          Map tiles unavailable. Markers and list results still work.
        </div>
      )}
      <div className="map-legend">
        <span>
          <i className="green-dot" />
          Donor area
        </span>
        <span>
          <i className="red-dot" />
          Request
        </span>
        <span>＋ Blood bank</span>
      </div>
    </div>
  );
}
