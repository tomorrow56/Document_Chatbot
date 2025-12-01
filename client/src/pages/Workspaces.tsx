import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Plus, Trash2, Edit2, ArrowLeft, FolderOpen } from "lucide-react";
import { UserMenu } from "@/components/UserMenu";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Workspaces() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingWorkspace, setEditingWorkspace] = useState<{
    id: string;
    name: string;
    description?: string | null;
  } | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: workspaces, isLoading, refetch } = trpc.workspaces.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createWorkspace = trpc.workspaces.create.useMutation({
    onSuccess: () => {
      toast.success("ワークスペースを作成しました");
      setName("");
      setDescription("");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`作成に失敗しました: ${error.message}`);
    },
  });

  const updateWorkspace = trpc.workspaces.update.useMutation({
    onSuccess: () => {
      toast.success("ワークスペースを更新しました");
      setEditingWorkspace(null);
      setName("");
      setDescription("");
      setIsDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`更新に失敗しました: ${error.message}`);
    },
  });

  const deleteWorkspace = trpc.workspaces.delete.useMutation({
    onSuccess: () => {
      toast.success("ワークスペースを削除しました");
      refetch();
    },
    onError: (error) => {
      toast.error(`削除に失敗しました: ${error.message}`);
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

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("ワークスペース名を入力してください");
      return;
    }

    createWorkspace.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleUpdate = () => {
    if (!editingWorkspace || !name.trim()) {
      toast.error("ワークスペース名を入力してください");
      return;
    }

    updateWorkspace.mutate({
      id: editingWorkspace.id,
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("このワークスペースを削除しますか？ワークスペース内のすべてのドキュメントと会話も削除されます。")) {
      deleteWorkspace.mutate({ id });
    }
  };

  const handleEdit = (workspace: { id: string; name: string; description?: string | null }) => {
    setEditingWorkspace(workspace);
    setName(workspace.name);
    setDescription(workspace.description || "");
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingWorkspace(null);
    setName("");
    setDescription("");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with User Menu */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/chat")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              チャットに戻る
            </Button>
            <h1 className="text-lg font-semibold">ワークスペース管理</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container py-6">
        <div className="max-w-4xl mx-auto">
          {/* Create Workspace Button */}
          <div className="mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingWorkspace(null); setName(""); setDescription(""); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  新しいワークスペース
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingWorkspace ? "ワークスペースを編集" : "新しいワークスペース"}
                  </DialogTitle>
                  <DialogDescription>
                    ワークスペースを作成して、ドキュメントと会話を整理しましょう
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">ワークスペース名</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例: 仕事用、個人用、プロジェクトA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">説明（任意）</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="このワークスペースの用途を説明してください"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={editingWorkspace ? handleUpdate : handleCreate}
                    disabled={createWorkspace.isPending || updateWorkspace.isPending}
                    className="w-full"
                  >
                    {(createWorkspace.isPending || updateWorkspace.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingWorkspace ? "更新" : "作成"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Workspaces List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : workspaces && workspaces.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {workspaces.map((workspace) => (
                <Card key={workspace.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FolderOpen className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">{workspace.name}</h3>
                      </div>
                      {workspace.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {workspace.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        作成日: {new Date(workspace.createdAt).toLocaleDateString("ja-JP")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(workspace)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(workspace.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => setLocation(`/chat?workspace=${workspace.id}`)}
                  >
                    このワークスペースを開く
                  </Button>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">ワークスペースがありません</h3>
              <p className="text-sm text-muted-foreground mb-4">
                新しいワークスペースを作成して、ドキュメントと会話を整理しましょう
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

