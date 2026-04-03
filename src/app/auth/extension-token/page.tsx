"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import { LinkedinIcon } from "@/components/icons";
import { createClient } from "@/lib/supabase-browser";

export default function ExtensionTokenPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getToken() {
      const supabase = createClient();
      // getUser() validates the token server-side (unlike getSession which reads from local storage unverified)
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Oturum bulunamadı. Lütfen önce giriş yapın.");
        setLoading(false);
        return;
      }

      // After verifying user, get the session for the access_token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError("Oturum bulunamadı. Lütfen önce giriş yapın.");
        setLoading(false);
        return;
      }

      setToken(session.access_token);
      setLoading(false);
    }

    getToken();
  }, []);

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="flex items-center gap-2">
              <LinkedinIcon className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Prospector AI</span>
            </div>
          </div>
          <CardTitle className="text-2xl">Extension Bağlantısı</CardTitle>
          <CardDescription>
            Aşağıdaki token&apos;ı Chrome Extension&apos;a yapıştırın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={token || ""}
                  className="font-mono text-xs"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button onClick={handleCopy} variant={copied ? "default" : "outline"} size="icon" className="shrink-0">
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && (
                <p className="text-sm text-green-600 text-center">
                  Token kopyalandı! Extension popup&apos;ına yapıştırın.
                </p>
              )}
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground space-y-1">
                <p><strong>Adım 1:</strong> Yukarıdaki token&apos;ı kopyalayın</p>
                <p><strong>Adım 2:</strong> Extension popup&apos;ını açın</p>
                <p><strong>Adım 3:</strong> Token alanına yapıştırıp &quot;Kaydet&quot; butonuna tıklayın</p>
              </div>
              <div id="extension-token-data" data-token={token || ""} className="hidden" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
