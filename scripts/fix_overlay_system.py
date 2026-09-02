#!/usr/bin/env python3
"""
Fix overlay system for bateu.online:
1. OverlayLive.tsx - add transparent background CSS for OBS
2. App.tsx - add /lives/overlay-pro route 
3. OverlayPro.tsx - fix branding query to handle LiveHub random codes
4. LiveControlPanel.tsx - remove duplicate/unused imports
5. publicUrl.ts - add buildOverlayProUrl function
"""

import re

BASE = "/home/z/my-project/bateumz-cb2c44d1/src"

def fix_overlay_live():
    """Add transparent background CSS injection to OverlayLive.tsx for OBS compatibility"""
    path = f"{BASE}/pages/OverlayLive.tsx"
    with open(path, 'r') as f:
        content = f.read()
    
    # Add transparent background style injection after the opening div
    # The current code has: <div className="min-h-screen bg-transparent text-white p-6 font-display">
    # We need to add the style tag like LiveOverlay.tsx does
    
    old_return = '    <div className="min-h-screen bg-transparent text-white p-6 font-display">'
    new_return = '    <div className="min-h-screen bg-transparent text-white p-6 font-display">\n      <style>{`html,body,#root{background:transparent !important;}`}</style>'
    
    if old_return in content and 'background:transparent !important' not in content:
        content = content.replace(old_return, new_return, 1)
        with open(path, 'w') as f:
            f.write(content)
        print("[OK] OverlayLive.tsx: Added transparent background CSS for OBS")
    else:
        print("[SKIP] OverlayLive.tsx: Already has transparent CSS or pattern not found")

def fix_app_routes():
    """Add /lives/overlay-pro route in App.tsx so OverlayPro is accessible at the expected URL"""
    path = f"{BASE}/App.tsx"
    with open(path, 'r') as f:
        content = f.read()
    
    # Add /lives/overlay-pro route next to /lives/overlay
    old_route = '          <Route path="/lives/overlay" element={<LiveOverlay />} />'
    new_route = '          <Route path="/lives/overlay" element={<LiveOverlay />} />\n          <Route path="/lives/overlay-pro" element={<OverlayPro />} />'
    
    if '/lives/overlay-pro' not in content:
        content = content.replace(old_route, new_route, 1)
        with open(path, 'w') as f:
            f.write(content)
        print("[OK] App.tsx: Added /lives/overlay-pro route")
    else:
        print("[SKIP] App.tsx: /lives/overlay-pro route already exists")

def fix_overlay_pro_branding():
    """Fix OverlayPro branding query - it queries scheduled_lives.live_code which won't
    match LiveHub's random 5-char codes. Add fallback to also check live_config table."""
    path = f"{BASE}/pages/OverlayPro.tsx"
    with open(path, 'r') as f:
        content = f.read()
    
    # The current getBranding function queries scheduled_lives by live_code.
    # For LiveHub sessions (random codes), there's no scheduled_live entry.
    # We need to add a fallback: try to find a live_sessions or live_config entry,
    # or just gracefully handle the null case and use defaults.
    # 
    # The actual fix is to make getBranding also try the company_live_configs table
    # or just make it more resilient. Since the default branding is already good,
    # the main issue is that the query errors aren't caught properly.
    
    # Replace the getBranding function to be more robust
    old_branding = '''const getBranding = async (code: string): Promise<OverlayBranding> => {
  try {
    const { data: session } = await supabase
      .from('scheduled_lives')
      .select('business_user_id')
      .eq('live_code', code)
      .single();
    if (session?.business_user_id) {
      const { data: brand } = await supabase
        .from('company_branding')
        .select('*')
        .eq('user_id', session.business_user_id)
        .single();
      if (brand) {
        return {
          companyName: brand.company_name || undefined,
          companySlogan: brand.company_slogan || undefined,
          companyLogoUrl: brand.company_logo_url || undefined,
          primaryColor: brand.primary_color || DEFAULT_BRANDING.primaryColor,
          secondaryColor: brand.secondary_color || DEFAULT_BRANDING.secondaryColor,
          accentColor: brand.accent_color || DEFAULT_BRANDING.accentColor,
          backgroundColor: 'transparent',
          textColor: brand.text_color || DEFAULT_BRANDING.textColor,
          backgroundImageUrl: brand.background_image_url || undefined,
          overlayStyle: (brand.overlay_style as OverlayStyle) || 'neon',
        };
      }
    }
  } catch { /* noop */ }
  return DEFAULT_BRANDING;
};'''

    new_branding = '''const getBranding = async (code: string): Promise<OverlayBranding> => {
  try {
    // Try scheduled_lives first (for planned/scheduled events)
    const { data: session } = await supabase
      .from('scheduled_lives')
      .select('business_user_id')
      .eq('live_code', code)
      .single();
    let userId = session?.business_user_id;
    
    // Fallback: try live_sessions table (for ad-hoc LiveHub sessions)
    if (!userId) {
      const { data: liveSession } = await supabase
        .from('live_sessions')
        .select('business_user_id')
        .eq('live_code', code)
        .single();
      userId = (liveSession as any)?.business_user_id;
    }
    
    if (userId) {
      const { data: brand } = await supabase
        .from('company_branding')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (brand) {
        return {
          companyName: brand.company_name || undefined,
          companySlogan: brand.company_slogan || undefined,
          companyLogoUrl: brand.company_logo_url || undefined,
          primaryColor: brand.primary_color || DEFAULT_BRANDING.primaryColor,
          secondaryColor: brand.secondary_color || DEFAULT_BRANDING.secondaryColor,
          accentColor: brand.accent_color || DEFAULT_BRANDING.accentColor,
          backgroundColor: 'transparent',
          textColor: brand.text_color || DEFAULT_BRANDING.textColor,
          backgroundImageUrl: brand.background_image_url || undefined,
          overlayStyle: (brand.overlay_style as OverlayStyle) || 'neon',
        };
      }
    }
  } catch { /* noop */ }
  return DEFAULT_BRANDING;
};'''

    if old_branding in content:
        content = content.replace(old_branding, new_branding, 1)
        with open(path, 'w') as f:
            f.write(content)
        print("[OK] OverlayPro.tsx: Improved getBranding with live_sessions fallback")
    else:
        print("[SKIP] OverlayPro.tsx: getBranding pattern not found or already updated")

def fix_live_control_panel_imports():
    """Remove duplicate/unused imports from LiveControlPanel.tsx"""
    path = f"{BASE}/components/livegames/LiveControlPanel.tsx"
    with open(path, 'r') as f:
        content = f.read()
    
    # Remove 'Gauge as GaugeIcon,' (line 64) - it's never used
    # Remove 'ChevronUp,' (line 66) - only imported, never used in JSX
    
    original = content
    
    # Remove the GaugeIcon alias line
    content = content.replace('  Gauge as GaugeIcon,\n', '')
    # Remove the ChevronUp line  
    content = content.replace('  ChevronUp,\n', '')
    
    if content != original:
        with open(path, 'w') as f:
            f.write(content)
        print("[OK] LiveControlPanel.tsx: Removed unused imports (GaugeIcon, ChevronUp)")
    else:
        print("[SKIP] LiveControlPanel.tsx: Imports already clean")

def fix_public_url():
    """Add buildOverlayProUrl function to publicUrl.ts"""
    path = f"{BASE}/lib/publicUrl.ts"
    with open(path, 'r') as f:
        content = f.read()
    
    if 'buildOverlayProUrl' in content:
        print("[SKIP] publicUrl.ts: buildOverlayProUrl already exists")
        return
    
    # Add the new function after buildOverlayUrl
    old_func = """export const buildOverlayUrl = (code: string): string =>
  `${getPublicBaseUrl()}/lives/overlay?code=${encodeURIComponent(code)}`;"""
    
    new_func = """export const buildOverlayUrl = (code: string): string =>
  `${getPublicBaseUrl()}/lives/overlay?code=${encodeURIComponent(code)}`;

export const buildOverlayProUrl = (code: string, layout?: string): string => {
  const base = `${getPublicBaseUrl()}/lives/overlay-pro?code=${encodeURIComponent(code)}`;
  return layout ? `${base}&layout=${layout}` : base;
};"""
    
    if old_func in content:
        content = content.replace(old_func, new_func, 1)
        with open(path, 'w') as f:
            f.write(content)
        print("[OK] publicUrl.ts: Added buildOverlayProUrl function")
    else:
        print("[SKIP] publicUrl.ts: buildOverlayUrl pattern not found")

if __name__ == "__main__":
    print("=== Fixing Overlay System ===")
    fix_overlay_live()
    fix_app_routes()
    fix_overlay_pro_branding()
    fix_live_control_panel_imports()
    fix_public_url()
    print("=== Done ===")
