import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package } from "lucide-react";

interface Props {
  order: any;
  onSuccess?: () => void;
}

type Row = {
  product_id: string | null;
  product_name: string;
  price: number;
  originalQty: number;
  deliveredQty: number;
};

const PartialDeliveryDialog = ({ order, onSuccess }: Props) => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [collected, setCollected] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [customerShipping, setCustomerShipping] = useState<number>(0);

  useEffect(() => {
    if (!open) return;
    const items = (order.order_items || []).map((it: any) => {
      const name =
        it?.products?.name ||
        it?.product_name ||
        "منتج";
      const currentQty = parseFloat((it?.quantity ?? 0).toString()) || 0;
      const origQty = parseFloat((it?.original_quantity ?? currentQty).toString()) || currentQty;
      const price = parseFloat((it?.price ?? it?.unit_price ?? 0).toString()) || 0;
      return {
        product_id: it?.product_id ?? null,
        product_name: name,
        price,
        originalQty: Math.max(origQty, currentQty),
        deliveredQty: currentQty,
      };
    });
    setRows(items);
    const ship = parseFloat(order.shipping_cost?.toString() || "0");
    setCustomerShipping(ship);
    const initialTotal = items.reduce((s: number, r: Row) => s + r.price * r.deliveredQty, 0) + ship;
    setCollected(initialTotal.toFixed(2));
  }, [open, order]);

  const newSubtotal = rows.reduce((s, r) => s + r.price * r.deliveredQty, 0);
  const newTotal = newSubtotal + customerShipping;

  const setDeliveredQty = (idx: number, val: number) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, deliveredQty: Math.max(0, Math.min(r.originalQty, val)) } : r)));
  };

  const handleSave = async () => {
    if (!order?.id) return;
    setSaving(true);
    try {
      // 1. Build returned items list (items with delivered < original)
      const returnedItems = rows
        .filter((r) => r.deliveredQty < r.originalQty)
        .map((r) => ({
          product_id: r.product_id,
          product_name: r.product_name,
          quantity: r.originalQty - r.deliveredQty,
          price: r.price,
        }));

      const totallyDelivered = returnedItems.length === 0;
      const totallyReturned = rows.every((r) => r.deliveredQty === 0);

      // 2. Upsert a returns row if any items returned
      if (returnedItems.length > 0) {
        const returnAmount = returnedItems.reduce((s, it) => s + it.quantity * it.price, 0);

        const { data: existingReturn } = await supabase
          .from("returns")
          .select("id")
          .eq("order_id", order.id)
          .maybeSingle();

        if (existingReturn?.id) {
          await supabase
            .from("returns")
            .update({
              customer_id: order.customer_id,
              delivery_agent_id: order.delivery_agent_id,
              return_amount: returnAmount,
              returned_items: returnedItems as any,
              notes: totallyReturned ? "مرتجع كامل" : "مرتجع جزئي",
            })
            .eq("id", existingReturn.id);
        } else {
          await supabase.from("returns").insert({
            order_id: order.id,
            customer_id: order.customer_id,
            delivery_agent_id: order.delivery_agent_id,
            return_amount: returnAmount,
            returned_items: returnedItems as any,
            notes: totallyReturned ? "مرتجع كامل" : "مرتجع جزئي",
          });
        }
      } else {
        // No returns — remove any prior return record for this order
        await supabase.from("returns").delete().eq("order_id", order.id);
      }

      // 3. Update order_items quantities to the delivered amounts (auto-stock-adjust trigger handles stock)
      for (let i = 0; i < rows.length; i++) {
        const it = (order.order_items || [])[i];
        if (!it) continue;
        const r = rows[i];
        if (r.deliveredQty !== r.originalQty) {
          await supabase
            .from("order_items")
            .update({
              quantity: r.deliveredQty,
              total_price: r.price * r.deliveredQty,
            })
            .eq("id", it.id);
        }
      }

      // 4. Update order: status, totals
      const newStatus = totallyReturned
        ? "returned"
        : totallyDelivered
        ? "delivered"
        : "delivered_with_modification";

      await supabase
        .from("orders")
        .update({
          status: newStatus as any,
          subtotal: newSubtotal,
          total_amount: newSubtotal,
        })
        .eq("id", order.id);

      // 5. Record what the agent collected (if any)
      const collectedAmount = parseFloat(collected || "0");
      if (collectedAmount > 0) {
        await supabase.from("agent_payments").insert({
          agent_id: order.delivery_agent_id,
          order_id: order.id,
          amount: collectedAmount,
          payment_type: "delivered",
          notes: totallyDelivered ? "تسليم كامل" : "تسليم جزئي",
        } as any);
      }

      toast.success("تم تسجيل التسليم الجزئي");
      setOpen(false);
      onSuccess?.();
    } catch (e: any) {
      console.error(e);
      toast.error("فشل التسجيل: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-blue-50 hover:bg-blue-100 border-blue-300">
          <Package className="ml-2 h-4 w-4" />
          تسليم جزئي
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>تسليم جزئي للأوردر #{order.order_number}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            عدّل كمية المُسلّم لكل منتج. القطع غير المُسلّمة هتترصد كـ "مرتجع" والفاتورة هتتعدل تلقائياً.
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-2 text-right">المنتج</th>
                  <th className="p-2 text-center">السعر</th>
                  <th className="p-2 text-center">الأصلي</th>
                  <th className="p-2 text-center">المُسلّم</th>
                  <th className="p-2 text-center">المرتجع</th>
                  <th className="p-2 text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-2">{r.product_name}</td>
                    <td className="p-2 text-center">{r.price.toFixed(2)}</td>
                    <td className="p-2 text-center">{r.originalQty}</td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => setDeliveredQty(i, r.deliveredQty - 1)}
                        >-</Button>
                        <Input
                          type="number"
                          value={r.deliveredQty}
                          onChange={(e) => setDeliveredQty(i, parseInt(e.target.value) || 0)}
                          className="w-16 h-8 text-center"
                          min={0}
                          max={r.originalQty}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 w-7 p-0"
                          onClick={() => setDeliveredQty(i, r.deliveredQty + 1)}
                        >+</Button>
                      </div>
                    </td>
                    <td className="p-2 text-center text-orange-600 font-medium">
                      {r.originalQty - r.deliveredQty}
                    </td>
                    <td className="p-2 text-center font-medium">
                      {(r.price * r.deliveredQty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-muted/50">
                <tr className="border-t">
                  <td colSpan={5} className="p-2 text-right font-bold">إجمالي المنتجات المُسلّمة</td>
                  <td className="p-2 text-center font-bold">{newSubtotal.toFixed(2)} ج</td>
                </tr>
                <tr>
                  <td colSpan={5} className="p-2 text-right font-bold">الشحن</td>
                  <td className="p-2 text-center font-bold">{customerShipping.toFixed(2)} ج</td>
                </tr>
                <tr>
                  <td colSpan={5} className="p-2 text-right font-bold text-primary">الإجمالي بعد التعديل</td>
                  <td className="p-2 text-center font-bold text-primary">{newTotal.toFixed(2)} ج</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <Label className="text-sm font-bold text-green-900">المبلغ الذي قبضه المندوب من العميل</Label>
            <Input
              type="number"
              value={collected}
              onChange={(e) => setCollected(e.target.value)}
              className="mt-1 bg-white"
              placeholder="0.00"
            />
            <p className="text-xs text-green-700 mt-1">يتم تسجيله كمدفوع في الملخص اليومي للمندوب.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>إلغاء</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "جاري الحفظ..." : "حفظ التسليم الجزئي"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PartialDeliveryDialog;
