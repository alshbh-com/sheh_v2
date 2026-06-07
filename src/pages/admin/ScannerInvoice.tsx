import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScanLine, ArrowRight, Trash2, Check, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { useBarcodeScanner } from "@/features/scanner/hooks/useBarcodeScanner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

type ScannedItem = {
  product_id: string;
  code: string;
  name: string;
  color: string;
  size: string;
  price: number;
  qty: number;
};

const ScannerInvoice = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [agents, setAgents] = useState<any[]>([]);
  const [finishOpen, setFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_address: "",
    shipping: "0",
    agent_id: "",
    notes: "",
  });

  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: ag }] = await Promise.all([
        supabase.from("products").select("id, code, barcode, name, price, sale_price, color, size").eq("is_active", true).limit(5000),
        supabase.from("delivery_agents").select("id, name").eq("is_active", true).eq("is_deleted", false),
      ]);
      setProducts(ps || []);
      setAgents(ag || []);
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
            price: Number(p.sale_price || p.price || 0),
            qty: 1,
          },
        ];
      });
    },
    [productIndex]
  );

  useBarcodeScanner(addByCode, true);

  const subtotal = items.reduce((s, it) => s + it.qty * it.price, 0);
  const shipping = parseFloat(form.shipping) || 0;
  const total = subtotal + shipping;

  const updateQty = (idx: number, delta: number) => {
    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, qty: Math.max(1, x.qty + delta) } : x)));
  };
  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    if (items.length === 0) {
      toast({ title: "لا توجد منتجات مسكانة", variant: "destructive" });
      return;
    }
    if (!form.customer_name || !form.customer_phone) {
      toast({ title: "اسم العميل ورقم الهاتف مطلوبان", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          // Let the DB trigger assign a unique order/invoice number to avoid duplicate-code errors
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_address: form.customer_address,
          notes: form.notes,
          subtotal,
          shipping_cost: shipping,
          total_amount: total,
          status: form.agent_id ? "processing" : "pending",
          payment_status: "unpaid",
          source: "scanner",
          delivery_agent_id: form.agent_id || null,
          assigned_at: form.agent_id ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("order_items").insert(
        items.map((it) => ({
          order_id: order.id,
          product_id: it.product_id,
          product_code: it.code,
          product_name: it.name,
          color: it.color,
          size: it.size,
          quantity: it.qty,
          unit_price: it.price,
          price: it.price,
          total_price: it.qty * it.price,
        }))
      );

      toast({ title: "تم إنشاء الفاتورة بنجاح" });
      setFinishOpen(false);
      navigate(`/admin/orders`);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate("/admin")}>
          <ArrowRight className="ml-2 h-4 w-4" /> رجوع
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          فاتورة بالـ Scanner (وضع المنتجات)
        </h1>
        <div className="w-20" />
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
                  <th className="p-2">السعر</th>
                  <th className="p-2">الكمية</th>
                  <th className="p-2">الإجمالي</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2 font-medium">{it.name}</td>
                    <td className="p-2 text-center">{it.code}</td>
                    <td className="p-2 text-center">{[it.color, it.size].filter(Boolean).join(" / ") || "-"}</td>
                    <td className="p-2 text-center">{it.price}</td>
                    <td className="p-2 text-center">
                      <div className="inline-flex items-center gap-1">
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(idx, -1)}>-</Button>
                        <span className="w-8 text-center font-bold">{it.qty}</span>
                        <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQty(idx, 1)}>+</Button>
                      </div>
                    </td>
                    <td className="p-2 text-center font-bold">{it.qty * it.price}</td>
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
                  <td colSpan={5} className="p-2 text-left">إجمالي المنتجات:</td>
                  <td className="p-2 text-center text-lg">{subtotal}</td>
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

      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle>إنهاء الفاتورة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>اسم العميل *</Label>
              <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
            </div>
            <div>
              <Label>رقم الهاتف *</Label>
              <Input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>الشحن</Label>
                <Input type="number" value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} />
              </div>
              <div>
                <Label>المندوب</Label>
                <Select value={form.agent_id} onValueChange={(v) => setForm({ ...form, agent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="اختر المندوب" /></SelectTrigger>
                  <SelectContent>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <div>إجمالي المنتجات: <b>{subtotal}</b></div>
              <div>الشحن: <b>{shipping}</b></div>
              <div className="text-lg">الإجمالي النهائي: <b className="text-primary">{total}</b></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFinishOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "جاري الحفظ..." : "حفظ الفاتورة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScannerInvoice;
