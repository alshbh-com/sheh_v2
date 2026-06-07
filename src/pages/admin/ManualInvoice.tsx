import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Printer, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import InvoiceTemplate, { InvoiceData, InvoiceLine } from "@/components/admin/InvoiceTemplate";

const emptyLine = (): InvoiceLine => ({ code: "", name: "", color: "", size: "", qty: 1, price: 0 });

const todayStr = () => {
  const d = new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const ManualInvoice = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
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

  // Get next invoice number suggestion
  useEffect(() => {
    (async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      setData((d) => ({ ...d, invoiceNumber: String((count || 0) + 1) }));
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

      // التحقق من أن رقم الباركود (كود الصفحة أو رقم الفاتورة) فريد ولم يُستخدم من قبل
      const barcodeVal = (data.pageCode || data.invoiceNumber || "").trim();
      if (barcodeVal) {
        const { data: dup } = await supabase
          .from("orders")
          .select("id")
          .or(
            `invoice_number.eq.${barcodeVal},order_number.eq.${barcodeVal},manual_code.eq.${barcodeVal},tracking_code.eq.${barcodeVal}`
          )
          .limit(1);
        if (dup && dup.length > 0) {
          toast({
            title: "رقم مكرر",
            description: `الرقم ${barcodeVal} مستخدم من قبل في فاتورة أخرى. غيّر رقم الفاتورة أو كود الصفحة.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          invoice_number: data.invoiceNumber,
          order_number: data.invoiceNumber,
          manual_code: data.pageCode || null,
          tracking_code: data.pageCode || data.invoiceNumber,
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

      toast({ title: "تم حفظ الفاتورة بنجاح", description: `رقم الفاتورة: ${data.invoiceNumber}` });
      if (thenPrint) {
        setTimeout(() => window.print(), 200);
      }
      // ابقَ على نفس الصفحة — جهّز فاتورة جديدة فارغة
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      setData({
        invoiceNumber: String((count || 0) + 1),
        date: todayStr(),
        customerName: "", customerPhone: "", customerAddress: "",
        governorate: "", accountName: "", pageCode: "",
        notes: "",
        shipping: 0, lines: [emptyLine(), emptyLine()],
      });
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
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
          <InvoiceTemplate data={data} editable onChange={setData} onCodeBlur={handleCodeBlur} />
        </Card>

        <p className="no-print text-xs text-muted-foreground mt-3 text-center">
          نصيحة: اكتب كود المنتج واضغط Enter أو Tab — البيانات تتعبأ تلقائياً.
        </p>
      </div>
    </div>
  );
};

export default ManualInvoice;
