import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, ArrowRight, Trash2, Check, ArrowUpFromLine, ArrowDownToLine, History, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useBarcodeScanner } from "@/features/scanner/hooks/useBarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

type ScannedItem = {
  product_id: string;
  code: string;
  name: string;
  color: string;
  size: string;
  stock: number;
  qty: number;
  price: number;
};

type Movement = {
  id: string;
  agent_id: string | null;
  agent_name: string;
  movement_type: "out" | "in";
  total_qty: number;
  items: ScannedItem[];
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

const ScannerInvoice = () => {
  const navigate = useNavigate();
  const { currentUser } = useAdminAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [finishOpen, setFinishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<Movement[]>([]);
  const [historyFilterAgent, setHistoryFilterAgent] = useState<string>("all");
  const [saving, setSaving] = useState(false);

  // Dialog form
  const [agentId, setAgentId] = useState<string>("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: ags }] = await Promise.all([
        supabase
          .from("products")
          .select("id, code, barcode, name, color, size, stock, quantity, price, sale_price")
          .eq("is_active", true)
          .limit(5000),
        supabase
          .from("delivery_agents")
          .select("id, name, phone")
          .eq("is_active", true)
          .eq("is_deleted", false)
          .order("name"),
      ]);
      setProducts(ps || []);
      setAgents(ags || []);
    })();
  }, []);

  const productIndex = useMemo(() => {
    const m = new Map<string, any>();
    products.forEach((p) => {
      if (p.code) m.set(String(p.code).trim().toLowerCase(), p);
      if (p.barcode) m.set(String(p.barcode).trim().toLowerCase(), p);
    });
    return m;
  }, [products]);

  const addByCode = useCallback(
    (raw: string) => {
      const key = raw.trim().toLowerCase();
      if (!key) return;
      const p = productIndex.get(key);
      if (!p) {
        toast({ title: "منتج غير موجود", description: raw, variant: "destructive" });
        return;
      }
      setItems((prev) => {
        const idx = prev.findIndex((x) => x.product_id === p.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
          return next;
        }
        return [
          ...prev,
          {
            product_id: p.id,
            code: p.code || "",
            name: p.name,
            color: p.color || "",
            size: p.size || "",
            stock: Number(p.stock ?? p.quantity ?? 0),
            qty: 1,
          },
        ];
      });
    },
    [productIndex]
  );

  useBarcodeScanner(addByCode, !finishOpen && !historyOpen);

  const totalQty = items.reduce((s, it) => s + it.qty, 0);

  const updateQty = (idx: number, delta: number) => {
    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: Math.max(1, x.qty + delta) } : x)));
  };
  const setQty = (idx: number, val: number) => {
    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: Math.max(1, val || 1) } : x)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("agent_stock_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setHistory((data as any) || []);
  };

  const openHistory = async () => {
    await loadHistory();
    setHistoryOpen(true);
  };

  const applyMovement = async (mode: "out" | "in") => {
    if (items.length === 0) return;
    if (!agentId) {
      toast({ title: "اختر المندوب أولاً", variant: "destructive" });
      return;
    }
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    setSaving(true);
    try {
      // out = remove from warehouse (subtract). in = return to warehouse (add).
      const sign = mode === "out" ? -1 : 1;
      for (const it of items) {
        const newStock = it.stock + sign * it.qty;
        const { error } = await supabase
          .from("products")
          .update({ stock: newStock, quantity: newStock, updated_at: new Date().toISOString() })
          .eq("id", it.product_id);
        if (error) throw error;
      }

      const { data: saved, error: insErr } = await supabase
        .from("agent_stock_movements")
        .insert({
          agent_id: agent.id,
          agent_name: agent.name,
          movement_type: mode,
          total_qty: totalQty,
          items: items as any,
          notes: notes || null,
          created_by: currentUser?.username || null,
        })
        .select()
        .single();
      if (insErr) throw insErr;

      toast({
        title: mode === "out" ? "تم تسجيل خروج المنتجات للمندوب" : "تم تسجيل إرجاع المنتجات من المندوب",
        description: `${agent.name} • ${items.length} منتج / ${totalQty} قطعة`,
      });

      // Auto-print receipt
      printMovement(saved as any);

      setFinishOpen(false);
      setItems([]);
      setAgentId("");
      setNotes("");
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const printMovement = (m: Movement) => {
    const typeLabel = m.movement_type === "out" ? "خروج للمندوب" : "إرجاع من المندوب";
    const rows = (m.items || [])
      .map(
        (it, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${it.code || "-"}</td>
            <td>${it.name}</td>
            <td>${[it.color, it.size].filter(Boolean).join(" / ") || "-"}</td>
            <td style="text-align:center">${it.qty}</td>
          </tr>`
      )
      .join("");
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>إيصال ${typeLabel}</title>
      <style>
        @page { size: A4; margin: 12mm; }
        body { font-family: Arial, sans-serif; }
        h1 { text-align:center; margin:0 0 8px; }
        .meta { display:flex; justify-content:space-between; margin: 8px 0 12px; font-size:14px; }
        table { width:100%; border-collapse:collapse; font-size:13px; }
        th,td { border:1px solid #333; padding:6px; }
        th { background:#f3f4f6; }
        .tot { margin-top:10px; font-weight:bold; font-size:15px; }
        .sig { margin-top:40px; display:flex; justify-content:space-between; }
        .sig div { width:45%; border-top:1px solid #333; padding-top:6px; text-align:center; }
      </style></head><body>
      <h1>إيصال ${typeLabel}</h1>
      <div class="meta">
        <div><b>المندوب:</b> ${m.agent_name}</div>
        <div><b>التاريخ:</b> ${new Date(m.created_at).toLocaleString("ar-EG")}</div>
        <div><b>المسجل:</b> ${m.created_by || "-"}</div>
      </div>
      <table>
        <thead><tr><th>#</th><th>الكود</th><th>المنتج</th><th>اللون/المقاس</th><th>الكمية</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="tot">إجمالي القطع: ${m.total_qty} | عدد المنتجات: ${(m.items || []).length}</div>
      ${m.notes ? `<p><b>ملاحظات:</b> ${m.notes}</p>` : ""}
      <div class="sig"><div>توقيع المندوب</div><div>توقيع المسؤول</div></div>
      <script>window.onload=()=>setTimeout(()=>window.print(),250)</script>
    </body></html>`);
    w.document.close();
  };

  const filteredHistory = useMemo(
    () => history.filter((h) => historyFilterAgent === "all" || h.agent_id === historyFilterAgent),
    [history, historyFilterAgent]
  );

  const agentSummary = useMemo(() => {
    const m = new Map<string, { name: string; out: number; in: number; balance: number }>();
    filteredHistory.forEach((h) => {
      const key = h.agent_id || h.agent_name;
      const cur = m.get(key) || { name: h.agent_name, out: 0, in: 0, balance: 0 };
      if (h.movement_type === "out") cur.out += h.total_qty;
      else cur.in += h.total_qty;
      cur.balance = cur.out - cur.in;
      m.set(key, cur);
    });
    return Array.from(m.values());
  }, [filteredHistory]);

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/admin")}>
          <ArrowRight className="ml-2 h-4 w-4" /> رجوع
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Scanner المنتجات (حركة المخزون مع المندوبين)
        </h1>
        <Button variant="outline" onClick={openHistory}>
          <History className="ml-2 h-4 w-4" /> السجل
        </Button>
      </div>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>كود أو باركود المنتج</Label>
            <Input
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && manualCode.trim()) {
                  addByCode(manualCode);
                  setManualCode("");
                }
              }}
              placeholder="امسح بالمسدس أو اكتب الكود واضغط Enter"
            />
          </div>
          <Button
            onClick={() => {
              if (manualCode.trim()) {
                addByCode(manualCode);
                setManualCode("");
              }
            }}
          >
            إضافة
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          المسدس يضيف المنتج تلقائياً. لو تم مسحه مرتين تتزود الكمية.
        </p>
      </Card>

      <Card className="p-4">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">لم يتم مسح أي منتج بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-right">المنتج</th>
                  <th className="p-2">الكود</th>
                  <th className="p-2">اللون/المقاس</th>
                  <th className="p-2">المخزون الحالي</th>
                  <th className="p-2">الكمية</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-medium">{it.name}</td>
                    <td className="p-2 text-center">{it.code}</td>
                    <td className="p-2 text-center">{[it.color, it.size].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="p-2 text-center">{it.stock}</td>
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(idx, -1)}>-</Button>
                        <Input
                          type="number"
                          value={it.qty}
                          onChange={(e) => setQty(idx, parseInt(e.target.value))}
                          className="w-16 h-7 text-center"
                        />
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(idx, 1)}>+</Button>
                      </div>
                    </td>
                    <td className="p-2">
                      <Button size="sm" variant="destructive" onClick={() => removeItem(idx)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td colSpan={4} className="p-2 text-left">إجمالي القطع:</td>
                  <td className="p-2 text-center text-lg">{totalQty}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setItems([])} disabled={items.length === 0}>
          <Trash2 className="ml-2 h-4 w-4" /> مسح الكل
        </Button>
        <Button onClick={() => setFinishOpen(true)} disabled={items.length === 0} size="lg">
          <Check className="ml-2 h-4 w-4" /> انتهيت ({items.length} منتج)
        </Button>
      </div>

      {/* Finish dialog */}
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>تسجيل حركة مخزون مع مندوب</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div>عدد المنتجات: <b>{items.length}</b></div>
              <div>إجمالي القطع: <b className="text-primary">{totalQty}</b></div>
            </div>

            <div>
              <Label>المندوب *</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger><SelectValue placeholder="اختر المندوب" /></SelectTrigger>
                <SelectContent>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}{a.phone ? ` - ${a.phone}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="اختياري" />
            </div>

            <p className="text-sm text-muted-foreground">
              اختر نوع الحركة. سيتم تسجيلها في سجل المندوب وطباعة إيصال بالقطع.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                onClick={() => applyMovement("out")}
                disabled={saving || !agentId}
                variant="destructive"
                className="h-20 flex-col gap-1"
              >
                <ArrowUpFromLine className="h-6 w-6" />
                خروج للمندوب
                <span className="text-xs opacity-80">(خصم من المخزن)</span>
              </Button>
              <Button
                size="lg"
                onClick={() => applyMovement("in")}
                disabled={saving || !agentId}
                className="h-20 bg-green-600 hover:bg-green-700 flex-col gap-1"
              >
                <ArrowDownToLine className="h-6 w-6" />
                إرجاع من المندوب
                <span className="text-xs opacity-80">(إضافة للمخزن)</span>
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinishOpen(false)} disabled={saving}>إلغاء</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent dir="rtl" className="max-w-5xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>سجل حركة المخزون مع المندوبين</DialogTitle>
          </DialogHeader>

          <div className="flex items-end gap-2 mb-3">
            <div className="flex-1">
              <Label>تصفية بالمندوب</Label>
              <Select value={historyFilterAgent} onValueChange={setHistoryFilterAgent}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المندوبين</SelectItem>
                  {agents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadHistory}>تحديث</Button>
          </div>

          {agentSummary.length > 0 && (
            <Card className="p-3 mb-3">
              <div className="font-bold mb-2">ملخص الأرصدة</div>
              <table className="w-full text-sm">
                <thead><tr className="border-b">
                  <th className="p-1 text-right">المندوب</th>
                  <th className="p-1">خرج</th>
                  <th className="p-1">رجع</th>
                  <th className="p-1">المتبقي معه</th>
                </tr></thead>
                <tbody>
                  {agentSummary.map((a, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-1 font-medium">{a.name}</td>
                      <td className="p-1 text-center text-red-600">{a.out}</td>
                      <td className="p-1 text-center text-green-600">{a.in}</td>
                      <td className="p-1 text-center font-bold">{a.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <div className="space-y-2">
            {filteredHistory.length === 0 && (
              <div className="text-center text-muted-foreground py-6">لا يوجد سجل.</div>
            )}
            {filteredHistory.map((m) => (
              <Card key={m.id} className="p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${m.movement_type === "out" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {m.movement_type === "out" ? "خروج" : "إرجاع"}
                    </span>
                    <b>{m.agent_name}</b>
                    <span className="text-sm text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("ar-EG")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>القطع: <b>{m.total_qty}</b></span>
                    <span className="text-muted-foreground">| المسجل: {m.created_by || "-"}</span>
                    <Button size="sm" variant="outline" onClick={() => printMovement(m)}>
                      <Printer className="h-3 w-3 ml-1" /> طباعة
                    </Button>
                  </div>
                </div>
                {m.notes && <div className="text-sm text-muted-foreground mt-1">ملاحظة: {m.notes}</div>}
                <div className="mt-2 text-xs text-muted-foreground">
                  {(m.items || []).slice(0, 6).map((it, i) => (
                    <span key={i} className="inline-block ml-2">
                      {it.name} ({it.qty})
                    </span>
                  ))}
                  {(m.items || []).length > 6 && <span>… +{m.items.length - 6}</span>}
                </div>
              </Card>
            ))}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setHistoryOpen(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScannerInvoice;
