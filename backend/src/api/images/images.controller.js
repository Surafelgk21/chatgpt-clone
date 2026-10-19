import * as imageService from "./images.service.js";
import { cleanText, ok, parseId } from "../../utils/http.js";

export async function listImagesController(req, res) {
  return ok(res, await imageService.listImages(), "Images fetched successfully");
}

// POST /api/images  { prompt }
export async function createImageController(req, res) {
  const prompt = cleanText(req.body?.prompt, { name: "Image description", max: 1000 });
  return ok(res, await imageService.createImage(prompt), "Image created successfully", 201);
}

export async function deleteImageController(req, res) {
  await imageService.deleteImage(parseId(req.params.id));
  return ok(res, null, "Image deleted");
}
