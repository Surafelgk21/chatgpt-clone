import express from "express";
import { rateLimit } from "../../middleware/rateLimit.js";
import {
  createImageController,
  deleteImageController,
  listImagesController,
} from "./images.controller.js";

const imagesRouter = express.Router();

// /api/images
imagesRouter.get("/", listImagesController);
imagesRouter.post("/", rateLimit({ max: 8 }), createImageController);
imagesRouter.delete("/:id", deleteImageController);

export default imagesRouter;
