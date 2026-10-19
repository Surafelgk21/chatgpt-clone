import express from "express";
import { rateLimit } from "../../middleware/rateLimit.js";
import {
  createChatController,
  deleteChatController,
  getChatController,
  listChatsController,
  renameChatController,
  searchChatsController,
  sendMessageController,
} from "./controller/chat.controller.js";

const chatRouter = express.Router();
const aiLimit = rateLimit({ max: 20 });

// /api/chat/...
chatRouter.get("/chats", listChatsController);
chatRouter.post("/chats", createChatController);
chatRouter.get("/chats/:id", getChatController);
chatRouter.patch("/chats/:id", renameChatController);
chatRouter.delete("/chats/:id", deleteChatController);
chatRouter.post("/messages", aiLimit, sendMessageController);
chatRouter.get("/search", searchChatsController);

export default chatRouter;
