import { getSupabaseClient } from "@/lib/supabase";

export async function getAccessToken() {
  const supabase = getSupabaseClient();
  if (!supabase) return "";
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export async function withAuth(init?: RequestInit): Promise<RequestInit> {
  const token = await getAccessToken();
  const headers = new Headers(init?.headers ?? {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return { ...(init ?? {}), headers };
}

