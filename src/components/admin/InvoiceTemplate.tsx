import { useEffect, useRef } from "react";

export type InvoiceLine = {
  code: string;
  name: string;
  color: string;
  size: string;
  qty: number;
  price: number;
};

export type InvoiceData = {
  invoiceNumber: string;
  date: string; // dd/mm/yyyy
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  governorate?: string;
  accountName?: string;
  pageCode?: string; // كود الصفحة (يستخدم في الباركود)
  notes: string;
  shipping: number;
  lines: InvoiceLine[];
};

interface Props {
  data: InvoiceData;
  editable?: boolean;
  onChange?: (next: InvoiceData) => void;
  onCodeBlur?: (rowIndex: number, code: string) => void;
}

const ROW_COUNT = 6;

type SocialPlatform = "facebook" | "instagram" | "tiktok";
const HEADER_LINKS: { label: string; platform: SocialPlatform }[] = [
  { label: "sheH", platform: "facebook" },
  { label: "Lina_factory_eg", platform: "facebook" },
  { label: "she_h_", platform: "tiktok" },
  { label: "she_h_eg", platform: "instagram" },
];

const SocialIcon = ({ platform }: { platform: SocialPlatform }) => {
  if (platform === "facebook") {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13" fill="#1877F2">
        <path d="M24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.99 4.388 10.954 10.125 11.854V15.47H7.078V12h3.047V9.356c0-3.007 1.792-4.668 4.533-4.668 1.312 0 2.686.234 2.686.234v2.953H15.83c-1.491 0-1.956.925-1.956 1.875V12h3.328l-.532 3.47h-2.796v8.385C19.612 22.954 24 17.99 24 12z"/>
      </svg>
    );
  }
  if (platform === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" width="13" height="13">
        <path fill="#000" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/>
      </svg>
    );
  }
  // instagram
  return (
    <svg viewBox="0 0 24 24" width="13" height="13">
      <defs>
        <radialGradient id="ig-grad" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497"/>
          <stop offset="5%" stopColor="#fdf497"/>
          <stop offset="45%" stopColor="#fd5949"/>
          <stop offset="60%" stopColor="#d6249f"/>
          <stop offset="90%" stopColor="#285AEB"/>
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-grad)"/>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="none" stroke="#fff" strokeWidth="0"/>
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="#fff"/>
    </svg>
  );
};

const POLICY_LINES = [
  "الاستبدال خلال 3 أيام بحد أقصى ولا يوجد استرجاع يرجى مراجعة الاوردر جيدا",
  "يتم دفع مصاريف الشحن في حاله الاستلام او لا و في حاله الاسترجاع العميل يتحمل الشحن",
];

export default function InvoiceTemplate({ data, editable = false, onChange, onCodeBlur }: Props) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  // في وضع التحرير نعرض بالضبط الصفوف الموجودة (يضيف/يحذف المستخدم يدوياً).
  // في وضع المعاينة/الطباعة نُكمّل حتى ROW_COUNT.
  const lines = editable
    ? [...data.lines]
    : (() => {
        const arr = [...data.lines];
        while (arr.length < ROW_COUNT) arr.push({ code: "", name: "", color: "", size: "", qty: 0, price: 0 });
        return arr;
      })();

  const subtotal = lines.reduce((s, l) => s + (l.qty || 0) * (l.price || 0), 0);
  const totalQty = lines.reduce((s, l) => s + (l.qty || 0), 0);
  const total = subtotal + (Number(data.shipping) || 0);

  const barcodeValue = (data.pageCode || data.invoiceNumber || "0").toString();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!barcodeRef.current) return;
      const JsBarcode = (await import("jsbarcode")).default;
      if (cancelled || !barcodeRef.current) return;
      try {
        JsBarcode(barcodeRef.current, barcodeValue, {
          format: "CODE128",
          height: 50,
          width: 1.4,
          fontSize: 11,
          margin: 0,
          displayValue: true,
        });
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [barcodeValue]);

  const update = (patch: Partial<InvoiceData>) => onChange?.({ ...data, ...patch });
  const updateLine = (idx: number, patch: Partial<InvoiceLine>) => {
    const next = [...lines];
    next[idx] = { ...next[idx], ...patch };
    onChange?.({ ...data, lines: next });
  };
  const addLine = () => {
    onChange?.({ ...data, lines: [...data.lines, { code: "", name: "", color: "", size: "", qty: 1, price: 0 }] });
  };
  const removeLine = (idx: number) => {
    const next = [...data.lines];
    next.splice(idx, 1);
    onChange?.({ ...data, lines: next.length ? next : [{ code: "", name: "", color: "", size: "", qty: 1, price: 0 }] });
  };

  const inputCls =
    "w-full bg-transparent outline-none text-center text-foreground placeholder:text-muted-foreground/40";

  return (
    <div
      id="invoice-print"
      dir="rtl"
      className="invoice-sheet bg-white text-black mx-auto border border-black flex flex-col"
      style={{ width: "148mm", height: "210mm", padding: "4mm", fontFamily: "Tahoma, Arial, sans-serif" }}
    >
      {/* Header social bar */}
      <div className="grid grid-cols-4 border border-black text-[11px] font-bold">
        {HEADER_LINKS.map((l, i) => (
          <div key={i} className={`flex items-center justify-center gap-1 py-1 ${i < 3 ? "border-l border-black" : ""}`}>
            <SocialIcon platform={l.platform} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Invoice no / date + Barcode */}
      <div className="grid grid-cols-[1fr_110px] border-x border-b border-black">
        <div>
          <div className="grid grid-cols-[70px_1fr_70px_1fr] items-stretch border-b border-black">
            <div className="border-l border-black p-1 text-center font-bold text-[12px]">فاتورة</div>
            <div className="border-l border-black p-1">
              {editable ? (
                <input className={inputCls} value={data.invoiceNumber} onChange={(e) => update({ invoiceNumber: e.target.value })} placeholder="تلقائي" />
              ) : (
                <div className="text-center">{data.invoiceNumber || "0"}</div>
              )}
            </div>
            <div className="border-l border-black p-1 text-center font-bold text-[12px]">التاريخ</div>
            <div className="p-1">
              {editable ? (
                <input className={inputCls} value={data.date} onChange={(e) => update({ date: e.target.value })} />
              ) : (
                <div className="text-center">{data.date}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr_90px_1fr] border-b border-black">
            <div className="border-l border-black p-1 text-center font-bold text-[12px]">اسم المستلم</div>
            <div className="border-l border-black p-1">
              {editable ? (
                <input className={inputCls} value={data.customerName} onChange={(e) => update({ customerName: e.target.value })} />
              ) : (
                <div className="text-center">{data.customerName}</div>
              )}
            </div>
            <div className="border-l border-black p-1 text-center font-bold text-[12px]">رقم التليفون</div>
            <div className="p-1">
              {editable ? (
                <input className={inputCls} value={data.customerPhone} onChange={(e) => update({ customerPhone: e.target.value })} />
              ) : (
                <div className="text-center">{data.customerPhone}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr_80px_1fr] border-b border-black">
            <div className="border-l border-black p-1 text-center font-bold text-[12px]">المحافظة</div>
            <div className="border-l border-black p-1">
              {editable ? (
                <input className={inputCls} value={data.governorate || ""} onChange={(e) => update({ governorate: e.target.value })} />
              ) : (
                <div className="text-center">{data.governorate || ""}</div>
              )}
            </div>
            <div className="border-l border-black p-1 text-center font-bold text-[12px]">كود الصفحة</div>
            <div className="p-1">
              {editable ? (
                <input className={inputCls} value={data.pageCode || ""} onChange={(e) => update({ pageCode: e.target.value })} placeholder="(اختياري)" />
              ) : (
                <div className="text-center">{data.pageCode || ""}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr] border-b border-black">
            <div className="border-l border-black p-1 text-center font-bold text-[12px]">اسم الحساب</div>
            <div className="p-1">
              {editable ? (
                <input className={inputCls} value={data.accountName || ""} onChange={(e) => update({ accountName: e.target.value })} placeholder="(اختياري)" />
              ) : (
                <div className="text-center">{data.accountName || ""}</div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-[80px_1fr] min-h-[40px]">
            <div className="border-l border-black p-1 text-center font-bold text-[12px] flex items-center justify-center">
              عنوان :
            </div>
            <div className="p-1">
              {editable ? (
                <textarea className={`${inputCls} resize-none h-full min-h-[36px]`} value={data.customerAddress} onChange={(e) => update({ customerAddress: e.target.value })} />
              ) : (
                <div className="text-center">{data.customerAddress}</div>
              )}
            </div>
          </div>
        </div>
        <div className="border-r border-black flex items-center justify-center p-1">
          <svg ref={barcodeRef} style={{ width: "100%", height: "100%" }} />
        </div>
      </div>

      {/* Items table — grows to fill remaining vertical space */}
      <table className="w-full border-collapse text-[11px] mt-0 flex-1" style={{ height: "1px" }}>
        <thead>
          <tr className="font-bold text-center">
            <th className="border border-black p-1 w-[40px]">كود</th>
            <th className="border border-black p-1 w-[42px]">مقاس</th>
            <th className="border border-black p-1 w-[36px]">عدد</th>
            <th className="border border-black p-1 w-[44px]">اللون</th>
            <th className="border border-black p-1">بيان</th>
            <th className="border border-black p-1 w-[70px]">المجموع</th>
            {editable && <th className="border border-black p-1 w-[44px] no-print">⚙</th>}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, idx) => {
            const lineTotal = (line.qty || 0) * (line.price || 0);
            return (
              <tr key={idx} className="text-center">
                <td className="border border-black p-0.5">
                  {editable ? (
                    <input
                      className={inputCls}
                      value={line.code}
                      onChange={(e) => updateLine(idx, { code: e.target.value })}
                      onBlur={(e) => onCodeBlur?.(idx, e.target.value.trim())}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                    />
                  ) : (line.code || "0")}
                </td>
                <td className="border border-black p-0.5">
                  {editable ? (
                    <input className={inputCls} value={line.size} onChange={(e) => updateLine(idx, { size: e.target.value })} />
                  ) : (line.size || "0")}
                </td>
                <td className="border border-black p-0.5">
                  {editable ? (
                    <input type="number" className={inputCls} value={line.qty || ""} onChange={(e) => updateLine(idx, { qty: parseInt(e.target.value) || 0 })} />
                  ) : (line.qty || 0)}
                </td>
                <td className="border border-black p-0.5">
                  {editable ? (
                    <input className={inputCls} value={line.color} onChange={(e) => updateLine(idx, { color: e.target.value })} />
                  ) : (line.color || ".")}
                </td>
                <td className="border border-black p-0.5 text-right">
                  {editable ? (
                    <input className={`${inputCls} text-right`} value={line.name} onChange={(e) => updateLine(idx, { name: e.target.value })} />
                  ) : (line.name)}
                </td>
                <td className="border border-black p-0.5 font-semibold">
                  {line.qty > 0 ? lineTotal.toFixed(0) : ""}
                </td>
                {editable && (
                  <td className="border border-black p-0.5 no-print">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => removeLine(idx)}
                        className="w-5 h-5 rounded bg-red-500 text-white text-xs leading-none hover:bg-red-600"
                        title="حذف الصف"
                      >−</button>
                      {idx === lines.length - 1 && (
                        <button
                          type="button"
                          onClick={addLine}
                          className="w-5 h-5 rounded bg-green-600 text-white text-xs leading-none hover:bg-green-700"
                          title="إضافة صف"
                        >+</button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot className="text-[11px]">
          <tr>
            <td className="border border-black p-1 text-center font-bold" colSpan={2}>عدد القطع</td>
            <td className="border border-black p-1 text-center font-bold" colSpan={2}>{totalQty}</td>
            <td className="border border-black p-1 text-center font-bold">المجموع</td>
            <td className="border border-black p-1 text-center font-bold">{subtotal.toFixed(0)}</td>
            {editable && <td className="border border-black no-print"></td>}
          </tr>
          <tr>
            <td className="border border-black p-1" colSpan={4}></td>
            <td className="border border-black p-1 text-center font-bold">شحن</td>
            <td className="border border-black p-1 text-center font-bold">
              {editable ? (
                <input type="number" className={`${inputCls} font-bold`} value={data.shipping || ""} onChange={(e) => update({ shipping: parseFloat(e.target.value) || 0 })} placeholder="0" />
              ) : ((data.shipping || 0).toFixed(0))}
            </td>
            {editable && <td className="border border-black no-print"></td>}
          </tr>
          <tr>
            <td className="border border-black p-1 text-center font-bold text-[13px]" colSpan={5}>الاجمالى</td>
            <td className="border border-black p-1 text-center font-bold text-[13px]">{total.toFixed(0)}</td>
            {editable && <td className="border border-black no-print"></td>}
          </tr>
        </tfoot>
      </table>


      {/* Notes */}
      <div className="grid grid-cols-[80px_1fr] border-x border-b border-black text-[11px]">
        <div className="border-l border-black p-1 text-center font-bold">ملاحظات</div>
        <div className="p-1 min-h-[24px] text-center">
          {editable ? (
            <input className={inputCls} value={data.notes} onChange={(e) => update({ notes: e.target.value })} />
          ) : (data.notes)}
        </div>
      </div>
      <div className="border-x border-b border-black p-1 text-center text-[11px] font-semibold">
        {POLICY_LINES[0]}
      </div>
      <div className="grid grid-cols-[80px_1fr] border-x border-b border-black text-[11px]">
        <div className="border-l border-black p-1 text-center font-bold">سياسه الشحن</div>
        <div className="p-1 text-center">{POLICY_LINES[1]}</div>
      </div>
    </div>
  );
}
