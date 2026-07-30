#!/usr/bin/env python3
"""Fix cascading query failure in CompanyPublicProfile.tsx
Each Supabase query is now independent - one failure doesn't block others.
"""

import re

FILE = "/home/z/my-project/bateumz-cb2c44d1/src/pages/CompanyPublicProfile.tsx"

with open(FILE, "r") as f:
    content = f.read()

# Replace the entire useEffect load function with independent queries
old_load = '''  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single();
        if (profile) {
          setCompany({
            user_id: profile.id, display_name: profile.display_name, company_name: profile.company_name,
            avatar_url: profile.avatar_url, is_verified: profile.is_verified, city: profile.city,
            province: profile.province, created_at: profile.created_at, phone: profile.phone,
          });
        }
        const { data: brand } = await supabase.from("company_branding").select("*").eq("user_id", id).single();
        if (brand) setBranding(brand as any);
        const { data: wheels } = await supabase.from("spin_wheel_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const { data: mils } = await supabase.from("millionaire_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const allGames: GameItem[] = [];
        (wheels || []).forEach((w: any) => allGames.push({ id: w.id, name: w.name, type: 'wheel', is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }));
        (mils || []).forEach((m: any) => allGames.push({ id: m.id, name: m.name || 'Quem Quer Ser Milionario', type: 'millionaire', is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }));
        setGames(allGames);
        const { data: lives } = await supabase.from("scheduled_lives").select("*").eq("business_user_id", id).neq("status", "draft").order("scheduled_at", { ascending: false }).limit(20);
        if (lives) {
          const mapped: LiveSession[] = lives.map((l: any) => ({
            code: l.live_code || l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(),
            ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0,
            players_count: 0, games_count: 0, winners: [],
          }));
          setSessions(mapped);
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    };
    load();
  }, [id]);'''

new_load = '''  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);

      try {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
        if (profile) {
          setCompany({
            user_id: profile.id, display_name: profile.display_name, company_name: profile.company_name,
            avatar_url: profile.avatar_url, is_verified: profile.is_verified, city: profile.city,
            province: profile.province, created_at: profile.created_at, phone: profile.phone,
          });
        }
      } catch (e) { console.error("Failed to load profile:", e); }

      try {
        const { data: brand } = await supabase.from("company_branding").select("*").eq("user_id", id).maybeSingle();
        if (brand) setBranding(brand as any);
      } catch (e) { console.error("Failed to load branding:", e); }

      try {
        const { data: wheels } = await supabase.from("spin_wheel_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const { data: mils } = await supabase.from("millionaire_games").select("*").eq("business_user_id", id).order("created_at", { ascending: false });
        const allGames: GameItem[] = [];
        (wheels || []).forEach((w: any) => allGames.push({ id: w.id, name: w.name, type: 'wheel', is_published: w.is_published, segment_count: w.segment_count, created_at: w.created_at, is_active: w.is_active }));
        (mils || []).forEach((m: any) => allGames.push({ id: m.id, name: m.name || 'Quem Quer Ser Milionario', type: 'millionaire', is_published: m.is_active, created_at: m.created_at, is_active: m.is_active }));
        setGames(allGames);
      } catch (e) { console.error("Failed to load games:", e); }

      try {
        const { data: lives } = await supabase.from("scheduled_lives").select("*").eq("business_user_id", id).neq("status", "draft").order("scheduled_at", { ascending: false }).limit(20);
        if (lives) {
          const mapped: LiveSession[] = lives.map((l: any) => ({
            code: l.live_code || l.slug || l.id, title: l.title, started_at: new Date(l.scheduled_at).getTime(),
            ended_at: l.ends_at ? new Date(l.ends_at).getTime() : Date.now(), duration_sec: l.ends_at ? Math.round((new Date(l.ends_at).getTime() - new Date(l.scheduled_at).getTime()) / 1000) : 0,
            players_count: 0, games_count: 0, winners: [],
          }));
          setSessions(mapped);
        }
      } catch (e) { console.error("Failed to load lives:", e); }

      setLoading(false);
    };
    load();
  }, [id]);'''

if old_load in content:
    content = content.replace(old_load, new_load)
    print("OK: Replaced load function with independent queries")
else:
    print("ERROR: Could not find the old load function - content may have changed")
    # Try a more lenient match
    if "company_branding" in content and ".single()" in content:
        print("  (company_branding and .single() exist in the file though)")
    print(f"  File length: {len(content)} chars")

with open(FILE, "w") as f:
    f.write(content)

print("Done.")
