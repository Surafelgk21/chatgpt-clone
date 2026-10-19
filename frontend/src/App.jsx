import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Sidebar from "./components/Sidebar/Sidebar";
import ChatHeader from "./components/ChatHeader/ChatHeader";
import MessageList from "./components/MessageList/MessageList";
import ChatInput from "./components/ChatInput/ChatInput";
import SearchModal from "./components/SearchModal/SearchModal";
import ImagesView from "./views/ImagesView/ImagesView";
import AppsView from "./views/AppsView/AppsView";
import ResearchView from "./views/ResearchView/ResearchView";
import CodexView from "./views/CodexView/CodexView";
import ProjectsView from "./views/ProjectsView/ProjectsView";
import { api, errorMessage } from "./api";

const readCollapsed = () => {
  try {
    return localStorage.getItem("sidebarCollapsed") === "1";
  } catch {
    return false;
  }
};

function App() {
  // Which page is showing: "chat", "images", "apps", "research", "codex" or "projects"
  const [view, setView] = useState("chat");
  const [navTick, setNavTick] = useState(0); // changes on every menu click, so pages start fresh

  const [chats, setChats] = useState([]); // the "Recents" list
  const [activeChat, setActiveChat] = useState(null); // the open chat, or null for a new one
  const [messages, setMessages] = useState([]);
  const [draftProject, setDraftProject] = useState(null); // project for a chat that is not saved yet

  // Every time the open chat changes, the token changes. An answer that arrives
  // for an older token belongs to a chat the person already left, so it is not shown.
  const tokenRef = useRef(0);
  const [chatToken, setChatToken] = useState(0);
  const [loadingToken, setLoadingToken] = useState(null);
  const isLoading = loadingToken !== null && loadingToken === chatToken;

  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const messagesEndRef = useRef(null);

  const bumpToken = () => {
    tokenRef.current += 1;
    setChatToken(tokenRef.current);
    return tokenRef.current;
  };

  const scrollToBottom = () => {
    // Timeout ensures DOM paint has finished before triggering scroll
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  // Put a chat at the top of Recents right away (chats inside a project are not listed here)
  const showInRecents = useCallback((chat) => {
    if (chat.project_id) return;
    setChats((prev) => [chat, ...prev.filter((item) => item.id !== chat.id)]);
  }, []);

  const loadChats = useCallback(async () => {
    try {
      const { data } = await api.get("/chat/chats", { params: { project: "none" } });
      setChats(data.data || []);
    } catch (error) {
      console.error("Error fetching chats:", error.message);
      setNotice(errorMessage(error));
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Ctrl+K (or Cmd+K) opens the search window
  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Messages disappear by themselves after a few seconds
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 7000);
    return () => clearTimeout(timer);
  }, [notice]);

  function toggleSidebar() {
    setCollapsed((current) => {
      try {
        localStorage.setItem("sidebarCollapsed", current ? "0" : "1");
      } catch {
        /* storage can be blocked; the sidebar still works */
      }
      return !current;
    });
  }

  // ---------- navigation ----------

  function navigate(id) {
    setView(id);
    setNavTick((tick) => tick + 1);
    setNotice("");
  }

  function newChat(project = null) {
    bumpToken();
    setView("chat");
    setActiveChat(null);
    setMessages([]);
    setDraftProject(project);
    setNotice("");
  }

  // Forget the open chat without leaving the current page
  function resetActiveChat() {
    bumpToken();
    setActiveChat(null);
    setMessages([]);
    setDraftProject(null);
  }

  async function openChat(id) {
    const token = bumpToken();
    setView("chat");
    setNotice("");
    setDraftProject(null);
    try {
      const { data } = await api.get(`/chat/chats/${id}`);
      if (tokenRef.current !== token) return;
      setActiveChat(data.data.chat);
      setMessages(data.data.messages);
    } catch (error) {
      if (tokenRef.current !== token) return;
      setNotice(errorMessage(error));
      setActiveChat(null);
      setMessages([]);
      loadChats();
    }
  }

  // Used by Apps, Deep research and Codex: open their result as a normal chat.
  async function continueInChat({ title, messages: seed }) {
    try {
      const { data } = await api.post("/chat/chats", { title, messages: seed });
      bumpToken();
      setView("chat");
      setDraftProject(null);
      setActiveChat(data.data.chat);
      setMessages(data.data.messages);
      showInRecents(data.data.chat);
      loadChats();
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  // ---------- chat actions ----------

  async function handleSubmit(question) {
    if (!question.trim()) return;

    const token = tokenRef.current;
    const tempUserMessage = { id: `temp-${Date.now()}`, content: question.trim(), role: "user" };
    setMessages((prev) => [...prev, tempUserMessage]);
    setLoadingToken(token);

    try {
      const { data } = await api.post("/chat/messages", {
        chatId: activeChat?.id,
        projectId: activeChat ? undefined : draftProject?.id,
        question: question.trim(),
      });
      const { chat, userMessage, assistantMessage } = data.data;
      showInRecents(chat);

      if (tokenRef.current === token) {
        setActiveChat(chat);
        setMessages((prev) => [
          ...prev.filter((message) => message.id !== tempUserMessage.id),
          userMessage,
          assistantMessage,
        ]);
      }
      loadChats();
    } catch (error) {
      console.error("Error submitting question:", error.message);
      if (tokenRef.current === token) {
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "assistant", content: `⚠️ ${errorMessage(error)}` },
        ]);
      }
    } finally {
      setLoadingToken((current) => (current === token ? null : current));
    }
  }

  async function renameChat(id, title) {
    try {
      const { data } = await api.patch(`/chat/chats/${id}`, { title });
      setChats((prev) => prev.map((chat) => (chat.id === id ? { ...chat, title: data.data.title } : chat)));
      setActiveChat((prev) => (prev?.id === id ? { ...prev, title: data.data.title } : prev));
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  async function deleteChat(chat) {
    if (!window.confirm(`Delete the chat "${chat.title}"?`)) return;
    try {
      await api.delete(`/chat/chats/${chat.id}`);
      setChats((prev) => prev.filter((item) => item.id !== chat.id));
      if (activeChat?.id === chat.id) newChat();
    } catch (error) {
      setNotice(errorMessage(error));
    }
  }

  const projectName = activeChat?.project_name || draftProject?.name;

  return (
    <div className="app">
      <Sidebar
        view={view}
        activeChatId={activeChat?.id}
        chats={chats}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={toggleSidebar}
        onCloseMobile={() => setMobileOpen(false)}
        onNewChat={() => newChat()}
        onOpenSearch={() => setSearchOpen(true)}
        onNavigate={navigate}
        onOpenChat={openChat}
        onRenameChat={renameChat}
        onDeleteChat={deleteChat}
      />

      <main className="chat">
        <ChatHeader
          title={view === "chat" && activeChat ? activeChat.title : "ChatGPT"}
          crumb={view === "chat" ? projectName : undefined}
          showModelMenu={view !== "chat" || !activeChat}
          onOpenMenu={() => setMobileOpen(true)}
        />

        {notice && (
          <div className="toast" role="alert">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
              <X size={16} />
            </button>
          </div>
        )}

        {view === "chat" && (
          <>
            {/* Pass ref directly into MessageList so anchor is at the end of the scroll container */}
            <MessageList
              isLoading={isLoading}
              conversations={messages}
              messagesEndRef={messagesEndRef}
              emptyText={draftProject ? draftProject.name : "What are you working on?"}
              emptyHint={draftProject ? "Chats in this project follow its instructions." : undefined}
            />
            <ChatInput
              isLoading={isLoading}
              handleSubmit={handleSubmit}
              focusKey={chatToken}
              placeholder={draftProject ? `Message ${draftProject.name}` : "Ask anything"}
            />
          </>
        )}

        {view === "images" && <ImagesView key={navTick} />}
        {view === "apps" && <AppsView key={navTick} onContinueInChat={continueInChat} />}
        {view === "research" && <ResearchView key={navTick} onContinueInChat={continueInChat} />}
        {view === "codex" && <CodexView key={navTick} onContinueInChat={continueInChat} />}
        {view === "projects" && (
          <ProjectsView
            key={navTick}
            onNewChatInProject={newChat}
            onOpenChat={openChat}
            onProjectDeleted={(id) => {
              if (activeChat?.project_id === id || draftProject?.id === id) resetActiveChat();
            }}
            onChatDeleted={(id) => {
              if (activeChat?.id === id) resetActiveChat();
            }}
          />
        )}
      </main>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        recents={chats}
        onOpenChat={openChat}
      />
    </div>
  );
}

export default App;
