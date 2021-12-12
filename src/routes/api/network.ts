import express from "express";
import { uuidValidator } from "util/uuidValidator";
import { status, heartbeat } from "controllers/api/network";

const router = express.Router();

router.get("/heartbeat", heartbeat);
// Check the connection of a certain user
router.get("/status/:id", uuidValidator(), status);

export default router;
