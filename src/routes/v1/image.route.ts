import express, { Router } from "express";
import { imageController } from "../../modules/image";

const router: Router = express.Router();

// Endpoint expects JSON body: { imageUrl: string }
router.post("/remove-background", imageController.removeBackground);

export default router;
