import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Upload, Database, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Tables to back up. Order matters for restore (parents before children when possible).
const BACKUP_TABLES = [
  "app_settings",
  "system_passwords",
  "offices",
  "governorates",
  "categories",
  "admin_users",
  "admin_user_permissions",
  "delivery_agents",
  "customers",
  "products",
  "product_color_variants",
  "product_images",
  "cashbox",
  "cashbox_transactions",
  "treasury",
  "blocked_invoices",
  "orders",
  "order_items",
  "order_status_history",
  "returns",
  "agent_payments",
  "agent_daily_closings",
  "agent_stock_movements",
  "statistics",
  "activity_logs",
];

const fetchAll = async (table: string) => {
  const pageSize = 1000;
  let from = 0;
  const all: any[] = [];
  // page through to avoid the 1000-row limit
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
};

const SystemBackup = () => {
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const handleExport = async () => {
    setExporting(true);
    setProgress("جاري التحضير...");
    try {
      const bundle: Record<string, any[]> = {};
      for (const t of BACKUP_TABLES) {
        setProgress(`جاري تصدير: ${t}`);
        try {
          bundle[t] = await fetchAll(t);
        } catch (e: any) {
          console.warn(`Skipping ${t}:`, e?.message);
          bundle[t] = [];
        }
      }
      const payload = {
        version: 1,
        exported_at: new Date().toISOString(),
        tables: bundle,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("تم تنزيل النسخة الاحتياطية بنجاح");
      setProgress("");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "فشل التصدير");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (file: File) => {
    if (!confirm("سيتم استعادة البيانات من الملف. البيانات الحالية ذات نفس المعرّفات سيتم تحديثها. هل أنت متأكد؟")) return;
    setImporting(true);
    setProgress("جاري قراءة الملف...");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const tables: Record<string, any[]> = parsed.tables || {};

      let inserted = 0;
      let failed = 0;
      for (const t of BACKUP_TABLES) {
        const rows = tables[t];
        if (!rows || !rows.length) continue;
        setProgress(`جاري استعادة: ${t} (${rows.length} صف)`);
        // upsert in chunks of 500
        for (let i = 0; i < rows.length; i += 500) {
          const chunk = rows.slice(i, i + 500);
          const { error } = await (supabase as any)
            .from(t)
            .upsert(chunk, { onConflict: "id" });
          if (error) {
            console.warn(`Failed chunk for ${t}:`, error.message);
            failed += chunk.length;
          } else {
            inserted += chunk.length;
          }
        }
      }
      setProgress("");
      toast.success(`اكتملت الاستعادة. تم إدراج/تحديث ${inserted} صف${failed ? ` (فشل: ${failed})` : ""}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "فشل الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button onClick={() => navigate("/admin")} variant="ghost" className="mb-4">
          <ArrowLeft className="ml-2 h-4 w-4" /> رجوع
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" /> النسخة الاحتياطية للنظام
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <div>
                خد نسخة احتياطية بانتظام. النسخة بتشمل كل بيانات النظام (الأوردرات، المنتجات، العملاء، المناديب، الفواتير، الخزن، الإعدادات، إلخ).
                <br />
                عند الاستعادة، الصفوف اللي ليها نفس المعرّف (id) هتتحدث، والباقي هيتم إضافته.
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-lg">تنزيل نسخة احتياطية</h3>
                  <p className="text-sm text-muted-foreground">
                    تنزيل ملف JSON يحتوي على كل بيانات النظام.
                  </p>
                  <Button onClick={handleExport} disabled={exporting} className="w-full">
                    <Download className="ml-2 h-4 w-4" />
                    {exporting ? "جاري التصدير..." : "تنزيل النسخة الآن"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 space-y-3">
                  <h3 className="font-bold text-lg">استعادة من نسخة احتياطية</h3>
                  <p className="text-sm text-muted-foreground">
                    اختر ملف JSON تم تنزيله سابقاً لاستعادة البيانات.
                  </p>
                  <input
                    type="file"
                    accept="application/json,.json"
                    disabled={importing}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImport(f);
                      e.target.value = "";
                    }}
                    className="block w-full text-sm file:ml-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground">
                    <Upload className="h-3 w-3 inline ml-1" />
                    {importing ? "جاري الاستعادة..." : "ارفع ملف .json"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {progress && (
              <div className="text-sm text-center text-muted-foreground bg-accent/30 rounded p-2">
                {progress}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <strong>الجداول المضمنة:</strong> {BACKUP_TABLES.join("، ")}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemBackup;
