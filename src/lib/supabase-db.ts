import { getSupabaseAdmin, isSupabaseAdminConfigured } from "@/lib/supabase-admin";
import { slugify } from "@/lib/slug";

type DefaultCompany = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  brand_primary_color: string | null;
  brand_tone: string | null;
  brand_pitch: string | null;
  created_at: string;
};

type DefaultCompanyCache = { value: DefaultCompany | null; exp: number };

let defaultCompanyCache: DefaultCompanyCache | null = null;
const DEFAULT_COMPANY_TTL_MS = 60_000;

export function getDbOrThrow() {
  if (!isSupabaseAdminConfigured()) {
    throw new Error("Supabase is not configured (missing URL or service role key)");
  }
  const db = getSupabaseAdmin();
  if (!db) throw new Error("Could not create Supabase admin client");
  return db;
}

export async function getOrCreateDefaultCompany() {
  const now = Date.now();
  if (defaultCompanyCache && defaultCompanyCache.exp > now && defaultCompanyCache.value) {
    return defaultCompanyCache.value;
  }

  const db = getDbOrThrow();

  const { data: existing } = await db
    .from("companies")
    .select("id,name,slug,website,brand_primary_color,brand_tone,brand_pitch,created_at")
    .order("created_at", { ascending: true })
    .limit(1);

  if (existing?.[0]) {
    const company = existing[0] as DefaultCompany;
    defaultCompanyCache = { value: company, exp: now + DEFAULT_COMPANY_TTL_MS };
    return company;
  }

  const name = "My Company";
  const baseSlug = slugify(name) || "bedrijf";
  const slug = await uniqueCompanySlug(baseSlug);

  const { data, error } = await db
    .from("companies")
    .insert({
      name,
      slug,
    })
    .select("id,name,slug,website,brand_primary_color,brand_tone,brand_pitch,created_at")
    .single();

  if (error) throw error;
  const created = data as DefaultCompany;
  defaultCompanyCache = { value: created, exp: now + DEFAULT_COMPANY_TTL_MS };
  return created;

  async function uniqueCompanySlug(s: string) {
    let candidate = s;
    for (let i = 0; i < 50; i++) {
      const { data: found } = await db
        .from("companies")
        .select("id")
        .eq("slug", candidate)
        .limit(1);
      if (!found?.length) return candidate;
      candidate = `${s}-${i + 2}`;
    }
    return `${s}-${Date.now()}`;
  }
}

