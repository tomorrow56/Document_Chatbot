import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2, Upload, Trash2, ArrowLeft, FileText, FolderOpen } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { toast } from "sonner";

export default function Documents() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const search = useSearch();
  
  // Get workspaceId from URL query parameter
  const urlParams = new URLSearchParams(search);
  const workspaceIdFromUrl = urlParams.get("workspace");
  
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | undefined>(workspaceIdFromUrl || undefined);
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

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

  // Fetch documents for current workspace
  const { data: documents = [], isLoading: documentsLoading } = trpc.documents.list.useQuery(
    { workspaceId: currentWorkspaceId! },
    { enabled: isAuthenticated && !!currentWorkspaceId }
  );

  // Upload document mutation
  const uploadDocument = trpc.documents.upload.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      setName("");
      setContent("");
      setIsUploading(false);
      toast.success("ドキュメントをアップロードしました");
    },
    onError: (error) => {
      setIsUploading(false);
      toast.error("アップロードに失敗しました: " + error.message);
    },
  });

  // Delete document mutation
  const deleteDocument = trpc.documents.delete.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
      toast.success("ドキュメントを削除しました");
    },
    onError: (error) => {
      toast.error("削除に失敗しました: " + error.message);
    },
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, authLoading, setLocation]);

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
                  setLocation(`/documents?workspace=${workspace.id}`);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentWorkspaceId) {
      toast.error("ワークスペースが選択されていません");
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        uploadDocument.mutate({
          workspaceId: currentWorkspaceId,
          name: file.name,
          content: "",
          fileData,
          mimeType: file.type,
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setIsUploading(false);
      toast.error("ファイルの読み込みに失敗しました");
    }
  };

  const handleTextUpload = () => {
    if (!currentWorkspaceId) {
      toast.error("ワークスペースが選択されていません");
      return;
    }
    if (!name.trim() || !content.trim()) {
      toast.error("ドキュメント名と内容を入力してください");
      return;
    }

    uploadDocument.mutate({
      workspaceId: currentWorkspaceId,
      name: name.trim(),
      content: content.trim(),
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("このドキュメントを削除しますか？")) {
      deleteDocument.mutate({ id });
    }
  };

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header with User Menu */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/chat?workspace=${currentWorkspaceId}`)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              チャットに戻る
            </Button>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">{currentWorkspace?.name || "ワークスペース"}</span>
            </div>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container py-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Upload Section */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">新しいドキュメント</h2>

              {/* File Upload */}
              <div className="mb-6">
                <Label htmlFor="file-upload" className="mb-2 block">
                  ファイルをアップロード
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  onChange={handleFileUpload}
                  accept=".txt,.md,.pdf,.docx,.pptx,.xlsx,.html"
                  disabled={isUploading || uploadDocument.isPending}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  対応形式: .txt, .md, .pdf, .docx, .pptx, .xlsx, .html
                </p>
              </div>

              {/* Text Input */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="doc-name">ドキュメント名</Label>
                  <Input
                    id="doc-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 製品マニュアル"
                  />
                </div>
                <div>
                  <Label htmlFor="doc-content">内容</Label>
                  <Textarea
                    id="doc-content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="ドキュメントの内容を入力..."
                    rows={10}
                  />
                </div>
                <Button
                  onClick={handleTextUpload}
                  disabled={uploadDocument.isPending || isUploading}
                  className="w-full"
                >
                  {uploadDocument.isPending || isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      アップロード中...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      アップロード
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Documents List */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">アップロード済みドキュメント</h2>

              {documentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">ドキュメントがありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-primary" />
                            <h3 className="font-semibold">{doc.name}</h3>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {doc.content.length} 文字 •{" "}
                            {new Date(doc.createdAt).toLocaleString("ja-JP")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

