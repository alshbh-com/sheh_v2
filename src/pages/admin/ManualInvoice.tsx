import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Printer, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import InvoiceTemplate, { InvoiceData, InvoiceLine } from "@/components/admin/InvoiceTemplate";
import { printInvoiceTemplate } from "@/lib/printInvoiceTemplate";

const emptyLine = (): InvoiceLine => ({ code: "", name: "", color: "", size: "", qty: 1, price: 0 });

const todayStr = () => {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const duplicateCodeMessage = "الرقم مستخدم قبل كده في فاتورة/أوردر تاني. اكتب رقم مختلف.";

const ManualInvoice = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [invoiceNumberTouched, setInvoiceNumberTouched] = useState(false);
  const [data, setData] = useState<InvoiceData>({
    invoiceNumber: "",
    date: todayStr(),
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    governorate: "",
    accountName: "",
    pageCode: "",
    notes: "",
    shipping: 0,
    lines: [emptyLine(), emptyLine()],
  });


  // Load all products once for fast in-memory lookup (1000+ supported)
  useEffect(() => {
    (async () => {
      const { data: ps } = await supabase
        .from("products")
        .select("id, code, barcode, name, price, sale_price, color, size")
        .eq("is_active", true)
        .limit(5000);
      setProducts(ps || []);
    })();
  }, []);

  const getNextInvoiceNumber = async () => {
    const { data: nextCode, error } = await (supabase as any).rpc("preview_next_order_code");
    if (error) throw error;
    return String(nextCode || "");
  };

  // Get next invoice number suggestion from the order-number sequence
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
    products.forEach((p) => {
      if (p.code) byCode.set(String(p.code).trim().toLowerCase(), p);
      if (p.barcode) byBarcode.set(String(p.barcode).trim().toLowerCase(), p);
    });
    return { byCode, byBarcode };
  }, [products]);

  const handleCodeBlur = (rowIndex: number, code: string) => {
    if (!code) return;
    const key = code.trim().toLowerCase();
    const p = productIndex.byCode.get(key) || productIndex.byBarcode.get(key);
    if (!p) {
      toast({ title: "المنتج غير موجود", description: `لا يوجد منتج بكود ${code}`, variant: "destructive" });
      return;
    }
    setData((d) => {
      const lines = [...d.lines];
      const cur = lines[rowIndex] || emptyLine();
      lines[rowIndex] = {
        ...cur,
        code: p.code,
        name: p.name,
        color: p.color || cur.color || "",
        size: p.size || cur.size || "",
        price: Number(p.sale_price || p.price || 0),
        qty: cur.qty || 1,
      };
      // لا نضيف صفوف تلقائياً — المستخدم يضيف/يحذف يدوياً بزر + / −
      return { ...d, lines };
    });

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
    return checks.some(({ data: rows }) => rows && rows.length > 0);
  };

  const save = async (thenPrint = false) => {
    const items = filledLines();
    if (items.length === 0) {
      toast({ title: "أضف منتج واحد على الأقل", variant: "destructive" });
      return;
    }
    if (!data.customerName || !data.customerPhone) {
      toast({ title: "اسم العميل ورقم الهاتف مطلوبان", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const subtotal = items.reduce((s, l) => s + l.qty * l.price, 0);
      const shipping = Number(data.shipping) || 0;
      const total = subtotal + shipping;

      const invoiceCode = invoiceNumberTouched ? data.invoiceNumber.trim() : "";
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

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          ...(invoiceCode ? { invoice_number: invoiceCode, order_number: invoiceCode } : {}),
          manual_code: pageCode || null,
          ...(pageCode || invoiceCode ? { tracking_code: pageCode || invoiceCode } : {}),
          account_name: data.accountName || null,
          governorate: data.governorate || null,
          customer_name: data.customerName,
          customer_phone: data.customerPhone,
          customer_address: data.customerAddress,
          notes: data.notes,
          subtotal,
          shipping_cost: shipping,
          total_amount: total,
          status: "pending",
          payment_status: "unpaid",
          source: "manual",
        })
        .select()
        .single();
      if (error) throw error;


      const itemRows = items.map((l) => {
        const p = productIndex.byCode.get(String(l.code).trim().toLowerCase());
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
      const savedOrder = { ...order, invoice_number: savedInvoiceNumber, order_number: savedInvoiceNumber, order_items: itemRows };

      toast({ title: "تم حفظ الفاتورة بنجاح", description: `رقم الفاتورة: ${savedInvoiceNumber}` });
      if (thenPrint) {
        await printInvoiceTemplate([savedOrder] as any, { markPrinted: false, copies: 2 });
      }
      // ابقَ على نفس الصفحة — جهّز فاتورة جديدة فارغة
      let nextInvoiceNumber = "";
      try {
        nextInvoiceNumber = await getNextInvoiceNumber();
      } catch {}
      setData({
        invoiceNumber: nextInvoiceNumber,
        date: todayStr(),
        customerName: "", customerPhone: "", customerAddress: "",
        governorate: "", accountName: "", pageCode: "",
        notes: "",
        shipping: 0, lines: [emptyLine(), emptyLine()],
      });
      setInvoiceNumberTouched(false);
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
        {/* Toolbar (hidden on print) */}
        <div className="no-print flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => navigate("/admin")}>
            <ArrowRight className="ml-2 h-4 w-4" /> رجوع
          </Button>
          <h1 className="text-xl font-bold">إضافة فاتورة يدوية</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="ml-2 h-4 w-4" /> طباعة
            </Button>
            <Button onClick={() => save(false)} disabled={saving}>
              <Save className="ml-2 h-4 w-4" /> حفظ
            </Button>
            <Button onClick={() => save(true)} disabled={saving} variant="default">
              <Printer className="ml-2 h-4 w-4" /> حفظ وطباعة
            </Button>
          </div>
        </div>

        <Card className="p-4 bg-muted/30">
          <InvoiceTemplate
            data={data}
            editable
            onChange={(next) => {
              if (next.invoiceNumber !== data.invoiceNumber) setInvoiceNumberTouched(true);
              setData(next);
            }}
            onCodeBlur={handleCodeBlur}
          />
        </Card>

        <p className="no-print text-xs text-muted-foreground mt-3 text-center">
          نصيحة: اكتب كود المنتج واضغط Enter أو Tab — البيانات تتعبأ تلقائياً.
        </p>
      </div>
    </div>
  );
};

export default ManualInvoice;
