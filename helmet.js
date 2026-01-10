const helmet = require("helmet");

module.exports = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],

      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://code.jquery.com",
        "https://checkout.razorpay.com",
        "https://accounts.google.com",
        "https://github.com",
        "https://unpkg.com"
      ],

      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.jsdelivr.net",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com"
      ],

      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com",
        "https://unpkg.com"
      ],

      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://res.cloudinary.com",
        "https://images.unsplash.com",
        "https://lh3.googleusercontent.com",
        "https://avatars.githubusercontent.com",
        "https://*.tile.openstreetmap.org",
        "https://unpkg.com"
      ],

      connectSrc: [
        "'self'",

        // Razorpay
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "https://lumberjack.razorpay.com",

        // Google
        "https://accounts.google.com",

        // CDNs 
        "https://cdn.jsdelivr.net",
        "https://unpkg.com",

        // Maps
        "https://*.tile.openstreetmap.org",

        // GitHub OAuth / avatars
        "https://github.com"
      ],

      frameSrc: [
        "https://checkout.razorpay.com",
        "https://api.razorpay.com",
        "https://accounts.google.com"
      ]
    }
  }
});
