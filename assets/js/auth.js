/**
 * Hypodermical Benelux — B2B auth layer.
 *
 * Thin wrapper around supabase-js exposing `window.HypoAuth`. Loads the
 * Supabase client from CDN on demand so pages that never touch auth pay
 * no cost. All trade-price gating is enforced server-side / by RLS — this
 * module only manages the session and the professional profile.
 *
 * Public API (all async unless noted):
 *   HypoAuth.isConfigured()        → boolean (sync)
 *   HypoAuth.client()              → resolves the supabase client
 *   HypoAuth.getSession()          → session | null
 *   HypoAuth.getUser()             → user | null
 *   HypoAuth.getProfile()          → b2b_profiles row | null
 *   HypoAuth.isApproved()          → boolean
 *   HypoAuth.apply({...})          → { user } | throws  (signup + profile)
 *   HypoAuth.signIn(email, pass)   → { session } | throws
 *   HypoAuth.signOut()             → void
 *   HypoAuth.onChange(cb)          → unsubscribe fn
 */
(function () {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

  let clientPromise = null;
  let profileCache = undefined; // undefined = not fetched, null = none

  function cfg() { return window.HYPO_SUPABASE || {}; }

  const HypoAuth = {
    isConfigured() {
      return !!(window.HYPO_SUPABASE && window.HYPO_SUPABASE.isConfigured());
    },

    /** Lazily import supabase-js and create a singleton client. */
    client() {
      if (!this.isConfigured()) {
        return Promise.reject(new Error('Supabase is not configured. See /assets/js/supabase-config.js'));
      }
      if (!clientPromise) {
        clientPromise = import(SUPABASE_CDN).then(({ createClient }) =>
          createClient(cfg().url, cfg().anonKey, {
            auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
          })
        );
      }
      return clientPromise;
    },

    async getSession() {
      if (!this.isConfigured()) return null;
      const sb = await this.client();
      const { data } = await sb.auth.getSession();
      return data.session || null;
    },

    async getUser() {
      const session = await this.getSession();
      return session ? session.user : null;
    },

    /** Current access token, for authenticating API calls. */
    async getAccessToken() {
      const session = await this.getSession();
      return session ? session.access_token : null;
    },

    async getProfile({ force = false } = {}) {
      if (!this.isConfigured()) return null;
      if (!force && profileCache !== undefined) return profileCache;
      const user = await this.getUser();
      if (!user) { profileCache = null; return null; }
      const sb = await this.client();
      const { data, error } = await sb
        .from('b2b_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (error) { console.warn('getProfile error:', error.message); profileCache = null; return null; }
      profileCache = data || null;
      return profileCache;
    },

    async isApproved() {
      const p = await this.getProfile();
      return !!p && p.status === 'approved';
    },

    /**
     * Register a professional account and create their pending profile.
     * @param {{email:string, password:string, company_name:string,
     *          contact_name?:string, vat_number?:string, license_number?:string,
     *          phone?:string, country?:string}} details
     */
    async apply(details) {
      const sb = await this.client();
      const { data: signUp, error: signErr } = await sb.auth.signUp({
        email: details.email,
        password: details.password,
        options: {
          data: {
            company_name: details.company_name,
            contact_name: details.contact_name || null
          }
        }
      });
      if (signErr) throw signErr;

      const user = signUp.user;
      // When email confirmation is on, there may be no session yet; we still
      // try to write the profile (RLS allows it once authenticated). If there
      // is no session, the row is created on first sign-in via ensureProfile().
      if (user && signUp.session) {
        await this._upsertProfile(sb, user.id, details);
      } else {
        // Stash for ensureProfile() after email confirmation / first login.
        try { sessionStorage.setItem('hypo_pending_profile', JSON.stringify({ id: user && user.id, details })); } catch {}
      }
      profileCache = undefined;
      return { user, session: signUp.session };
    },

    async _upsertProfile(sb, id, d) {
      const { error } = await sb.from('b2b_profiles').upsert({
        id,
        email: d.email,
        company_name: d.company_name,
        contact_name: d.contact_name || null,
        vat_number: d.vat_number || null,
        license_number: d.license_number || null,
        phone: d.phone || null,
        country: d.country || null
      });
      if (error) throw error;
    },

    /** Create the profile row on first authenticated load if it's missing. */
    async ensureProfile() {
      if (!this.isConfigured()) return;
      const user = await this.getUser();
      if (!user) return;
      const existing = await this.getProfile({ force: true });
      if (existing) return;
      let stash = null;
      try { stash = JSON.parse(sessionStorage.getItem('hypo_pending_profile') || 'null'); } catch {}
      const d = (stash && stash.details) || {
        email: user.email,
        company_name: user.user_metadata?.company_name || user.email,
        contact_name: user.user_metadata?.contact_name || null
      };
      const sb = await this.client();
      try {
        await this._upsertProfile(sb, user.id, { ...d, email: d.email || user.email });
        sessionStorage.removeItem('hypo_pending_profile');
        profileCache = undefined;
      } catch (e) { console.warn('ensureProfile failed:', e.message); }
    },

    async signIn(email, password) {
      const sb = await this.client();
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      profileCache = undefined;
      await this.ensureProfile();
      return { session: data.session, user: data.user };
    },

    async signOut() {
      if (!this.isConfigured()) return;
      const sb = await this.client();
      await sb.auth.signOut();
      profileCache = undefined;
    },

    /** Subscribe to auth state changes. Returns an unsubscribe function. */
    onChange(cb) {
      let unsub = () => {};
      this.client().then(sb => {
        const { data } = sb.auth.onAuthStateChange((_event, session) => {
          profileCache = undefined;
          cb(session);
        });
        unsub = () => data.subscription.unsubscribe();
      }).catch(() => {});
      return () => unsub();
    }
  };

  window.HypoAuth = HypoAuth;
})();
