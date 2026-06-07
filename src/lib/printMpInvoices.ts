import { supabase } from "@/integrations/supabase/client";
import invoiceLogo from "@/assets/invoice-logo.jpg";

interface OrderLike {
  id: string;
  order_number: number | null;
  manual_code?: string | null;
  tracking_code: string | null;
  barcode_value?: string | null;
  total_amount: number | string;
  shipping_cost?: number | string | null;
  notes?: string | null;
  order_details?: string | null;
  account_name?: string | null;
  customers?: { name?: string | null; phone?: string | null; phone2?: string | null; address?: string | null; governorate?: string | null } | null;
  governorates?: { name?: string | null } | null;
  order_items?: Array<{ quantity?: number | null; price?: number | string | null; size?: string | null; color?: string | null; product_details?: any; products?: { name?: string | null } | null }> | null;
}

const buildHtml = (body: string) => `<!DOCTYPE html>
<html dir="rtl"><head><meta charset="utf-8"><title>طباعة الفواتير</title>
<style>
  @page { size: A4 landscape; margin: 6mm; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#fff;color:#000}
  body { font-family: "Cairo","Tajawal","Arial",sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .sheet {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6mm;
    page-break-after: always;
  }
  .sheet:last-child { page-break-after: auto; }
  .invoice {
    border: 2px solid #000;
    border-radius: 14mm 14mm 6mm 6mm;
    padding: 5mm 6mm 6mm 6mm;
    height: 192mm;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    position: relative;
    background:#fff;
  }
  .header {
    display: flex;
    flex-direction: row-reverse;
    align-items: center;
    justify-content: space-between;
    gap: 4mm;
    margin-bottom: 3mm;
    padding-bottom: 3mm;
    border-bottom: 1.5px dashed #000;
  }
  .logo-wrap {
    flex: 0 0 auto;
    text-align: right;
    padding-right: 2mm;
  }
  .logo-wrap img {
    max-height: 24mm;
    max-width: 45mm;
    object-fit: contain;
  }
  .barcode-wrap {
    flex: 1 1 auto;
    text-align: center;
  }
  .barcode-wrap svg { max-width: 100%; height: 20mm; }
  .code-text { font-size: 11px; margin-top: 1mm; letter-spacing: 1px; font-weight: 600; }
  .total {
    font-size: 18px;
    font-weight: 800;
    text-align:center;
    border: 2px solid #000;
    padding: 3mm;
    border-radius: 2mm;
    margin-top: 2mm;
  }
  .details {
    font-size: 21px;
    line-height: 1.9;
    text-align: center;
    padding: 4mm 2mm;
    white-space: pre-wrap;
    word-break: break-word;
    flex: 1;
  }
</style></head><body>${body}
<script>window.onload=()=>{setTimeout(()=>window.print(),400)};</script>
</body></html>`;

const toDataUrl = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const normalizeStoredOrderDetails = (raw?: string | null): string | null => {
  const value = (raw || "").replace(/\r\n/g, "\n");
  if (!value.trim()) return null;

  try {
    const parsed = JSON.parse(value);

    if (typeof parsed === "string") {
      const parsedText = parsed.replace(/\r\n/g, "\n");
      return parsedText.trim() ? parsedText.trim() : null;
    }

    return null;
  } catch {
    return value.trim();
  }
};

const buildLegacyDetails = (o: OrderLike) => {
  const lines: string[] = [];
  const c = o.customers || {};

  if (c.name) lines.push(c.name);
  if (c.phone) lines.push(c.phone + (c.phone2 ? " / " + c.phone2 : ""));

  const gov = o.governorates?.name || c.governorate;
  if (gov) lines.push(gov);
  if (c.address) lines.push(c.address);
  if (o.account_name) lines.push(o.account_name);

  (o.order_items || []).forEach((it) => {
    let name = it.products?.name || "";
    let size = it.size || "";
    let color = it.color || "";

    if (!name && it.product_details) {
      try {
        const d = typeof it.product_details === "string" ? JSON.parse(it.product_details) : it.product_details;
        const arr = Array.isArray(d) ? d : [d];
        arr.forEach((p: any) => {
          const parts = [p?.name, p?.size, p?.color, p?.quantity ? `× ${p.quantity}` : null].filter(Boolean);
          if (parts.length) lines.push(parts.join(" - "));
        });
        return;
      } catch {
        if (typeof it.product_details === "string") name = it.product_details;
      }
    }

    const parts = [name, size, color, it.quantity ? `× ${it.quantity}` : null].filter(Boolean);
    if (parts.length) lines.push(parts.join(" - "));
  });

  if (o.notes) lines.push(o.notes);

  return lines.join("\n").trim();
};

const buildInvoice = (o: OrderLike, logoSrc: string, barcodeSvg: string, code: string) => {
  const total =
    parseFloat(String(o.total_amount || 0)) +
    parseFloat(String(o.shipping_cost || 0));

  const storedDetails = normalizeStoredOrderDetails(o.order_details);
  const details = storedDetails ?? buildLegacyDetails(o);
  const detailsHtml = details
    ? `<div class="details">${escapeHtml(details).replace(/\n/g, "<br/>")}</div>`
    : "";

  return `
    <div class="invoice">
      <div class="header">
        <div class="logo-wrap"><img src="${logoSrc}" alt="logo" /></div>
        <div class="barcode-wrap">
          ${barcodeSvg}
          <div class="code-text">${code}</div>
        </div>
      </div>

      ${detailsHtml}

      <div class="total">الإجمالي: ${total.toFixed(2)} ج.م</div>
    </div>`;
};

export const printMpInvoices = async (
  orders: OrderLike[],
  opts?: { markPrinted?: boolean }
) => {
  if (!orders?.length) return;
  const JsBarcode = (await import("jsbarcode")).default;
  const logoSrc = await toDataUrl(invoiceLogo);

  const cells = orders.map((o) => {
    const code =
      o.manual_code ||
      o.tracking_code ||
      o.barcode_value ||
      (o.order_number ? `ORD-${o.order_number}` : o.id.slice(0, 8));
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    try {
      JsBarcode(svg, code, {
        format: "CODE128",
        height: 60,
        fontSize: 14,
        displayValue: false,
        margin: 2,
      });
    } catch {}
    const barcodeSvg = new XMLSerializer().serializeToString(svg);
    return buildInvoice(o, logoSrc, barcodeSvg, code);
  });

  // Each order: 2 copies side by side on the same sheet
  const sheets = cells.map((cell) => `<div class="sheet">${cell}${cell}</div>`);

  const w = window.open("", "_blank", "width=1000,height=800");
  if (!w) return;
  w.document.write(buildHtml(sheets.join("")));
  w.document.close();

  if (opts?.markPrinted) {
    const ids = orders.map((o) => o.id);
    await supabase
      .from("orders")
      .update({ is_printed: true, printed_at: new Date().toISOString() } as any)
      .in("id", ids);
  }
};
