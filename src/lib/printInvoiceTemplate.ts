// Print one or many orders using the same invoice layout as InvoiceTemplate.tsx
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

type OrderLike = any;

const HEADER_LINKS = [
  { label: "sheH", icon: "f" },
  { label: "Lina_factory_eg", icon: "f" },
  { label: "she_h_", icon: "♪" },
  { label: "she_h_eg", icon: "◎" },
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

const buildInvoice = async (order: OrderLike) => {
  const invoiceNumber = order.manual_code || order.order_number || order.id.slice(0, 8);
  const date = formatDate(order.created_at);
  const customerName = order.customers?.name || order.customer_name || "";
  const customerPhone = order.customers?.phone || order.customer_phone || "";
  const customerAddress = order.customers?.address || order.customer_address || "";
  const notes = order.notes || "";
  const shipping = Number(order.shipping_cost || 0);

  const items = extractItems(order);
  const lines = [...items];
  while (lines.length < ROW_COUNT) lines.push({ code: "", name: "", color: "", size: "", qty: 0, price: 0 });

  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0);
  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const total = subtotal + shipping;

  let qrDataUrl = "";
  try { qrDataUrl = await QRCode.toDataURL(String(invoiceNumber), { width: 90, margin: 0 }); } catch {}

  const headerCells = HEADER_LINKS.map((l, i) => `
    <div style="display:flex;align-items:center;justify-content:center;gap:3px;padding:2px;${i < 3 ? "border-left:1px solid #000;" : ""}">
      <span style="display:inline-flex;width:14px;height:14px;align-items:center;justify-content:center;background:#000;color:#fff;font-size:9px;border-radius:2px;">${esc(l.icon)}</span>
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

    <div style="display:grid;grid-template-columns:1fr 90px;border:1px solid #000;border-top:0;">
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
        <div style="display:grid;grid-template-columns:80px 1fr;min-height:40px;">
          <div style="border-left:1px solid #000;padding:3px;text-align:center;font-weight:bold;font-size:11px;display:flex;align-items:center;justify-content:center;">عنوان :</div>
          <div style="padding:3px;text-align:center;">${esc(customerAddress)}</div>
        </div>
      </div>
      <div style="border-right:1px solid #000;display:flex;align-items:center;justify-content:center;padding:2px;">
        ${qrDataUrl ? `<img src="${qrDataUrl}" style="width:80px;height:80px;" />` : ""}
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;font-size:11px;">
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
  const copies = Math.max(1, opts?.copies || 1);

  const built = await Promise.all(orders.map(buildInvoice));
  // duplicate per copies
  const allSheets: string[] = [];
  built.forEach((html) => {
    for (let i = 0; i < copies; i++) allSheets.push(html);
  });

  const html = `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"><title>طباعة الفواتير</title>
<style>
  @page { size: A5 portrait; margin: 4mm; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#000}
  body{font-family:Tahoma,Arial,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .invoice-sheet{width:100%;page-break-after:always;background:#fff;color:#000;}
  .invoice-sheet:last-child{page-break-after:auto;}
</style>
</head><body>
${allSheets.join("")}
<script>setTimeout(()=>{window.print();},300);</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=900");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();

  if (opts?.markPrinted) {
    const ids = orders.map((o) => o.id);
    await supabase.from("orders").update({ is_printed: true } as any).in("id", ids);
  }
};
