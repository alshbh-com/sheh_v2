// Print one or many orders using the same invoice layout as InvoiceTemplate.tsx
import { supabase } from "@/integrations/supabase/client";

type OrderLike = any;

const FB_SVG = `<svg viewBox="0 0 24 24" width="13" height="13" fill="#1877F2"><path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z"/></svg>`;
const TT_SVG = `<svg viewBox="0 0 24 24" width="13" height="13"><path fill="#000" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>`;
const IG_SVG = `<svg viewBox="0 0 24 24" width="13" height="13"><defs><radialGradient id="ig-grad-p" cx="30%" cy="107%" r="150%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad-p)"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/></svg>`;

const HEADER_LINKS: { label: string; icon: string }[] = [
  { label: "sheH", icon: FB_SVG },
  { label: "Lina_factory_eg", icon: FB_SVG },
  { label: "she_h_", icon: TT_SVG },
  { label: "she_h_eg", icon: IG_SVG },
];

const POLICY_LINES = [
  "الاستبدال خلال 3 أيام بحد أقصى ولا يوجد استرجاع يرجى مراجعة الاوردر جيدا",
  "يتم دفع مصاريف الشحن في حاله الاستلام او لا و في حاله الاسترجاع العميل يتحمل الشحن",
];

const ROW_COUNT = 6;

const esc = (s: any) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

const formatDate = (iso?: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
};

const extractItems = (order: OrderLike) => {
  const items = order.order_items || [];
  return items.map((it: any) => {
    let name = it.products?.name || it.product_name || "";
    let color = it.color || "";
    let size = it.size || "";
    let code = it.product_code || it.products?.code || "";
    if ((!name || !color || !size) && it.product_details) {
      try {
        const d = typeof it.product_details === "string" ? JSON.parse(it.product_details) : it.product_details;
        name = name || d?.name || d?.product_name || "";
        color = color || d?.color || "";
        size = size || d?.size || "";
        code = code || d?.code || "";
      } catch {}
    }
    const qty = Number(it.quantity || 1);
    const price = Number(it.price || it.unit_price || 0);
    return { code, name, color, size, qty, price };
  });
};

const buildBarcodeSvg = async (value: string) => {
  const JsBarcode = (await import("jsbarcode")).default;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, value || "0", { format: "CODE128", height: 50, width: 1.4, fontSize: 11, margin: 0, displayValue: true });
  } catch {}
  return new XMLSerializer().serializeToString(svg);
};

const buildInvoice = async (order: OrderLike) => {
  const invoiceNumber = order.invoice_number || order.order_number || order.id.slice(0, 8);
  const date = formatDate(order.created_at);
  const customerName = order.customers?.name || order.customer_name || "";
  const customerPhone = order.customers?.phone || order.customer_phone || "";
  const customerAddress = order.customers?.address || order.customer_address || "";
  const governorate = order.governorate || order.customers?.governorate || "";
  const accountName = order.account_name || "";
  const pageCode = order.manual_code || "";
  const notes = order.notes || "";
  const shipping = Number(order.shipping_cost || 0);

  const items = extractItems(order);
  const lines = [...items];
  while (lines.length < ROW_COUNT) lines.push({ code: "", name: "", color: "", size: "", qty: 0, price: 0 });

  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0);
  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const total = subtotal + shipping;

  const barcodeValue = pageCode || order.tracking_code || String(invoiceNumber);
  const barcodeSvg = await buildBarcodeSvg(barcodeValue);

  const headerCells = HEADER_LINKS.map((l, i) => `
    <div style="display:flex;align-items:center;justify-content:center;gap:4px;padding:2px;${i < 3 ? "border-left:1px solid #000;" : ""}">
      <span style="display:inline-flex;align-items:center;justify-content:center;">${l.icon}</span>
      <span style="font-size:10px;font-weight:bold;">${esc(l.label)}</span>
    </div>`).join("");

  const rowsHtml = lines.map((line) => {
    const lt = (line.qty || 0) * (line.price || 0);
    return `<tr style="text-align:center;">
      <td style="border:1px solid #000;padding:2px;">${esc(line.code || "")}</td>
      <td style="border:1px solid #000;padding:2px;">${esc(line.size || "")}</td>
      <td style="border:1px solid #000;padding:2px;">${line.qty || ""}</td>
      <td style="border:1px solid #000;padding:2px;">${esc(line.color || "")}</td>
      <td style="border:1px solid #000;padding:2px;text-align:right;">${esc(line.name || "")}</td>
      <td style="border:1px solid #000;padding:2px;font-weight:600;">${line.qty > 0 ? lt.toFixed(0) : ""}</td>
    </tr>`;
  }).join("");

  return `
  <div class="invoice-sheet" dir="rtl">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;border:1px solid #000;">
      ${headerCells}
    </div>

    <div style="display:grid;grid-template-columns:1fr 110px;border:1px solid #000;border-top:0;">
      <div>
        <div style="display:grid;grid-template-columns:70px 1fr 70px 1fr;border-bottom:1px solid #000;">
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;">فاتورة</div>
          <div style="border-left:1px solid #000;padding:3px;text-align:center;">${esc(invoiceNumber)}</div>
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;">التاريخ</div>
          <div style="padding:3px;text-align:center;">${esc(date)}</div>
        </div>
        <div style="display:grid;grid-template-columns:80px 1fr 90px 1fr;border-bottom:1px solid #000;">
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;">اسم المستلم</div>
          <div style="border-left:1px solid #000;padding:3px;text-align:center;">${esc(customerName)}</div>
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;">رقم التليفون</div>
          <div style="padding:3px;text-align:center;">${esc(customerPhone)}</div>
        </div>
        <div style="display:grid;grid-template-columns:80px 1fr 80px 1fr;border-bottom:1px solid #000;">
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;">المحافظة</div>
          <div style="border-left:1px solid #000;padding:3px;text-align:center;">${esc(governorate)}</div>
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;">كود الصفحة</div>
          <div style="padding:3px;text-align:center;">${esc(pageCode)}</div>
        </div>
        <div style="display:grid;grid-template-columns:80px 1fr;border-bottom:1px solid #000;">
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;">اسم الحساب</div>
          <div style="padding:3px;text-align:center;">${esc(accountName)}</div>
        </div>
        <div style="display:grid;grid-template-columns:80px 1fr;min-height:36px;">
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;display:flex;align-items:center;justify-content:center;">عنوان :</div>
          <div style="padding:3px;text-align:center;">${esc(customerAddress)}</div>
        </div>
      </div>
      <div style="border-right:1px solid #000;display:flex;align-items:center;justify-content:center;padding:3px;">
        <div style="width:100%;">${barcodeSvg}</div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:11px;flex:1;height:1px;">
      <thead>
        <tr style="text-align:center;font-weight:bold;">
          <th style="border:1px solid #000;padding:3px;width:40px;">كود</th>
          <th style="border:1px solid #000;padding:3px;width:42px;">مقاس</th>
          <th style="border:1px solid #000;padding:3px;width:36px;">عدد</th>
          <th style="border:1px solid #000;padding:3px;width:44px;">اللون</th>
          <th style="border:1px solid #000;padding:3px;">بيان</th>
          <th style="border:1px solid #000;padding:3px;width:70px;">المجموع</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
      <tfoot>
        <tr style="text-align:center;font-weight:bold;">
          <td style="border:1px solid #000;padding:3px;" colspan="2">عدد القطع</td>
          <td style="border:1px solid #000;padding:3px;" colspan="2">${totalQty}</td>
          <td style="border:1px solid #000;padding:3px;">المجموع</td>
          <td style="border:1px solid #000;padding:3px;">${subtotal.toFixed(0)}</td>
        </tr>
        <tr style="text-align:center;font-weight:bold;">
          <td style="border:1px solid #000;padding:3px;" colspan="4"></td>
          <td style="border:1px solid #000;padding:3px;">شحن</td>
          <td style="border:1px solid #000;padding:3px;">${shipping.toFixed(0)}</td>
        </tr>
        <tr style="text-align:center;font-weight:bold;font-size:13px;">
          <td style="border:1px solid #000;padding:3px;" colspan="5">الاجمالى</td>
          <td style="border:1px solid #000;padding:3px;">${total.toFixed(0)}</td>
        </tr>
      </tfoot>
    </table>

    <div style="display:grid;grid-template-columns:80px 1fr;border:1px solid #000;border-top:0;font-size:11px;">
      <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;">ملاحظات</div>
      <div style="padding:3px;text-align:center;min-height:22px;">${esc(notes)}</div>
    </div>
    <div style="border:1px solid #000;border-top:0;padding:3px;text-align:center;font-size:11px;font-weight:600;">
      ${esc(POLICY_LINES[0])}
    </div>
    <div style="display:grid;grid-template-columns:80px 1fr;border:1px solid #000;border-top:0;font-size:11px;">
      <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;">سياسه الشحن</div>
      <div style="padding:3px;text-align:center;">${esc(POLICY_LINES[1])}</div>
    </div>
  </div>`;
};

export const printInvoiceTemplate = async (
  orders: OrderLike[],
  opts?: { markPrinted?: boolean; copies?: number }
) => {
  if (!orders?.length) return;
  // الافتراضي: نسختين لكل أوردر — نسخة يمين ونسخة شمال على ورقة A4 أفقي
  const copies = Math.max(1, opts?.copies || 2);

  const built = await Promise.all(orders.map(buildInvoice));

  // كل أوردر = صفحة A4 أفقي بها (copies) نسخ بجانب بعضها
  const sheets = built
    .map((html) => {
      const cells = Array.from({ length: copies }, () => `<div class="cell">${html}</div>`).join("");
      return `<div class="sheet copies-${copies}">${cells}</div>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"><title>طباعة الفواتير</title>
<style>
  @page { size: A4 landscape; margin: 4mm; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#000}
  body{font-family:Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .sheet{
    width:100%;
    display:grid;
    gap:4mm;
    page-break-after:always;
  }
  .sheet:last-child{page-break-after:auto;}
  .sheet.copies-1{grid-template-columns:1fr;}
  .sheet.copies-2{grid-template-columns:1fr 1fr;}
  .sheet.copies-3{grid-template-columns:1fr 1fr 1fr;}
  .cell{ width:100%; }
  .invoice-sheet{width:100%;background:#fff;color:#000;}
</style>
</head><body>
${sheets}
<script>setTimeout(()=>{window.print();},300);</script>
</body></html>`;

  const w = window.open("", "_blank", "width=1200,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();

  if (opts?.markPrinted) {
    const ids = orders.map((o) => o.id);
    await supabase.from("orders").update({ is_printed: true } as any).in("id", ids);
  }
};

