import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Printer, Save, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import InvoiceTemplate, { InvoiceData, InvoiceLine } from "@/components/admin/InvoiceTemplate";
import { printInvoiceTemplate } from "@/lib/printInvoiceTemplate";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const emptyLine = (): InvoiceLine => ({ code: "", name: "", color: "", size: "", qty: 1, price: 0 });

const todayStr = () => {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const duplicateCodeMessage = "الرقم مستخدم قبل كده في فاتورة/أوردر تاني. اكتب رقم مختلف.";

const normalizePhone = (s: string) => (s || "").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "");

const downloadInvoicePng = async (filename: string) => {
  try {
    const el = document.getElementById("invoice-print");
    if (!el) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    console.error("png export failed", e);
  }
};

const ManualInvoice = () => {
  const navigate = useNavigate();
  const { currentUser } = useAdminAuth();
  const role = (currentUser as any)?.role;
  const isModerator = role === 'moderator';
  const isAdmin = !isModerator; // admin / owner / supervisor can edit existing
  const [products, setProducts] = useState<any[]>([]);
  const [governorates, setGovernorates] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [scratch, setScratch] = useState("");
  const [data, setData] = useState<InvoiceData>({
    invoiceNumber: "",
    date: todayStr(),
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    governorate: "",
    accountName: "",
    pageCode: "",
    extraNumber: "",
    notes: "",
    shipping: 0,
    lines: [emptyLine(), emptyLine()],
  });

  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: gs }] = await Promise.all([
        supabase
          .from("products")
          .select("id, code, barcode, name, price, sale_price, color, size, wholesale_price, wholesale_code")
          .eq("is_active", true)
          .limit(5000),
        supabase.from("governorates").select("id, name, shipping_cost").order("name"),
      ]);
      setProducts(ps || []);
      setGovernorates(gs || []);
    })();
  }, []);

  const getNextInvoiceNumber = async () => {
    const { data: nextCode, error } = await (supabase as any).rpc("preview_next_order_code");
    if (error) throw error;
    return String(nextCode || "");
  };

  useEffect(() => {
    (async () => {
      try {
        const nextCode = await getNextInvoiceNumber();
        setData((d) => ({ ...d, invoiceNumber: nextCode }));
      } catch {
        setData((d) => ({ ...d, invoiceNumber: "" }));
      }
    })();
  }, []);

  const productIndex = useMemo(() => {
    const byCode = new Map<string, any>();
    const byBarcode = new Map<string, any>();
    const byWholesale = new Map<string, any>();
    products.forEach((p) => {
      if (p.code) byCode.set(String(p.code).trim().toLowerCase(), p);
      if (p.barcode) byBarcode.set(String(p.barcode).trim().toLowerCase(), p);
      if (p.wholesale_code) byWholesale.set(String(p.wholesale_code).trim().toLowerCase(), p);
    });
    return { byCode, byBarcode, byWholesale };
  }, [products]);

  const findProduct = (raw: string) => {
    const key = raw.trim().toLowerCase();
    if (!key) return { p: null as any, isWholesale: false };
    if (productIndex.byWholesale.has(key)) {
      return { p: productIndex.byWholesale.get(key), isWholesale: true };
    }
    return { p: productIndex.byCode.get(key) || productIndex.byBarcode.get(key), isWholesale: false };
  };

  const handleCodeBlur = (rowIndex: number, code: string) => {
    if (!code) return;
    const { p, isWholesale } = findProduct(code);
    if (!p) {
      toast({ title: "المنتج غير موجود", description: `لا يوجد منتج بكود ${code}`, variant: "destructive" });
      return;
    }
    setData((d) => {
      const lines = [...d.lines];
      const cur = lines[rowIndex] || emptyLine();
      const price = isWholesale && p.wholesale_price
        ? Number(p.wholesale_price)
        : Number(p.sale_price || p.price || 0);
      lines[rowIndex] = {
        ...cur,
        code: p.code,
        name: p.name + (isWholesale ? " (جملة)" : ""),
        color: p.color || cur.color || "",
        size: p.size || cur.size || "",
        price,
        qty: cur.qty || 1,
      };
      return { ...d, lines };
    });
  };

  const handleGovernorateChange = (govId: string) => {
    const g = governorates.find((x) => x.id === govId);
    if (!g) return;
    setData((d) => ({ ...d, governorate: g.name, shipping: Number(g.shipping_cost) || 0 }));
  };

  const findExistingOrder = async (code: string) => {
    const value = code.trim();
    if (!value) return null;
    const fields = ["invoice_number", "order_number", "manual_code", "tracking_code"];
    for (const f of fields) {
      const { data: rows } = await (supabase as any)
        .from("orders")
        .select("*, order_items(*)")
        .eq(f, value)
        .limit(1);
      if (rows && rows.length > 0) return rows[0];
    }
    return null;
  };

  const handleInvoiceNumberBlur = async (value: string) => {
    const v = (value || "").trim();
    if (!v) return;
    // Same code as currently loaded edit target — skip
    if (editingOrderId && v === data.invoiceNumber.trim()) return;
    try {
      const existing = await findExistingOrder(v);
      if (!existing) {
        // Clear any previous edit context
        if (editingOrderId) setEditingOrderId(null);
        return;
      }
      if (!isAdmin) {
        toast({
          title: "غير مسموح",
          description: `الرقم ${v} مستخدم بالفعل في فاتورة أخرى. الموديريتور لا يمكنه تعديل الفواتير القديمة.`,
          variant: "destructive",
        });
        // revert to a fresh preview number
        try {
          const nextCode = await getNextInvoiceNumber();
          setData((d) => ({ ...d, invoiceNumber: nextCode }));
        } catch {
          setData((d) => ({ ...d, invoiceNumber: "" }));
        }
        return;
      }
      // Admin: load the existing invoice into the form for editing
      const items = (existing.order_items || []).map((it: any) => ({
        code: it.product_code || "",
        name: it.product_name || "",
        color: it.color || "",
        size: it.size || "",
        qty: Number(it.quantity || 1),
        price: Number(it.unit_price || it.price || 0),
      }));
      const safeLines = items.length ? items : [emptyLine(), emptyLine()];
      setEditingOrderId(existing.id);
      setData({
        invoiceNumber: String(existing.invoice_number || existing.order_number || v),
        date: existing.created_at ? new Date(existing.created_at).toLocaleDateString("en-GB").replace(/\//g, "/") : todayStr(),
        customerName: existing.customer_name || "",
        customerPhone: existing.customer_phone || "",
        customerAddress: existing.customer_address || "",
        governorate: existing.governorate || "",
        accountName: existing.account_name || "",
        pageCode: existing.manual_code || "",
        extraNumber: existing.extra_number || "",
        notes: existing.notes || "",
        shipping: Number(existing.shipping_cost || 0),
        lines: safeLines,
      });
      toast({
        title: "تم تحميل الفاتورة للتعديل",
        description: `فاتورة #${existing.invoice_number || existing.order_number || v} — يمكنك التعديل ثم الحفظ.`,
      });
    } catch (e: any) {
      console.error("invoice lookup failed", e);
    }
  };

  const filledLines = () => data.lines.filter((l) => l.code && l.qty > 0);

  const isCodeTaken = async (code: string) => {
    const value = code.trim();
    if (!value) return false;
    const checks = await Promise.all([
      (supabase as any).from("orders").select("id").eq("invoice_number", value).limit(1),
      (supabase as any).from("orders").select("id").eq("order_number", value).limit(1),
      (supabase as any).from("orders").select("id").eq("manual_code", value).limit(1),
      (supabase as any).from("orders").select("id").eq("tracking_code", value).limit(1),
    ]);
    return checks.some(({ data: rows }) => rows && rows.some((r: any) => r.id !== editingOrderId));
  };

  const validate = (): string | null => {
    if (filledLines().length === 0) return "أضف منتج واحد على الأقل";
    if (!data.customerName.trim()) return "اسم العميل مطلوب";
    const phone = normalizePhone(data.customerPhone);
    if (phone.length !== 11) return "رقم الهاتف لازم يكون 11 رقم بالظبط";
    if (scratch.trim().length > 0) return "صندوق النسخ يجب أن يكون فارغًا قبل حفظ الأوردر";
    return null;
  };

  const save = async (thenPrint = false) => {
    const err = validate();
    if (err) {
      toast({ title: "تنبيه", description: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const items = filledLines();
      const subtotal = items.reduce((s, l) => s + l.qty * l.price, 0);
      const shipping = Number(data.shipping) || 0;

      const invoiceCode = data.invoiceNumber.trim();
      const pageCode = (data.pageCode || "").trim();
      const codesToCheck = Array.from(new Set([invoiceCode, pageCode].filter(Boolean)));
      for (const code of codesToCheck) {
        if (await isCodeTaken(code)) {
          toast({
            title: "رقم مكرر",
            description: `الرقم ${code} مستخدم من قبل في فاتورة أخرى.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      const orderPayload: any = {
        ...(invoiceCode ? { invoice_number: invoiceCode, order_number: invoiceCode } : {}),
        manual_code: pageCode || null,
        ...(pageCode || invoiceCode ? { tracking_code: pageCode || invoiceCode } : {}),
        extra_number: (data.extraNumber || "").trim() || null,
        account_name: data.accountName || null,
        governorate: data.governorate || null,
        customer_name: data.customerName,
        customer_phone: normalizePhone(data.customerPhone),
        customer_address: data.customerAddress,
        notes: data.notes,
        subtotal,
        shipping_cost: shipping,
        total_amount: subtotal,
        source: "manual",
      };

      let order: any;
      if (editingOrderId) {
        if (!isAdmin) {
          toast({ title: "غير مسموح", description: "الموديريتور لا يمكنه تعديل الفواتير القديمة.", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { data: updated, error: updErr } = await supabase
          .from("orders")
          .update(orderPayload)
          .eq("id", editingOrderId)
          .select()
          .single();
        if (updErr) throw updErr;
        order = updated;
        // Replace items
        await supabase.from("order_items").delete().eq("order_id", editingOrderId);
      } else {
        const { data: inserted, error } = await supabase
          .from("orders")
          .insert({ ...orderPayload, status: "pending", payment_status: "unpaid" } as any)
          .select()
          .single();
        if (error) throw error;
        order = inserted;
      }

      const itemRows = items.map((l) => {
        const { p } = findProduct(l.code);
        return {
          order_id: order.id,
          product_id: p?.id || null,
          product_code: l.code,
          product_name: l.name,
          color: l.color,
          size: l.size,
          quantity: l.qty,
          unit_price: l.price,
          price: l.price,
          total_price: l.qty * l.price,
        };
      });
      await supabase.from("order_items").insert(itemRows);

      const savedInvoiceNumber = String(order.invoice_number || order.order_number || invoiceCode || "");

      // Auto-download PNG of the current invoice (before resetting)
      await downloadInvoicePng(`invoice-${savedInvoiceNumber}`);

      const savedOrder = { ...order, invoice_number: savedInvoiceNumber, order_number: savedInvoiceNumber, order_items: itemRows };

      toast({
        title: editingOrderId ? "تم تحديث الفاتورة بنجاح" : "تم حفظ الفاتورة بنجاح",
        description: `رقم الفاتورة: ${savedInvoiceNumber}`,
      });
      if (thenPrint) {
        await printInvoiceTemplate([savedOrder] as any, { markPrinted: false, copies: 2 });
      }
      let nextInvoiceNumber = "";
      try {
        nextInvoiceNumber = await getNextInvoiceNumber();
      } catch {}
      setEditingOrderId(null);
      setData({
        invoiceNumber: nextInvoiceNumber,
        date: todayStr(),
        customerName: "", customerPhone: "", customerAddress: "",
        governorate: "", accountName: "", pageCode: "", extraNumber: "",
        notes: "",
        shipping: 0, lines: [emptyLine(), emptyLine()],
      });
      setScratch("");
    } catch (e: any) {
      const isDuplicate = e?.code === "23505" || String(e?.message || "").includes("duplicate_order_code") || String(e?.message || "").includes("duplicate key");
      toast({ title: isDuplicate ? "رقم مكرر" : "خطأ في الحفظ", description: isDuplicate ? duplicateCodeMessage : e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-6" dir="rtl">
      <div className="max-w-4xl mx-auto px-4">
        <div className="no-print flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowRight className="ml-2 h-4 w-4" /> رجوع
          </Button>
          <h1 className="text-xl font-bold">{editingOrderId ? `تعديل فاتورة #${data.invoiceNumber}` : "إضافة فاتورة يدوية"}</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => downloadInvoicePng(`invoice-${data.invoiceNumber || "draft"}`)}>
              <Download className="ml-2 h-4 w-4" /> حفظ كصورة
            </Button>
            <Button onClick={() => save(false)} disabled={saving}>
              <Save className="ml-2 h-4 w-4" /> حفظ
            </Button>
            <Button onClick={() => save(true)} disabled={saving} variant="default">
              <Printer className="ml-2 h-4 w-4" /> حفظ وطباعة
            </Button>
          </div>
        </div>

        {/* Governorate dropdown (auto-fills shipping) */}
        <Card className="no-print p-3 mb-3 bg-primary/5 border-primary/20 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">المحافظة (تعبئة سعر الشحن تلقائياً)</Label>
            <Select value={governorates.find(g => g.name === data.governorate)?.id || ""} onValueChange={handleGovernorateChange}>
              <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
              <SelectContent>
                {governorates.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} — شحن: {Number(g.shipping_cost || 0).toFixed(0)} ج
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            تنبيه: رقم الهاتف لازم يكون 11 رقم. لكتابة سعر جملة استخدم كود الجملة بدل الكود العادي.
          </div>
        </Card>

        {editingOrderId && (
          <Card className="no-print p-3 mb-3 bg-amber-50 border-amber-300 flex items-center justify-between">
            <div className="text-sm text-amber-800 font-bold">
              ⚠ وضع التعديل: تقوم بتعديل فاتورة موجودة (#{data.invoiceNumber}). اضغط حفظ لتطبيق التغييرات.
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                setEditingOrderId(null);
                try {
                  const next = await getNextInvoiceNumber();
                  setData({
                    invoiceNumber: next,
                    date: todayStr(),
                    customerName: "", customerPhone: "", customerAddress: "",
                    governorate: "", accountName: "", pageCode: "", extraNumber: "",
                    notes: "",
                    shipping: 0, lines: [emptyLine(), emptyLine()],
                  });
                } catch {}
              }}
            >
              إلغاء التعديل
            </Button>
          </Card>
        )}

        <Card className="p-4 bg-muted/30">
          <InvoiceTemplate
            data={data}
            editable
            onChange={setData}
            onCodeBlur={handleCodeBlur}
            onInvoiceNumberBlur={handleInvoiceNumberBlur}
          />
        </Card>

        {/* Scratch box — must be empty before save */}
        <Card className="no-print p-3 mt-3 bg-amber-50 border-amber-300">
          <Label className="text-xs font-bold text-amber-800">صندوق النسخ المؤقت (لازم يبقى فارغ قبل الحفظ)</Label>
          <Textarea
            value={scratch}
            onChange={(e) => setScratch(e.target.value)}
            placeholder="انسخ هنا أي كلام عشان تلصقه في الخانات بعده. لازم تمسحه قبل ما تحفظ الأوردر."
            className="bg-white"
            rows={3}
          />
          {scratch.trim().length > 0 && (
            <p className="text-xs text-red-600 mt-1 font-bold">⚠ الصندوق لسه فيه كلام — لن يتم حفظ الأوردر.</p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ManualInvoice;
