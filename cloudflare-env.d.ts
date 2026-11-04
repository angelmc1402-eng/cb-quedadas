declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    CB_SUPABASE_URL?: string;
    CB_GATEWAY_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
