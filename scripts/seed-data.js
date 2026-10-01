"use strict";

/**
 * Sample listings used by `npm run seed`. Images are hosted on Unsplash; the
 * application requests resized WebP versions on the fly.
 * Phone, email and owner are filled in by the seed script.
 */
module.exports = [
  {
    title: "Cozy Beachfront Cottage",
    description:
      "Escape to this charming beachfront cottage for a relaxing getaway. Enjoy stunning ocean views and easy access to the beach.",
    image: {
      url: "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b",
      filename: "listingimage",
    },
    price: 1500,
    location: "Malibu",
    country: "United States",
    category: "Pools",
    coordinates: {
      lat: 34.0259,
      lon: -118.7798,
    },
  },
  {
    title: "Modern Loft in Downtown",
    description:
      "Stay in the heart of the city in this stylish loft apartment. Perfect for urban explorers!",
    image: {
      url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470",
      filename: "listingimage",
    },
    price: 1200,
    location: "New York City",
    country: "United States",
    category: "Iconic Cities",
    coordinates: {
      lat: 40.7128,
      lon: -74.006,
    },
  },
  {
    title: "Mountain Retreat",
    description:
      "Unplug and unwind in this peaceful mountain cabin. Surrounded by nature, it's a perfect place to recharge.",
    image: {
      url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d",
      filename: "listingimage",
    },
    price: 1000,
    location: "Aspen",
    country: "United States",
    category: "Mountain",
    coordinates: {
      lat: 39.1911,
      lon: -106.8175,
    },
  },
  {
    title: "Historic Villa in Tuscany",
    description:
      "Experience the charm of Tuscany in this beautifully restored villa. Explore the rolling hills and vineyards.",
    image: {
      url: "https://images.unsplash.com/photo-1566073771259-6a8506099945",
      filename: "listingimage",
    },
    price: 2500,
    location: "Florence",
    country: "Italy",
    category: "Castles",
    coordinates: {
      lat: 43.7696,
      lon: 11.2558,
    },
  },
  {
    title: "Secluded Treehouse Getaway",
    description:
      "Live among the treetops in this unique treehouse retreat. A true nature lover's paradise.",
    image: {
      url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4",
      filename: "listingimage",
    },
    price: 800,
    location: "Portland",
    country: "United States",
    category: "Camping",
    coordinates: {
      lat: 45.5152,
      lon: -122.6784,
    },
  },
  {
    title: "Beachfront Paradise",
    description:
      "Step out of your door onto the sandy beach. This beachfront condo offers the ultimate relaxation.",
    image: {
      url: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9",
      filename: "listingimage",
    },
    price: 2000,
    location: "Cancun",
    country: "Mexico",
    category: "Pools",
    coordinates: {
      lat: 21.1619,
      lon: -86.8515,
    },
  },
  {
    title: "Rustic Cabin by the Lake",
    description:
      "Spend your days fishing and kayaking on the serene lake. This cozy cabin is perfect for outdoor enthusiasts.",
    image: {
      url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b",
      filename: "listingimage",
    },
    price: 900,
    location: "Lake Tahoe",
    country: "United States",
    category: "Camping",
    coordinates: {
      lat: 39.0968,
      lon: -120.0324,
    },
  },
  {
    title: "Luxury Penthouse with City Views",
    description:
      "Indulge in luxury living with panoramic city views from this stunning penthouse apartment.",
    image: {
      url: "https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd",
      filename: "listingimage",
    },
    price: 3500,
    location: "Los Angeles",
    country: "United States",
    category: "Iconic Cities",
    coordinates: {
      lat: 34.0522,
      lon: -118.2437,
    },
  },
  {
    title: "Ski-In/Ski-Out Chalet",
    description:
      "Hit the slopes right from your doorstep in this ski-in/ski-out chalet in the Swiss Alps.",
    image: {
      url: "https://images.unsplash.com/photo-1502784444187-359ac186c5bb",
      filename: "listingimage",
    },
    price: 3000,
    location: "Verbier",
    country: "Switzerland",
    category: "Mountain",
    coordinates: {
      lat: 46.0961,
      lon: 7.2286,
    },
  },
  {
    title: "Safari Lodge in the Serengeti",
    description:
      "Experience the thrill of the wild in a comfortable safari lodge. Witness the Great Migration up close.",
    image: {
      url: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e",
      filename: "listingimage",
    },
    price: 4000,
    location: "Serengeti National Park",
    country: "Tanzania",
    category: "Camping",
    coordinates: {
      lat: -2.3333,
      lon: 34.8333,
    },
  },
  {
    title: "Historic Canal House",
    description:
      "Stay in a piece of history in this beautifully preserved canal house in Amsterdam's iconic district.",
    image: {
      url: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4",
      filename: "listingimage",
    },
    price: 1800,
    location: "Amsterdam",
    country: "Netherlands",
    category: "Iconic Cities",
    coordinates: {
      lat: 52.3676,
      lon: 4.9041,
    },
  },
  {
    title: "Private Island Retreat",
    description:
      "Have an entire island to yourself for a truly exclusive and unforgettable vacation experience.",
    image: {
      url: "https://images.unsplash.com/photo-1618140052121-39fc6db33972",
      filename: "listingimage",
    },
    price: 10000,
    location: "Fiji",
    country: "Fiji",
    category: "Trending",
    coordinates: {
      lat: -17.7134,
      lon: 178.065,
    },
  },
  {
    title: "Charming Cottage in the Cotswolds",
    description:
      "Escape to the picturesque Cotswolds in this quaint and charming cottage with a thatched roof.",
    image: {
      url: "https://images.unsplash.com/photo-1602088113235-229c19758e9f",
      filename: "listingimage",
    },
    price: 1200,
    location: "Cotswolds",
    country: "United Kingdom",
    category: "Farms",
    coordinates: {
      lat: 51.833,
      lon: -1.8433,
    },
  },
  {
    title: "Historic Brownstone in Boston",
    description:
      "Step back in time in this elegant historic brownstone located in the heart of Boston.",
    image: {
      url: "https://images.unsplash.com/photo-1533619239233-6280475a633a",
      filename: "listingimage",
    },
    price: 2200,
    location: "Boston",
    country: "United States",
    category: "Rooms",
    coordinates: {
      lat: 42.3601,
      lon: -71.0589,
    },
  },
  {
    title: "Beachfront Bungalow in Bali",
    description:
      "Relax on the sandy shores of Bali in this beautiful beachfront bungalow with a private pool.",
    image: {
      url: "https://images.unsplash.com/photo-1602391833977-358a52198938",
      filename: "listingimage",
    },
    price: 1800,
    location: "Bali",
    country: "Indonesia",
    category: "Trending",
    coordinates: {
      lat: -8.3405,
      lon: 115.092,
    },
  },
  {
    title: "Mountain View Cabin in Banff",
    description: "Enjoy breathtaking mountain views from this cozy cabin in the Canadian Rockies.",
    image: {
      url: "https://images.unsplash.com/photo-1521401830884-6c03c1c87ebb",
      filename: "listingimage",
    },
    price: 1500,
    location: "Banff",
    country: "Canada",
    category: "Mountain",
    coordinates: {
      lat: 51.1784,
      lon: -115.5708,
    },
  },
  {
    title: "Art Deco Apartment in Miami",
    description:
      "Step into the glamour of the 1920s in this stylish Art Deco apartment in South Beach.",
    image: {
      url: "https://plus.unsplash.com/premium_photo-1670963964797-942df1804579",
      filename: "listingimage",
    },
    price: 1600,
    location: "Miami",
    country: "United States",
    category: "Rooms",
    coordinates: {
      lat: 25.7617,
      lon: -80.1918,
    },
  },
  {
    title: "Tropical Villa in Phuket",
    description:
      "Escape to a tropical paradise in this luxurious villa with a private infinity pool in Phuket.",
    image: {
      url: "https://images.unsplash.com/photo-1470165301023-58dab8118cc9",
      filename: "listingimage",
    },
    price: 3000,
    location: "Phuket",
    country: "Thailand",
    category: "Pools",
    coordinates: {
      lat: 7.8804,
      lon: 98.3923,
    },
  },
  {
    title: "Historic Castle in Scotland",
    description:
      "Live like royalty in this historic castle in the Scottish Highlands. Explore the rugged beauty of the area.",
    image: {
      url: "https://images.unsplash.com/photo-1585543805890-6051f7829f98",
      filename: "listingimage",
    },
    price: 4000,
    location: "Scottish Highlands",
    country: "United Kingdom",
    category: "Castles",
    coordinates: {
      lat: 57.12,
      lon: -4.71,
    },
  },
  {
    title: "Desert Oasis in Dubai",
    description:
      "Experience luxury in the middle of the desert in this opulent oasis in Dubai with a private pool.",
    image: {
      url: "https://images.unsplash.com/photo-1518684079-3c830dcef090",
      filename: "listingimage",
    },
    price: 5000,
    location: "Dubai",
    country: "United Arab Emirates",
    category: "Trending",
    coordinates: {
      lat: 25.2048,
      lon: 55.2708,
    },
  },
  {
    title: "Rustic Log Cabin in Montana",
    description:
      "Unplug and unwind in this cozy log cabin surrounded by the natural beauty of Montana.",
    image: {
      url: "https://images.unsplash.com/photo-1586375300773-8384e3e4916f",
      filename: "listingimage",
    },
    price: 1100,
    location: "Montana",
    country: "United States",
    category: "Farms",
    coordinates: {
      lat: 46.8797,
      lon: -110.3626,
    },
  },
  {
    title: "Beachfront Villa in Greece",
    description:
      "Enjoy the crystal-clear waters of the Mediterranean in this beautiful beachfront villa on a Greek island.",
    image: {
      url: "https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f",
      filename: "listingimage",
    },
    price: 2500,
    location: "Mykonos",
    country: "Greece",
    category: "Pools",
    coordinates: {
      lat: 37.4467,
      lon: 25.3289,
    },
  },
  {
    title: "Eco-Friendly Treehouse Retreat",
    description:
      "Stay in an eco-friendly treehouse nestled in the forest. It's the perfect escape for nature lovers.",
    image: {
      url: "https://images.unsplash.com/photo-1488462237308-ecaa28b729d7",
      filename: "listingimage",
    },
    price: 750,
    location: "Costa Rica",
    country: "Costa Rica",
    category: "Camping",
    coordinates: {
      lat: 9.7489,
      lon: -83.7534,
    },
  },
  {
    title: "Historic Cottage in Charleston",
    description:
      "Experience the charm of historic Charleston in this beautifully restored cottage with a private garden.",
    image: {
      url: "https://images.unsplash.com/photo-1587381420270-3e1a5b9e6904",
      filename: "listingimage",
    },
    price: 1600,
    location: "Charleston",
    country: "United States",
    category: "Rooms",
    coordinates: {
      lat: 32.7765,
      lon: -79.9311,
    },
  },
  {
    title: "Modern Apartment in Tokyo",
    description:
      "Explore the vibrant city of Tokyo from this modern and centrally located apartment.",
    image: {
      url: "https://images.unsplash.com/photo-1480796927426-f609979314bd",
      filename: "listingimage",
    },
    price: 2000,
    location: "Tokyo",
    country: "Japan",
    category: "Iconic Cities",
    coordinates: {
      lat: 35.6762,
      lon: 139.6503,
    },
  },
  {
    title: "Lakefront Cabin in New Hampshire",
    description:
      "Spend your days by the lake in this cozy cabin in the scenic White Mountains of New Hampshire.",
    image: {
      url: "https://images.unsplash.com/photo-1578645510447-e20b4311e3ce",
      filename: "listingimage",
    },
    price: 1200,
    location: "New Hampshire",
    country: "United States",
    category: "Farms",
    coordinates: {
      lat: 43.1939,
      lon: -71.5724,
    },
  },
  {
    title: "Luxury Villa in the Maldives",
    description:
      "Indulge in luxury in this overwater villa in the Maldives with stunning views of the Indian Ocean.",
    image: {
      url: "https://images.unsplash.com/photo-1439066615861-d1af74d74000",
      filename: "listingimage",
    },
    price: 6000,
    location: "Maldives",
    country: "Maldives",
    category: "Trending",
    coordinates: {
      lat: 3.2028,
      lon: 73.2207,
    },
  },
  {
    title: "Ski Chalet in Aspen",
    description:
      "Hit the slopes in style with this luxurious ski chalet in the world-famous Aspen ski resort.",
    image: {
      url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1",
      filename: "listingimage",
    },
    price: 4000,
    location: "Aspen",
    country: "United States",
    category: "Mountain",
    coordinates: {
      lat: 39.1911,
      lon: -106.8175,
    },
  },
  {
    title: "Secluded Beach House in Costa Rica",
    description:
      "Escape to a secluded beach house on the Pacific coast of Costa Rica. Surf, relax, and unwind.",
    image: {
      url: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2",
      filename: "listingimage",
    },
    price: 1800,
    location: "Costa Rica",
    country: "Costa Rica",
    category: "Pools",
    coordinates: {
      lat: 9.6301,
      lon: -84.6283,
    },
  },
];
