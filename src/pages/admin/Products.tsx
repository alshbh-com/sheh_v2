import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, ArrowLeft, Edit, Tag, X, Printer, FileSpreadsheet, Upload } from "lucide-react";
import { useRef } from "react";
import * as XLSX from "xlsx";
import { printProductLabel } from "@/lib/printProductLabel";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

const Products = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canEdit } = useAdminAuth();
  const canEditProducts = canEdit('products');
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    barcode: "",
    description: "",
    price: "",
    purchase_price: "",
    wholesale_price: "",
    wholesale_code: "",
    offer_price: "",
    stock: "",
    is_offer: false,
    category_id: "",
    size_options: [] as string[],
    color_options: [] as string[],
    quantity_pricing: Array.from({ length: 12 }, (_, i) => ({ quantity: i + 1, price: "" }))
  });
  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!data.code || !data.code.trim()) {
        throw new Error("كود المنتج مطلوب");
      }

      const quantityPricing = data.quantity_pricing
        .filter((qp: any) => qp.price && parseFloat(qp.price) > 0)
        .map((qp: any) => ({ quantity: qp.quantity, price: parseFloat(qp.price) }));

      const productData: any = {
        name: data.name,
        code: data.code.trim(),
        barcode: data.barcode?.trim() || null,
        description: data.description || null,
        price: parseFloat(data.price) || 0,
        sale_price: parseFloat(data.price) || 0,
        purchase_price: parseFloat(data.purchase_price) || 0,
        wholesale_price: data.wholesale_price ? parseFloat(data.wholesale_price) : null,
        wholesale_code: data.wholesale_code?.trim() || null,
        offer_price: data.offer_price ? parseFloat(data.offer_price) : null,
        is_offer: !!data.is_offer,
        stock: parseInt(data.stock) || 0,
        size_options: data.size_options?.length > 0 ? data.size_options : null,
        color_options: data.color_options?.length > 0 ? data.color_options : null,
        quantity_pricing: quantityPricing.length > 0 ? quantityPricing : {},
        category_id: data.category_id && data.category_id.trim() !== "" ? data.category_id : null,
      };

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(productData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(editingProduct ? "تم تحديث المنتج بنجاح" : "تم إضافة المنتج بنجاح");
      resetForm();
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "حدث خطأ");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("product_images").delete().eq("product_id", id);
      await supabase.from("product_color_variants").delete().eq("product_id", id);
      await supabase.from("order_items").update({ product_id: null }).eq("product_id", id);
      await supabase.from("analytics_events").update({ product_id: null }).eq("product_id", id);
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("تم حذف المنتج بنجاح");
    },
    onError: () => toast.error("حدث خطأ أثناء الحذف")
  });

  const resetForm = () => {
    setOpen(false);
    setFormData({
      name: "", code: "", barcode: "", description: "", price: "", purchase_price: "",
      wholesale_price: "", wholesale_code: "", offer_price: "", stock: "",
      is_offer: false, category_id: "", size_options: [], color_options: [],
      quantity_pricing: Array.from({ length: 12 }, (_, i) => ({ quantity: i + 1, price: "" }))
    });
    setEditingProduct(null);
    setNewSize(""); setNewColor("");
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    const quantityPricingData = Array.from({ length: 12 }, (_, i) => {
      const existingPrice = Array.isArray(product.quantity_pricing)
        ? product.quantity_pricing.find((qp: any) => qp.quantity === i + 1)
        : null;
      return { quantity: i + 1, price: existingPrice?.price?.toString() || "" };
    });
    setFormData({
      name: product.name,
      code: product.code || "",
      barcode: product.barcode || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      purchase_price: product.purchase_price?.toString() || "",
      wholesale_price: product.wholesale_price?.toString() || "",
      wholesale_code: product.wholesale_code || "",
      offer_price: product.offer_price?.toString() || "",
      stock: product.stock?.toString() || "",
      is_offer: !!product.is_offer,
      category_id: product.category_id || "",
      size_options: product.size_options || [],
      color_options: product.color_options || [],
      quantity_pricing: quantityPricingData
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const exportToExcel = () => {
    if (!products || products.length === 0) {
      toast.error("لا توجد منتجات للتصدير");
      return;
    }
    const rows = products.map((p: any) => ({
      "الكود": p.code || "",
      "الباركود": p.barcode || "",
      "اسم المنتج": p.name || "",
      "السعر": Number(p.price || 0),
      "سعر العرض": p.offer_price ? Number(p.offer_price) : "",
      "تكلفة المنتج": Number(p.purchase_price || 0),
      "سعر الجملة": p.wholesale_price ? Number(p.wholesale_price) : "",
      "كود الجملة": p.wholesale_code || "",
      "الكمية المتاحة": Number(p.stock || 0),
      "نشط": p.is_active ? "نعم" : "لا",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
    XLSX.writeFile(wb, `products-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("تم تصدير قائمة المنتجات");
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
      if (!rows.length) throw new Error("الملف فارغ");

      const pick = (row: any, keys: string[]) => {
        for (const k of keys) {
          const found = Object.keys(row).find(
            (x) => x.toString().trim().toLowerCase() === k.toLowerCase()
          );
          if (found && row[found] !== "" && row[found] !== null && row[found] !== undefined) return row[found];
        }
        return null;
      };

      const payload = rows
        .map((r) => {
          const name = pick(r, ["الاسم", "اسم المنتج", "name", "product name"]);
          const code = pick(r, ["رمز المنتج", "الكود", "كود", "code", "كود المنتج"]);
          const price = pick(r, ["سعر التخفيض", "السعر", "السعر الرئيسي", "price"]);
          if (!name || !code) return null;
          return {
            name: String(name).trim(),
            code: String(code).trim(),
            barcode: (pick(r, ["الباركود", "barcode"]) || null)?.toString().trim() || null,
            price: parseFloat(price) || 0,
            sale_price: parseFloat(price) || 0,
            stock: parseInt(pick(r, ["الكمية", "الكمية المتاحة", "stock", "quantity"]) || "0") || 0,
            quantity_pricing: {},
          };
        })
        .filter(Boolean);

      if (!payload.length) throw new Error("لم يتم العثور على منتجات صالحة (مطلوب: الاسم، رمز المنتج، سعر التخفيض)");

      let inserted = 0, updated = 0, failed = 0;
      for (const p of payload as any[]) {
        const { data: existing } = await supabase.from("products").select("id").eq("code", p.code).maybeSingle();
        if (existing) {
          const { error } = await supabase.from("products").update(p).eq("id", existing.id);
          if (error) failed++; else updated++;
        } else {
          const { error } = await supabase.from("products").insert(p);
          if (error) failed++; else inserted++;
        }
      }
      return { inserted, updated, failed, total: payload.length };
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`تم الاستيراد: ${r.inserted} جديد، ${r.updated} تحديث${r.failed ? `، ${r.failed} فشل` : ""}`);
    },
    onError: (e: any) => toast.error(e?.message || "فشل الاستيراد"),
  });

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) importMutation.mutate(f);
    e.target.value = "";
  };



  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 py-8">
      <div className="container mx-auto px-4">
        <Button onClick={() => navigate("/admin")} variant="ghost" className="mb-4">
          <ArrowLeft className="ml-2 h-4 w-4" /> رجوع
        </Button>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CardTitle>المنتجات</CardTitle>
              {!canEditProducts && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">مشاهدة فقط</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={exportToExcel}>
                <FileSpreadsheet className="ml-2 h-4 w-4" /> تصدير Excel
              </Button>
              {canEditProducts && (
                <>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
                  <Button variant="outline" onClick={handleImportClick} disabled={importMutation.isPending}>
                    <Upload className="ml-2 h-4 w-4" /> {importMutation.isPending ? "جاري الاستيراد..." : "استيراد Excel"}
                  </Button>
                </>
              )}
              {canEditProducts && (
                <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) resetForm(); else setOpen(isOpen); }}>
                  <DialogTrigger asChild>
                    <Button><Plus className="ml-2 h-4 w-4" /> إضافة منتج</Button>
                  </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle>{editingProduct ? "تعديل منتج" : "إضافة منتج جديد"}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">اسم المنتج *</Label>
                      <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="code">كود المنتج *</Label>
                        <Input id="code" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} required placeholder="مثلاً: P001" />
                      </div>
                      <div>
                        <Label htmlFor="barcode">الباركود</Label>
                        <Input id="barcode" value={formData.barcode} onChange={(e) => setFormData({...formData, barcode: e.target.value})} placeholder="اختياري" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">الوصف</Label>
                      <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
                    </div>

                    <div>
                      <Label htmlFor="category_id">القسم</Label>
                      <select id="category_id" value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full px-3 py-2 border border-input rounded-md bg-background">
                        <option value="">بدون قسم</option>
                        {categories?.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="price">السعر (ج.م) *</Label>
                        <Input id="price" type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
                      </div>
                      <div>
                        <Label htmlFor="stock">الكمية المتاحة *</Label>
                        <Input id="stock" type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} required />
                    </div>

                    <div>
                      <Label htmlFor="purchase_price">تكلفة المنتج (ج.م)</Label>
                      <Input id="purchase_price" type="number" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({...formData, purchase_price: e.target.value})} placeholder="للاطلاع فقط - لا تؤثر على السعر" />
                      <p className="text-xs text-muted-foreground mt-1">للعلم فقط، لا تظهر للعميل ولا تدخل في الحسابات</p>
                    </div>

                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 border rounded-md bg-muted/30">
                      <div>
                        <Label htmlFor="wholesale_price">سعر الجملة (ج.م) — اختياري</Label>
                        <Input id="wholesale_price" type="number" step="0.01" value={formData.wholesale_price} onChange={(e) => setFormData({...formData, wholesale_price: e.target.value})} placeholder="مثلاً: 150" />
                      </div>
                      <div>
                        <Label htmlFor="wholesale_code">كود الجملة — اختياري</Label>
                        <Input id="wholesale_code" value={formData.wholesale_code} onChange={(e) => setFormData({...formData, wholesale_code: e.target.value})} placeholder="مثلاً: P001-W" />
                        <p className="text-xs text-muted-foreground mt-1">لما يتكتب في الفاتورة، السعر يتحول لسعر الجملة تلقائي</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch id="is_offer" checked={formData.is_offer} onCheckedChange={(checked) => setFormData({...formData, is_offer: checked})} />
                      <Label htmlFor="is_offer">عرض خاص</Label>
                    </div>

                    {formData.is_offer && (
                      <div>
                        <Label htmlFor="offer_price">سعر العرض (ج.م)</Label>
                        <Input id="offer_price" type="number" step="0.01" value={formData.offer_price} onChange={(e) => setFormData({...formData, offer_price: e.target.value})} />
                      </div>
                    )}

                    <div>
                      <Label>المقاسات المتاحة</Label>
                      <div className="flex gap-2 mb-2">
                        <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="أدخل مقاس جديد"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault();
                              if (newSize.trim() && !formData.size_options.includes(newSize.trim())) {
                                setFormData({...formData, size_options: [...formData.size_options, newSize.trim()]}); setNewSize("");
                              }
                            }
                          }} />
                        <Button type="button" variant="outline" onClick={() => {
                          if (newSize.trim() && !formData.size_options.includes(newSize.trim())) {
                            setFormData({...formData, size_options: [...formData.size_options, newSize.trim()]}); setNewSize("");
                          }
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.size_options.map((size, idx) => (
                          <Badge key={idx} variant="secondary" className="px-3 py-1 text-sm">
                            {size}
                            <button type="button" onClick={() => setFormData({...formData, size_options: formData.size_options.filter((_, i) => i !== idx)})} className="mr-2 hover:text-destructive"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>الألوان المتاحة</Label>
                      <div className="flex gap-2 mb-2">
                        <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="أدخل لون جديد"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault();
                              if (newColor.trim() && !formData.color_options.includes(newColor.trim())) {
                                setFormData({...formData, color_options: [...formData.color_options, newColor.trim()]}); setNewColor("");
                              }
                            }
                          }} />
                        <Button type="button" variant="outline" onClick={() => {
                          if (newColor.trim() && !formData.color_options.includes(newColor.trim())) {
                            setFormData({...formData, color_options: [...formData.color_options, newColor.trim()]}); setNewColor("");
                          }
                        }}><Plus className="h-4 w-4" /></Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.color_options.map((color, idx) => (
                          <Badge key={idx} variant="outline" className="px-3 py-1 text-sm">
                            {color}
                            <button type="button" onClick={() => setFormData({...formData, color_options: formData.color_options.filter((_, i) => i !== idx)})} className="mr-2 hover:text-destructive"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>التسعير حسب الكمية (اختياري)</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-2 border rounded">
                        {formData.quantity_pricing.map((qp, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Label className="text-xs w-20">كمية {qp.quantity}:</Label>
                            <Input type="number" step="0.01" placeholder="السعر" value={qp.price}
                              onChange={(e) => {
                                const newPricing = [...formData.quantity_pricing];
                                newPricing[index].price = e.target.value;
                                setFormData({...formData, quantity_pricing: newPricing});
                              }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                      {createMutation.isPending ? "جاري الحفظ..." : (editingProduct ? "تحديث" : "إضافة")}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!products || products.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد منتجات</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {products.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <Tag className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold truncate">{product.name}</h3>
                          <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                            <div>كود: <span className="font-mono font-bold text-foreground">{product.code || "-"}</span></div>
                            {product.barcode && <div>باركود: <span className="font-mono">{product.barcode}</span></div>}
                          </div>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-primary mb-1">
                        {parseFloat((product.price ?? 0).toString()).toFixed(2)} ج.م
                      </p>
                      {product.is_offer && product.offer_price && (
                        <p className="text-sm text-destructive font-bold mb-1">
                          عرض: {parseFloat(product.offer_price.toString()).toFixed(2)} ج.م
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mb-3">الكمية: {product.stock}</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="secondary" size="sm" className="flex-1"
                          onClick={() => printProductLabel({
                            name: product.name, code: product.code || product.id.slice(0,6),
                            barcode: product.barcode, price: product.price, showPrice: true,
                          })}>
                          <Printer className="h-4 w-4 ml-1" /> ملصق
                        </Button>
                        {canEditProducts && (
                          <>
                            <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(product)}>
                              <Edit className="h-4 w-4 ml-1" /> تعديل
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(product.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Products;
