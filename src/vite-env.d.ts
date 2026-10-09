/// <reference types="vite/client" />
// Types Vite (import.meta.env, imports de .css et d'images) + variables d'environnement du site.
interface ImportMetaEnv {
  readonly VITE_LEAD_ENDPOINT?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
