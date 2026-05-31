import { Router } from "express";
import health from "./health";
import dataProcessing from "./dataProcessing";
import mtg from "./mtg";
import scryfall from "./scryfall";
import enrich from "./enrich";
import watchlist from "./watchlist";
import auth from "./auth";
import graphql from './graphql';
import collection from './collection';
import { helloController } from "../controllers/helloController";

const router = Router();

router.use("/health", health);
router.use("/data", dataProcessing);
router.use("/mtg", mtg);
router.use("/scryfall", scryfall);
router.use("/enrich", enrich);
router.use("/watchlist", watchlist);
router.use("/auth", auth);
router.use('/graphql', graphql);
router.use('/', collection);

router.get("/hello", helloController);

export default router;
