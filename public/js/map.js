const apiKey = mapApiKey;

// Initialize Leaflet Map
const map = L.map("map").setView([lat, lon], 8);

// Add OpenStreetMap layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);


// Add a marker for the listing location
L.marker([lat, lon]).addTo(map)
    .bindPopup(`<b>${popupContent}</b><br>Exact location will be provided after booking`)
    .openPopup();
