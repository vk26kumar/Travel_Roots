/*
 * Renders the listing location with Leaflet and OpenStreetMap tiles.
 * Coordinates and the label are read from data attributes rendered by the
 * server, so no user content is ever interpreted as HTML.
 */
(function () {
  "use strict";

  var element = document.getElementById("map");
  if (!element || !window.L) return;

  var lat = Number.parseFloat(element.getAttribute("data-lat"));
  var lon = Number.parseFloat(element.getAttribute("data-lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

  var map = window.L.map(element, { scrollWheelZoom: false }).setView([lat, lon], 11);

  window.L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  var icon = window.L.icon({
    iconUrl: "/vendor/leaflet/images/marker-icon.png",
    iconRetinaUrl: "/vendor/leaflet/images/marker-icon-2x.png",
    shadowUrl: "/vendor/leaflet/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  var popup = document.createElement("div");
  var title = document.createElement("strong");
  title.textContent = element.getAttribute("data-label") || "";
  var note = document.createElement("div");
  note.className = "small text-muted";
  note.textContent = "The exact address is shared after booking.";
  popup.appendChild(title);
  popup.appendChild(note);

  window.L.marker([lat, lon], { icon: icon }).addTo(map).bindPopup(popup);
  window.L.circle([lat, lon], {
    radius: 1200,
    color: "#e0364a",
    weight: 1,
    fillOpacity: 0.12,
  }).addTo(map);
})();
