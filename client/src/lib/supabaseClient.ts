/**
 * Lightweight Zero-Dependency Supabase Client + Fallback Resolver
 * Matches the official @supabase/supabase-js API for .rpc() and .from()
 */
export function createClient(supabaseUrl?: string, supabaseKey?: string) {
  const url = (supabaseUrl || "").replace(/\/$/, "");
  const key = supabaseKey || "";

  return {
    rpc: async (functionName: string, params: Record<string, any> = {}) => {
      try {
        if (!url || !key) {
          return { data: null, error: new Error("Missing Supabase URL or Anon Key") };
        }
        const res = await fetch(`${url}/rest/v1/rpc/${functionName}`, {
          method: "POST",
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(params),
        });
        if (!res.ok) {
          const errText = await res.text();
          return { data: null, error: new Error(errText) };
        }
        const data = await res.json();
        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err };
      }
    },
    from: (table: string) => ({
      insert: async (records: any) => {
        try {
          if (!url || !key) {
            return { data: null, error: new Error("Missing Supabase credentials") };
          }
          const res = await fetch(`${url}/rest/v1/${table}`, {
            method: "POST",
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              Prefer: "resolution=merge-duplicates,return=representation",
            },
            body: JSON.stringify(records),
          });
          if (!res.ok) {
            return { data: null, error: new Error(await res.text()) };
          }
          const data = await res.json().catch(() => null);
          return { data, error: null };
        } catch (err: any) {
          return { data: null, error: err };
        }
      },
      select: (columns: string = "*") => ({
        limit: async (count: number) => {
          try {
            if (!url || !key) return { data: [], error: null };
            const res = await fetch(`${url}/rest/v1/${table}?select=${columns}&limit=${count}`, {
              headers: { apikey: key, Authorization: `Bearer ${key}` },
            });
            const data = await res.json().catch(() => []);
            return { data, error: null };
          } catch (err: any) {
            return { data: [], error: err };
          }
        },
      }),
    }),
  };
}

export default { createClient };
