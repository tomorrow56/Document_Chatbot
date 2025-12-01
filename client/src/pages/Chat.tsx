import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { Loader2, Send, Plus, Trash2, FileText, MessageSquare, Menu, X, FolderOpen } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { toast } from "sonner";

export default function Chat() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const search = useSearch();
  const conversationId = params.id;
  
  // Get workspaceId from URL query parameter
  const urlParams = new URLSearchParams(search);
  const workspaceIdFromUrl = urlParams.get("workspace");
  
  const [message, setMessage] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(conversationId);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | undefined>(workspaceIdFromUrl || undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();

  // Fetch workspaces
  const { data: workspaces = [], isLoading: workspacesLoading } = trpc.workspaces.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Auto-select first workspace if none selected
  useEffect(() => {
    if (workspaces.length > 0 && !currentWorkspaceId) {
      setCurrentWorkspaceId(workspaces[0].id);
    }
  }, [workspaces, currentWorkspaceId]);

  // Fetch conversations for current workspace
  const { data: conversations = [], isLoading: conversationsLoading } = trpc.conversations.list.useQuery(
    { workspaceId: currentWorkspaceId! },
    { enabled: isAuthenticated && !!currentWorkspaceId }
  );

  // Fetch messages for selected conversation
  const { data: messages = [], isLoading: messagesLoading } = trpc.messages.list.useQuery(
    { conversationId: selectedConversationId! },
    { enabled: isAuthenticated && !!selectedConversationId }
  );

  // Create conversation mutation
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: (data) => {
      utils.conversations.list.invalidate();
      setSelectedConversationId(data.id);
      setLocation(`/chat/${data.id}?workspace=${currentWorkspaceId}`);
      setIsSidebarOpen(false);
      toast.success("新しい会話を作成しました");
    },
    onError: (error) => {
      toast.error("会話の作成に失敗しました: " + error.message);
    },
  });

  // Delete conversation mutation
  const deleteConversation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      utils.conversations.list.invalidate();
      setSelectedConversationId(undefined);
      setLocation(`/chat?workspace=${currentWorkspaceId}`);
      toast.success("会話を削除しました");
    },
    onError: (error) => {
      toast.error("削除に失敗しました: " + error.message);
    },
  });

  // Send message mutation
  const sendMessage = trpc.messages.send.useMutation({
    onSuccess: () => {
      utils.messages.list.invalidate();
      setMessage("");
    },
    onError: (error) => {
      toast.error("メッセージの送信に失敗しました: " + error.message);
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show workspace selection if no workspace selected
  if (!currentWorkspaceId && workspaces.length > 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold mb-4">ワークスペースを選択</h2>
          <p className="text-muted-foreground mb-6">
            使用するワークスペースを選択してください
          </p>
          <div className="space-y-2">
            {workspaces.map((workspace) => (
              <Button
                key={workspace.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setCurrentWorkspaceId(workspace.id);
                  setLocation(`/chat?workspace=${workspace.id}`);
                }}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                {workspace.name}
              </Button>
            ))}
          </div>
          <Button
            variant="link"
            className="w-full mt-4"
            onClick={() => setLocation("/workspaces")}
          >
            ワークスペースを管理
          </Button>
        </Card>
      </div>
    );
  }

  // Show create workspace prompt if no workspaces exist
  if (workspaces.length === 0 && !workspacesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 max-w-md w-full text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-4">ワークスペースがありません</h2>
          <p className="text-muted-foreground mb-6">
            まず最初のワークスペースを作成してください
          </p>
          <Button onClick={() => setLocation("/workspaces")}>
            ワークスペースを作成
          </Button>
        </Card>
      </div>
    );
  }

  const handleNewConversation = () => {
    if (!currentWorkspaceId) {
      toast.error("ワークスペースが選択されていません");
      return;
    }
    const title = `会話 ${new Date().toLocaleString("ja-JP")}`;
    createConversation.mutate({ workspaceId: currentWorkspaceId, title });
  };

  const handleSendMessage = () => {
    if (!selectedConversationId) {
      toast.error("会話を選択してください");
      return;
    }
    if (!message.trim()) {
      toast.error("メッセージを入力してください");
      return;
    }

    sendMessage.mutate({
      conversationId: selectedConversationId,
      content: message.trim(),
    });
  };

  const handleDeleteConversation = (id: string) => {
    if (confirm("この会話を削除しますか？")) {
      deleteConversation.mutate({ id });
    }
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setLocation(`/chat/${id}?workspace=${currentWorkspaceId}`);
    setIsSidebarOpen(false);
  };

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with User Menu */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">{currentWorkspace?.name || "ワークスペース"}</span>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-64 border-r bg-background transition-transform duration-200 ease-in-out flex flex-col`}
          style={{ top: "56px" }}
        >
          <div className="p-4 space-y-4 flex-1 overflow-y-auto">
            {/* New Conversation Button */}
            <Button
              onClick={handleNewConversation}
              disabled={createConversation.isPending || !currentWorkspaceId}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              新しい会話
            </Button>

            {/* Conversations List */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground px-2">会話履歴</h3>
              {conversationsLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground px-2 py-4">会話がありません</p>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-accent ${
                      selectedConversationId === conv.id ? "bg-accent" : ""
                    }`}
                    onClick={() => handleSelectConversation(conv.id)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <MessageSquare className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm truncate">{conv.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Sidebar Footer */}
          <div className="p-4 border-t space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation(`/documents?workspace=${currentWorkspaceId}`)}
            >
              <FileText className="w-4 h-4 mr-2" />
              ドキュメント管理
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/workspaces")}
            >
              <FolderOpen className="w-4 h-4 mr-2" />
              ワークスペース管理
            </Button>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedConversationId ? (
            <div className="flex-1 flex flex-col">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">メッセージを送信して会話を開始しましょう</p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <Card
                      key={msg.id}
                      className={`p-4 ${
                        msg.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"
                      } max-w-[80%]`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-2">
                        {new Date(msg.createdAt).toLocaleString("ja-JP")}
                      </p>
                    </Card>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input - Fixed at bottom of messages area */}
              <div className="border-t p-4 bg-background">
                <div className="flex gap-2 max-w-4xl mx-auto">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="メッセージを入力..."
                    disabled={sendMessage.isPending}
                  />
                  <Button onClick={handleSendMessage} disabled={sendMessage.isPending}>
                    {sendMessage.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold mb-2">会話を選択するか、新しい会話を作成してください</h2>
                <p className="text-muted-foreground mb-4">
                  左側のサイドバーから会話を選択するか、「新しい会話」ボタンをクリックしてください
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

