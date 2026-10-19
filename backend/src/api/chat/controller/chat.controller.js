import * as chatService from "../service/chat.service.js";
import { cleanText, httpError, ok, parseId } from "../../../utils/http.js";

const MAX_QUESTION = 8000;

// GET /api/chat/chats?project=none|<id>
export async function listChatsController(req, res) {
  const { project } = req.query;
  const filter = project === "none" ? "none" : project ? parseId(project, "project") : undefined;
  return ok(res, await chatService.listChats({ project: filter }), "Chats fetched successfully");
}

// GET /api/chat/chats/:id
export async function getChatController(req, res) {
  return ok(res, await chatService.getChat(parseId(req.params.id)), "Chat fetched successfully");
}

// POST /api/chat/chats  { title?, projectId?, messages?: [{role, content}] }
export async function createChatController(req, res) {
  const { title, projectId, messages } = req.body ?? {};
  const seed = [];
  if (messages !== undefined) {
    if (!Array.isArray(messages) || messages.length > 20) {
      throw httpError(400, "messages must be a list of at most 20 items");
    }
    for (const message of messages) {
      if (message?.role !== "user" && message?.role !== "assistant") {
        throw httpError(400, "Each message needs a role of user or assistant");
      }
      seed.push({
        role: message.role,
        content: cleanText(message.content, { name: "Message", max: 100000 }),
      });
    }
  }
  const data = await chatService.createChat({
    title: cleanText(title, { name: "Title", max: 255, required: false }),
    projectId: projectId ? parseId(projectId, "project") : null,
    messages: seed,
  });
  return ok(res, data, "Chat created successfully", 201);
}

// PATCH /api/chat/chats/:id  { title }
export async function renameChatController(req, res) {
  const title = cleanText(req.body?.title, { name: "Title", max: 255 });
  return ok(res, await chatService.renameChat(parseId(req.params.id), title), "Chat renamed");
}

// DELETE /api/chat/chats/:id
export async function deleteChatController(req, res) {
  await chatService.deleteChat(parseId(req.params.id));
  return ok(res, null, "Chat deleted");
}

// POST /api/chat/messages  { chatId?, projectId?, question }
export async function sendMessageController(req, res) {
  const { chatId, projectId } = req.body ?? {};
  const question = cleanText(req.body?.question, { name: "Question", max: MAX_QUESTION });
  const data = await chatService.sendMessage({
    chatId: chatId ? parseId(chatId, "chat") : null,
    projectId: projectId ? parseId(projectId, "project") : null,
    question,
  });
  return ok(res, data, "Message sent successfully", 201);
}

// GET /api/chat/search?q=...
export async function searchChatsController(req, res) {
  const q = cleanText(req.query.q, { name: "Search text", max: 200, required: false });
  if (!q) return ok(res, [], "Nothing to search for");
  return ok(res, await chatService.searchChats(q), "Search complete");
}
