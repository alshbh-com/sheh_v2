import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_SELECT = "id, code, barcode, name, price, sale_price, color, size, stock, quantity, wholesale_price, wholesale_code, description, purchase_price, offer_price, is_offer, is_active, category_id, size_options, color_options, quantity_pricing, created_at";

export const normalizeProductLookup = (value: string | number | null | undefined) =>
  String(value ?? "")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .trim()
    .toLowerCase();

type FetchProductsOptions = {
  activeOnly?: boolean;
  select?: string;
  orderBy?: string;
  ascending?: boolean;
};

export const fetchProductsPaged = async ({
  activeOnly = false,
  select = PRODUCT_SELECT,
  orderBy = "created_at",
  ascending = false,
}: FetchProductsOptions = {}) => {
  const pageSize = 1000;
  const all: any[] = [];

  for (let from = 0; ; from += pageSize) {
    let query = supabase
      .from("products")
      .select(select)
      .order(orderBy, { ascending })
      .range(from, from + pageSize - 1);

    if (activeOnly) query = query.eq("is_active", true);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }

  return all;
};

export const findProductByCode = async (raw: string, select = PRODUCT_SELECT) => {
  const value = normalizeProductLookup(raw);
  if (!value) return null;

  const fields = ["wholesale_code", "code", "barcode"];
  for (const field of fields) {
    const { data, error } = await supabase
      .from("products")
      .select(select)
      .eq(field, value)
      .limit(1);
    if (error) throw error;
    if (data?.[0]) return { product: data[0], matchedField: field };
  }

  return null;
};