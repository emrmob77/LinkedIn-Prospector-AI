"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  CheckCircle,
  Globe,
  ChevronDown,
  ChevronUp,
  Copy,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Profil bilgileri
  const [fullName, setFullName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState("");

  // Sifre degistirme
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Extension token
  const [showToken, setShowToken] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [sessionToken, setSessionToken] = useState("");

  // Hesap silme
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Kullanici bilgilerini yukle
  useEffect(() => {
    if (user) {
      setFullName(user.user_metadata?.full_name || "");
    }
  }, [user]);

  // Session token al
  const fetchSessionToken = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      setSessionToken(session.access_token);
    }
  }, [supabase]);

  useEffect(() => {
    if (showToken && !sessionToken) {
      fetchSessionToken();
    }
  }, [showToken, sessionToken, fetchSessionToken]);

  // Ad soyad guncelle
  const handleUpdateName = async () => {
    if (!fullName.trim()) {
      setNameError("Ad soyad bos birakilamaz.");
      return;
    }

    setSavingName(true);
    setNameError("");
    setNameSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) throw error;

      setNameSuccess(true);
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Guncelleme basarisiz.";
      setNameError(message);
    } finally {
      setSavingName(false);
    }
  };

  // Sifre degistir
  const handleChangePassword = async () => {
    if (!newPassword) {
      setPasswordError("Yeni sifre bos birakilamaz.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("Sifre en az 6 karakter olmalidir.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Sifreler eslesmiyor.");
      return;
    }

    setSavingPassword(true);
    setPasswordError("");
    setPasswordSuccess(false);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Sifre degistirme basarisiz.";
      setPasswordError(message);
    } finally {
      setSavingPassword(false);
    }
  };

  // Token kopyala
  const handleCopyToken = async () => {
    if (!sessionToken) return;
    try {
      await navigator.clipboard.writeText(sessionToken);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = sessionToken;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    }
  };

  // Hesap sil
  const handleDeleteAccount = async () => {
    if (!user?.email || deleteEmail !== user.email) {
      setDeleteError("E-posta adresi eslesmiyor.");
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Hesap silinemedi.");
      }

      await supabase.auth.signOut();
      router.push("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Hesap silme basarisiz.";
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading) {
    return (
      <AppLayout title="Hesabim" description="Profil ve hesap ayarlari">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Hesabim" description="Profil ve hesap ayarlari">
      <div className="max-w-2xl space-y-6">
        {/* Bolum 1: Profil Bilgileri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil Bilgileri
            </CardTitle>
            <CardDescription>
              Hesap bilgilerinizi goruntuleyin ve guncelleyin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Ad Soyad */}
            <div className="space-y-2">
              <Label htmlFor="full-name">Ad Soyad</Label>
              <div className="flex gap-2">
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Adiniz Soyadiniz"
                />
                <Button
                  onClick={handleUpdateName}
                  disabled={savingName}
                  size="sm"
                  className="shrink-0"
                >
                  {savingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : nameSuccess ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  <span className="ml-1">Guncelle</span>
                </Button>
              </div>
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
              {nameSuccess && (
                <p className="text-sm text-green-600">
                  Basariyla guncellendi!
                </p>
              )}
            </div>

            {/* E-posta (read-only) */}
            <div className="space-y-2">
              <Label>E-posta</Label>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {user?.email || "-"}
                </span>
              </div>
            </div>

            <Separator />

            {/* Sifre Degistir */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <Label>Sifre Degistir</Label>
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni sifre"
                />
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yeni sifre (tekrar)"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={savingPassword}
                variant="outline"
                size="sm"
              >
                {savingPassword ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : passwordSuccess ? (
                  <CheckCircle className="h-4 w-4 mr-1" />
                ) : (
                  <Lock className="h-4 w-4 mr-1" />
                )}
                Sifre Degistir
              </Button>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="text-sm text-green-600">
                  Sifre basariyla degistirildi!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bolum 2: Chrome Extension */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Chrome Extension
            </CardTitle>
            <CardDescription>
              Extension baglanti durumu ve yapilandirma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground">
                Chrome Extension popup&apos;indan e-posta ve sifrenizle direkt
                giris yapabilirsiniz. Ayrica asagidaki token&apos;i manuel
                olarak da kullanabilirsiniz.
              </p>
            </div>

            {/* Manuel Token (collapse) */}
            <div className="space-y-2">
              <button
                onClick={() => setShowToken(!showToken)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Gelismis: Manuel Token
              </button>

              {showToken && (
                <div className="space-y-2 pl-6">
                  <p className="text-xs text-muted-foreground">
                    Bu token oturum sureniz boyunca gecerlidir. Kimseyle
                    paylasmayiniz.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={
                        sessionToken
                          ? sessionToken.substring(0, 40) + "..."
                          : "Yukleniyor..."
                      }
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyToken}
                      disabled={!sessionToken}
                      className="shrink-0"
                    >
                      {tokenCopied ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bolum 3: Tehlikeli Alan */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Tehlikeli Alan
            </CardTitle>
            <CardDescription>
              Bu islemler geri alinamaz. Lutfen dikkatli olun.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div>
                <p className="text-sm font-medium">Hesabimi Sil</p>
                <p className="text-xs text-muted-foreground">
                  Hesabiniz ve tum verileriniz kalici olarak silinir.
                </p>
              </div>
              <Dialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                  setDeleteDialogOpen(open);
                  if (!open) {
                    setDeleteEmail("");
                    setDeleteError("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Hesabi Sil
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Hesabi kalici olarak sil</DialogTitle>
                    <DialogDescription>
                      Bu islem geri alinamaz. Hesabiniz, tum postlariniz,
                      lead&apos;leriniz ve aramalariniz kalici olarak
                      silinecektir. Onaylamak icin e-posta adresinizi yazin.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <Label htmlFor="delete-email">
                      E-posta adresiniz:{" "}
                      <span className="font-mono text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </Label>
                    <Input
                      id="delete-email"
                      value={deleteEmail}
                      onChange={(e) => setDeleteEmail(e.target.value)}
                      placeholder="E-posta adresinizi yazin"
                    />
                    {deleteError && (
                      <p className="text-sm text-destructive">{deleteError}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDeleteDialogOpen(false)}
                    >
                      Vazgec
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteEmail !== user?.email}
                    >
                      {deleting && (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      )}
                      Hesabimi Kalici Olarak Sil
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
