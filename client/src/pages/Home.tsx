import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { FileText, MessageSquare, Sparkles, ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to chat if already authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/chat");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
            <h1 className="text-xl font-bold">{APP_TITLE}</h1>
          </div>
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.name || user?.email}</span>
              <Button variant="outline" onClick={() => logout()}>
                ログアウト
              </Button>
            </div>
          ) : (
            <Button asChild>
              <a href={getLoginUrl()}>ログイン</a>
            </Button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              MarkItDown統合
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              ドキュメントと対話する
              <br />
              新しい体験
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              PDF、Word、Excel、PowerPointなど、様々な形式のドキュメントをアップロードして、
              AIアシスタントと対話しながら情報を引き出しましょう。
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="p-6 text-left hover:shadow-lg transition-shadow">
              <FileText className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">多様な形式に対応</h3>
              <p className="text-sm text-muted-foreground">
                PDF、Word、Excel、PowerPointなど、ビジネスで使われる主要な形式をサポート
              </p>
            </Card>

            <Card className="p-6 text-left hover:shadow-lg transition-shadow">
              <MessageSquare className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">自然な対話</h3>
              <p className="text-sm text-muted-foreground">
                ドキュメントの内容について、自然な言葉で質問して回答を得られます
              </p>
            </Card>

            <Card className="p-6 text-left hover:shadow-lg transition-shadow">
              <Sparkles className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold mb-2">高精度な抽出</h3>
              <p className="text-sm text-muted-foreground">
                MarkItDownによる高精度なテキスト抽出で、文書構造を保持
              </p>
            </Card>
          </div>

          {/* CTA */}
          <div className="mt-12">
            {isAuthenticated ? (
              <Button size="lg" onClick={() => setLocation("/chat")} className="text-lg px-8">
                チャットを開始
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            ) : (
              <Button size="lg" asChild className="text-lg px-8">
                <a href={getLoginUrl()}>
                  今すぐ始める
                  <ArrowRight className="w-5 h-5 ml-2" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <p>Powered by MarkItDown & Manus Platform</p>
        </div>
      </footer>
    </div>
  );
}

