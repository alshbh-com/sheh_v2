// Print a single product label (50x30mm) with name, code, barcode and optional price
export function printProductLabel(p: {
  name: string;
  code: string;
  barcode?: string | null;
  price?: number | null;
  showPrice?: boolean;
}) {
  const code = (p.barcode || p.code || "").toString();
  const html = `<!doctype html>
<html dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>ملصق منتج</title>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.1/dist/JsBarcode.all.min.js"></script>
  <style>
    @page { size: 50mm 30mm; margin: 0; }
    body { margin: 0; padding: 0; font-family: Tahoma, Arial, sans-serif; }
    .label { width: 50mm; height: 30mm; box-sizing: border-box; padding: 1.2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .name { font-size: 9pt; font-weight: bold; line-height: 1.1; max-height: 7mm; overflow: hidden; }
    .code { font-size: 7pt; color: #333; }
    .price { font-size: 9pt; font-weight: bold; margin-top: 1mm; }
    svg { width: 100%; height: 12mm; }
  </style>
</head>
<body>
  <div class="label">
    <div class="name">${escapeHtml(p.name || "")}</div>
    <div class="code">كود: ${escapeHtml(p.code || "")}</div>
    <svg id="barcode"></svg>
    ${p.showPrice && p.price ? `<div class="price">${Number(p.price).toFixed(0)} ج.م</div>` : ""}
  </div>
  <script>
    try {
      JsBarcode("#barcode", ${JSON.stringify(code)}, {
        format: "CODE128", displayValue: true, fontSize: 10, height: 30, margin: 0
      });
    } catch(e) { document.getElementById('barcode').outerHTML = '<div style="font-size:7pt">' + ${JSON.stringify(code)} + '</div>'; }
    setTimeout(() => { window.print(); setTimeout(() => window.close(), 300); }, 250);
  </script>
</body>
</html>`;
  const w = window.open("", "_blank", "width=400,height=300");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
