import { Router } from "express";
import health from "./health";
import dataProcessing from "./dataProcessing";
import mtg from "./mtg";
import scryfall from "./scryfall";
import enrich from "./enrich";
import { helloController } from "../controllers/helloController";

const router = Router();

// Health checks
router.use("/health", health);

// Data processing routes
router.use("/data", dataProcessing);

// MTG-specific routes
router.use("/mtg", mtg);

// Scryfall routes
router.use("/scryfall", scryfall);

// Enrichment routes (TCG / EDHREC augmentation)
router.use("/enrich", enrich);

// Example business route
router.get("/hello", helloController);

export default router;
