import express from "express";
import chatRouter from "./chat/chat.routes.js";
import projectsRouter from "./projects/projects.routes.js";
import imagesRouter from "./images/images.routes.js";
import appsRouter from "./apps/apps.routes.js";
import researchRouter from "./research/research.routes.js";
import codexRouter from "./codex/codex.routes.js";

const mainRouter = express.Router();

mainRouter.use("/chat", chatRouter); // chats, messages, search
mainRouter.use("/projects", projectsRouter);
mainRouter.use("/images", imagesRouter);
mainRouter.use("/apps", appsRouter);
mainRouter.use("/research", researchRouter);
mainRouter.use("/codex", codexRouter);

export default mainRouter;
