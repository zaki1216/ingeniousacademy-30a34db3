import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Loader2, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { adminBulkImportQuiz } from "@/lib/api/quiz-import.functions";

export const Route = createFileRoute("/app/admin/quiz-import")({ component: QuizImportPage });

type ParsedRow = {
  rowNumber: number;
  subject: string;
  chapter: string;
  lecture: string;
  passingMarks: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
};

type RowError = { row: number; message: string };

const COLUMNS = [
  "World (Subject)", "Chapter (Dungeon)", "Lecture (Quest)", "Passing Marks",
  "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer",
];

function pick(obj: Record<string, any>, candidates: string[]): any {
  const keys = Object.keys(obj);
  for (const c of candidates) {
    const k = keys.find((k) => k.trim().toLowerCase() === c.trim().toLowerCase());
    if (k !== undefined) return obj[k];
  }
  return undefined;
}

function normalizeRows(raw: Record<string, any>[]): { rows: ParsedRow[]; errors: RowError[] } {
  const rows: ParsedRow[] = [];
  const errors: RowError[] = [];
  raw.forEach((r, idx) => {
    const rowNumber = idx + 2; // header on row 1
    const subject = String(pick(r, ["World (Subject)", "World", "Subject"]) ?? "").trim();
    const chapter = String(pick(r, ["Chapter (Dungeon)", "Chapter", "Dungeon"]) ?? "").trim();
    const lecture = String(pick(r, ["Lecture (Quest)", "Lecture", "Quest"]) ?? "").trim();
    const passingRaw = pick(r, ["Passing Marks", "PassingMarks"]);
    const question = String(pick(r, ["Question"]) ?? "").trim();
    const optionA = String(pick(r, ["Option A", "A"]) ?? "").trim();
    const optionB = String(pick(r, ["Option B", "B"]) ?? "").trim();
    const optionC = String(pick(r, ["Option C", "C"]) ?? "").trim();
    const optionD = String(pick(r, ["Option D", "D"]) ?? "").trim();
    const correctAnswer = String(pick(r, ["Correct Answer", "Correct", "Answer"]) ?? "").trim().toUpperCase();

    const isBlank = !subject && !chapter && !lecture && !question;
    if (isBlank) return;

    const rowErrs: string[] = [];
    if (!subject) rowErrs.push("Subject required");
    if (!chapter) rowErrs.push("Chapter required");
    if (!lecture) rowErrs.push("Lecture required");
    if (!question) rowErrs.push("Question required");
    if (!optionA || !optionB || !optionC || !optionD) rowErrs.push("All 4 options required");
    if (!["A", "B", "C", "D"].includes(correctAnswer)) rowErrs.push("Correct Answer must be A/B/C/D");
    const passingMarks = Number(passingRaw);
    if (!Number.isFinite(passingMarks) || passingMarks < 0 || !Number.isInteger(passingMarks)) {
      rowErrs.push("Passing Marks must be a non-negative integer");
    }
    if (rowErrs.length) {
      errors.push({ row: rowNumber, message: rowErrs.join("; ") });
      return;
    }
    rows.push({
      rowNumber, subject, chapter, lecture, passingMarks,
      question, optionA, optionB, optionC, optionD, correctAnswer,
    });
  });
  return { rows, errors };
}

function downloadTemplate() {
  const sample = [
    {
      "World (Subject)": "Mathematics",
      "Chapter (Dungeon)": "Algebra",
      "Lecture (Quest)": "Linear Equations",
      "Passing Marks": 6,
      "Question": "What is the value of x in 2x + 4 = 10?",
      "Option A": "1",
      "Option B": "2",
      "Option C": "3",
      "Option D": "4",
      "Correct Answer": "C",
    },
    {
      "World (Subject)": "Mathematics",
      "Chapter (Dungeon)": "Algebra",
      "Lecture (Quest)": "Linear Equations",
      "Passing Marks": 6,
      "Question": "Solve: x - 5 = 12",
      "Option A": "5",
      "Option B": "7",
      "Option C": "12",
      "Option D": "17",
      "Correct Answer": "D",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(sample, { header: COLUMNS });
  ws["!cols"] = COLUMNS.map((c) => ({ wch: Math.max(14, c.length + 2) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Quizzes");
  XLSX.writeFile(wb, "quiz_import_template.xlsx");
}

function QuizImportPage() {
  const { role } = useAuth();
  if (role !== "admin") return <p className="text-muted-foreground">Admins only.</p>;

  const standards = useQuery({
    queryKey: ["std-all-imp"],
    queryFn: async () => (await supabase.from("standards").select("id, name").order("name")).data ?? [],
  });
  const [standardId, setStandardId] = useState<string | null>(null);
  const [autoCreate, setAutoCreate] = useState(true);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<RowError[]>([]);
  const [serverResult, setServerResult] = useState<{ created: any; errors: RowError[] } | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const importFn = useServerFn(adminBulkImportQuiz);

  async function handleFile(file: File) {
    setFileName(file.name);
    setServerResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      const { rows, errors } = normalizeRows(raw);
      setParsedRows(rows);
      setParseErrors(errors);
      if (rows.length === 0 && errors.length === 0) toast.error("File is empty");
      else toast.success(`Parsed ${rows.length} rows (${errors.length} invalid)`);
    } catch (e: any) {
      toast.error(`Could not read file: ${e?.message ?? "unknown"}`);
    }
  }

  async function runImport() {
    if (!standardId) { toast.error("Pick a standard"); return; }
    if (parsedRows.length === 0) { toast.error("No valid rows to import"); return; }
    setBusy(true);
    try {
      const res = await importFn({
        data: { standardId, autoCreateLectures: autoCreate, rows: parsedRows },
      });
      setServerResult(res);
      const c = res.created;
      toast.success(`Imported ${c.questions} questions across ${c.quizzes} new quizzes`);
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setBusy(false);
    }
  }

  const groups = groupBy(parsedRows, (r) => `${r.subject} > ${r.chapter} > ${r.lecture}`);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Quiz Import</h1>
        <p className="text-sm text-muted-foreground">Bulk-create quizzes from XLSX or CSV. Up to 2,000 questions per upload.</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Standard</Label>
              <Select value={standardId ?? ""} onValueChange={setStandardId}>
                <SelectTrigger><SelectValue placeholder="Pick standard" /></SelectTrigger>
                <SelectContent>{standards.data?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={autoCreate} onCheckedChange={setAutoCreate} id="auto" />
              <Label htmlFor="auto">Auto-create missing lectures</Label>
            </div>
            <div className="flex items-end justify-end gap-2">
              <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Template</Button>
            </div>
          </div>

          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center space-y-2">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm">{fileName || "No file selected"}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Choose file (XLSX / CSV)
              </Button>
              {parsedRows.length > 0 && (
                <Button onClick={runImport} disabled={busy || !standardId}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Import ${parsedRows.length} questions`}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {parseErrors.length > 0 && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold">
            <AlertCircle className="h-4 w-4" /> {parseErrors.length} row error{parseErrors.length === 1 ? "" : "s"}
          </div>
          <div className="max-h-60 overflow-auto text-xs space-y-1">
            {parseErrors.map((e) => (
              <div key={`${e.row}-${e.message}`}>
                <span className="text-destructive font-medium">Row {e.row}:</span> {e.message}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {parsedRows.length > 0 && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="font-semibold">Preview · {parsedRows.length} valid questions in {groups.size} lecture{groups.size === 1 ? "" : "s"}</div>
          <div className="max-h-60 overflow-auto text-xs space-y-1">
            {[...groups.entries()].map(([key, rows]) => (
              <div key={key} className="flex justify-between border-b border-border/40 py-1">
                <span className="truncate">{key}</span>
                <span className="text-muted-foreground shrink-0 ml-2">{rows.length}q · pass {rows[0].passingMarks}</span>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {serverResult && (
        <Card><CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-500 font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Import complete
          </div>
          <div className="text-xs grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Stat label="Subjects" value={serverResult.created.subjects} />
            <Stat label="Chapters" value={serverResult.created.chapters} />
            <Stat label="Lectures" value={serverResult.created.lectures} />
            <Stat label="Quizzes" value={serverResult.created.quizzes} />
            <Stat label="Questions" value={serverResult.created.questions} />
          </div>
          {serverResult.errors.length > 0 && (
            <div className="max-h-48 overflow-auto text-xs space-y-1 pt-2">
              <div className="font-semibold text-destructive">{serverResult.errors.length} server errors:</div>
              {serverResult.errors.map((e, i) => (
                <div key={i}><span className="text-destructive font-medium">Row {e.row}:</span> {e.message}</div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/30 rounded p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-bold text-base">{value}</div>
    </div>
  );
}

function groupBy<T>(arr: T[], keyFn: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const item of arr) {
    const k = keyFn(item);
    const list = m.get(k) ?? [];
    list.push(item);
    m.set(k, list);
  }
  return m;
}
