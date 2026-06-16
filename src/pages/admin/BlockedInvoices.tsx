import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Ban, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

type BlockedRow = {
  id: string;
  invoice_number: string;
  reason: string | null;
  blocked_by: string | null;
  created_at: string;
};

const BlockedInvoices = () => {
  const navigate = useNavigate();
  const { currentUser } = useAdminAuth();
  const isOwner = currentUser?.role === "owner";
  const [rows, setRows] = useState<BlockedRow[]>([]);
  const [num, setNum] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("blocked_invoices")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((data as any) || []);
  };

  useEffect(() => {
    if (isOwner) load();
  }, [isOwner]);

  const addBlock = async () => {
    const v = num.trim();
    if (!v) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("blocked_invoices")
        .insert({ invoice_number: v, reason: reason.trim() || null, blocked_by: currentUser?.username || null });
      if (error) throw error;
      toast.success(`تم بلوك رقم ${v}`);
      setNum("");
      setReason("");
      load();
    } catch (e: any) {
      toast.error(e.message?.includes("duplicate") ? "الرقم ده مبلوك بالفعل" : e.message);
    } finally {
      setSaving(false);
    }
  };

  const removeBlock = async (id: string) => {
    if (!confirm("حذف البلوك؟")) return;
    const { error } = await (supabase as any).from("blocked_invoices").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("تم إلغاء البلوك");
    load();
  };

  if (!isOwner) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold mb-2">غير مصرح</h2>
        <p className="text-muted-foreground mb-4">هذا القسم متاح للمالك فقط.</p>
        <Button onClick={() => navigate("/admin")}>رجوع</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-8" dir="rtl">
      <div className="container mx-auto px-4 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-4">
          <ArrowRight className="ml-2 h-4 w-4" /> رجوع
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-600" /> البلوك — أرقام فواتير مرفوضة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-end p-3 bg-muted rounded-md">
              <div>
                <Label>رقم الفاتورة</Label>
                <Input value={num} onChange={(e) => setNum(e.target.value)} placeholder="مثال: 1234" />
              </div>
              <div>
                <Label>سبب البلوك (اختياري)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: محاولة احتيال" />
              </div>
              <Button onClick={addBlock} disabled={saving || !num.trim()}>
                <Plus className="ml-2 h-4 w-4" /> بلوك
              </Button>
            </div>

            <div className="space-y-2">
              {rows.length === 0 && <p className="text-center text-muted-foreground py-6">لا توجد أرقام مبلوكة.</p>}
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between border rounded p-3">
                  <div className="flex flex-col">
                    <span className="font-mono font-bold text-red-600">#{r.invoice_number}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.reason || "بدون سبب"} • بواسطة {r.blocked_by || "—"} • {new Date(r.created_at).toLocaleString("ar-EG")}
                    </span>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => removeBlock(r.id)}>
                    <Trash2 className="h-4 w-4 ml-1" /> إلغاء
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BlockedInvoices;
