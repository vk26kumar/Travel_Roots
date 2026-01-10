const apiKey = mapApiKey;

// Initialize Leaflet Map
const map = L.map("map").setView([lat, lon], 8);

// Add OpenStreetMap layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

// FIX: Explicit marker icon
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Add a marker for the listing location
L.marker([lat, lon], { icon: defaultIcon })
  .addTo(map)
  .bindPopup(`<b>${popupContent}</b><br>Exact location will be provided after booking`)
  .openPopup();
