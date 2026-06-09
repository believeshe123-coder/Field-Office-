const SUPABASE_CONFIG_KEYS = {
  url: "NEXT_PUBLIC_SUPABASE_URL",
  key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
};

export function readSupabaseConfig() {
  const config = window.SUPABASE_CONFIG || {};
  return {
    url: config[SUPABASE_CONFIG_KEYS.url] || "",
    publishableKey: config[SUPABASE_CONFIG_KEYS.key] || ""
  };
}

export function createClient() {
  const { url, publishableKey } = readSupabaseConfig();

  if (!url || !publishableKey) {
    throw new Error(
      `Missing Supabase configuration. Run npm run supabase:config and confirm ${SUPABASE_CONFIG_KEYS.url} and ${SUPABASE_CONFIG_KEYS.key} are set in .env.local.`
    );
  }

  if (!window.supabase?.createClient) {
    throw new Error("Supabase browser SDK failed to load from @supabase/supabase-js.");
  }

  return window.supabase.createClient(url, publishableKey);
}
