"use strict";

const express = require("express");
const pages = require("../controllers/pages");

const router = express.Router();

router.get("/", (req, res) => res.redirect("/listings"));
router.get("/privacy", pages.privacy);
router.get("/terms", pages.terms);
router.get("/cookies", pages.cookies);

// The profile page used to live at /dashboard.
router.get("/dashboard", (req, res) => res.redirect(301, "/profile"));

module.exports = router;
