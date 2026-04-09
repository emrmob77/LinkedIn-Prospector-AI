"use client";

import { useState, useCallback, useRef } from "react";
import Papa from "papaparse";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
} from "lucide-react";

interface CsvRow {
  email?: string;
  linkedinUrl?: string;
  name?: string;
  company?: string;
  [key: string]: string | undefined;
}

interface ImportResult {
  matched: number;
  unmatched: number;
  updated: number;
  errors: string[];
  details: Array<{ row: number; name: string; status: string }>;
}

type MatchBy = "linkedin_url" | "name_company" | "name";
type Step = "upload" | "preview" | "importing" | "result";

interface EmailImportDialogProps {
  open: boolean;
  onClose: () => void;
}

export function EmailImportDialog({ open, onClose }: EmailImportDialogProps) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [matchBy, setMatchBy] = useState<MatchBy>("linkedin_url");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setFileName("");
    setRows([]);
    setColumns([]);
    setMatchBy("linkedin_url");
    setResult(null);
    setError(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const parseFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.endsWith(".csv")) {
      setError("Sadece .csv dosyalari desteklenir.");
      return;
    }

    setFileName(file.name);

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(
            `CSV parse hatasi: ${results.errors[0]?.message || "Bilinmeyen hata"}`
          );
          return;
        }

        if (!results.data || results.data.length === 0) {
          setError("CSV dosyasi bos veya gecersiz.");
          return;
        }

        const cols = results.meta.fields || [];
        setColumns(cols);
        setRows(results.data);

        // Otomatik eslestirme stratejisi onerisi
        const hasLinkedin = cols.some(
          (c) =>
            c.toLowerCase().includes("linkedin") ||
            c.toLowerCase().includes("url")
        );
        const hasName = cols.some(
          (c) =>
            c.toLowerCase().includes("name") ||
            c.toLowerCase().includes("isim") ||
            c.toLowerCase().includes("ad")
        );
        const hasCompany = cols.some(
          (c) =>
            c.toLowerCase().includes("company") ||
            c.toLowerCase().includes("sirket") ||
            c.toLowerCase().includes("firma")
        );

        if (hasLinkedin) {
          setMatchBy("linkedin_url");
        } else if (hasName && hasCompany) {
          setMatchBy("name_company");
        } else if (hasName) {
          setMatchBy("name");
        }

        setStep("preview");
      },
    });
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleImport = useCallback(async () => {
    setStep("importing");
    setError(null);

    try {
      const res = await fetch("/api/leads/import-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, matchBy }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(
          errData?.error || `Import basarisiz (${res.status})`
        );
      }

      const data: ImportResult = await res.json();
      setResult(data);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bilinmeyen hata");
      setStep("preview");
    }
  }, [rows, matchBy]);

  const previewRows = rows.slice(0, 5);
  const displayColumns = columns.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            CSV Email Import
          </DialogTitle>
          <DialogDescription>
            CSV dosyanizi yukleyerek lead&apos;lerinize email bilgisi ekleyin.
          </DialogDescription>
        </DialogHeader>

        {/* ADIM 1: Dosya Yukleme */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                CSV dosyanizi surukleyip birakin
              </p>
              <p className="text-xs text-muted-foreground">
                veya dosya secmek icin tiklayin
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                <XCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Beklenen kolonlar:</p>
              <p>
                <code className="bg-muted px-1 rounded">email</code>,{" "}
                <code className="bg-muted px-1 rounded">linkedinUrl</code>,{" "}
                <code className="bg-muted px-1 rounded">name</code>,{" "}
                <code className="bg-muted px-1 rounded">company</code>
              </p>
            </div>
          </div>
        )}

        {/* ADIM 2: Onizleme */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* Dosya bilgisi */}
            <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
              </div>
              <Badge variant="secondary">{rows.length} satir</Badge>
            </div>

            {/* Algilanan kolonlar */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Algilanan kolonlar:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((col) => (
                  <Badge key={col} variant="outline" className="text-xs">
                    {col}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Onizleme tablosu */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-xs">#</TableHead>
                    {displayColumns.map((col) => (
                      <TableHead key={col} className="text-xs">
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      {displayColumns.map((col) => (
                        <TableCell
                          key={col}
                          className="text-xs max-w-[150px] truncate"
                        >
                          {row[col] || "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > 5 && (
                <div className="text-xs text-center py-2 text-muted-foreground border-t">
                  ... ve {rows.length - 5} satir daha
                </div>
              )}
            </div>

            {/* Eslestirme stratejisi */}
            <div>
              <p className="text-sm font-medium mb-3">
                Eslestirme Stratejisi
              </p>
              <RadioGroup
                value={matchBy}
                onValueChange={(v) => setMatchBy(v as MatchBy)}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="linkedin_url" id="match-linkedin" />
                  <Label
                    htmlFor="match-linkedin"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="text-sm font-medium">
                      LinkedIn URL ile eslestir
                    </span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">
                      Onerilen
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      En dogru sonuc icin LinkedIn profil URL&apos;i kullanir
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem
                    value="name_company"
                    id="match-name-company"
                  />
                  <Label
                    htmlFor="match-name-company"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="text-sm font-medium">
                      Isim + Sirket ile eslestir
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ad ve sirket bilgisini birlikte kullanarak eslestirir
                    </p>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value="name" id="match-name" />
                  <Label
                    htmlFor="match-name"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="text-sm font-medium">
                      Sadece Isim ile eslestir
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-2 text-[10px] border-yellow-300 text-yellow-600 dark:text-yellow-400"
                    >
                      Dusuk dogruluk
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Ayni isimde birden fazla lead varsa yanlis eslesebilir
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-lg p-3">
                <XCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Geri
              </Button>
              <Button onClick={handleImport}>
                <Upload className="h-4 w-4 mr-1.5" />
                Import Et ({rows.length} satir)
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ADIM 3: Import isleniyor */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium">Import ediliyor...</p>
              <p className="text-xs text-muted-foreground mt-1">
                {rows.length} satir isleniyor, lutfen bekleyin.
              </p>
            </div>
          </div>
        )}

        {/* ADIM 4: Sonuc Raporu */}
        {step === "result" && result && (
          <div className="space-y-4">
            {/* Ozet kartlar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 p-3 text-center">
                <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-600 dark:text-green-400" />
                <p className="text-xl font-bold text-green-700 dark:text-green-300">
                  {result.matched}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  Eslesen
                </p>
              </div>

              <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900 p-3 text-center">
                <AlertCircle className="h-5 w-5 mx-auto mb-1 text-yellow-600 dark:text-yellow-400" />
                <p className="text-xl font-bold text-yellow-700 dark:text-yellow-300">
                  {result.unmatched}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  Eslesmeyen
                </p>
              </div>

              <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900 p-3 text-center">
                <XCircle className="h-5 w-5 mx-auto mb-1 text-red-600 dark:text-red-400" />
                <p className="text-xl font-bold text-red-700 dark:text-red-300">
                  {result.errors.length}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400">Hata</p>
              </div>
            </div>

            {/* Guncellenen */}
            {result.updated > 0 && (
              <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <span className="font-medium">{result.updated}</span> lead
                basariyla guncellendi.
              </div>
            )}

            {/* Hata detaylari */}
            {result.errors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-600 dark:text-red-400">
                  Hatalar:
                </p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p
                      key={i}
                      className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded px-2 py-1"
                    >
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Detay tablosu */}
            {result.details && result.details.length > 0 && (
              <div className="rounded-md border overflow-x-auto max-h-48 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs w-12">#</TableHead>
                      <TableHead className="text-xs">Isim</TableHead>
                      <TableHead className="text-xs">Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.details.map((d, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs text-muted-foreground">
                          {d.row}
                        </TableCell>
                        <TableCell className="text-xs">{d.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              d.status === "matched"
                                ? "border-green-300 text-green-600 dark:text-green-400"
                                : d.status === "error"
                                  ? "border-red-300 text-red-600 dark:text-red-400"
                                  : "border-yellow-300 text-yellow-600 dark:text-yellow-400"
                            }`}
                          >
                            {d.status === "matched"
                              ? "Eslesti"
                              : d.status === "error"
                                ? "Hata"
                                : "Eslesmedi"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Kapat</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
