#!/usr/bin/env python3
"""
Fix overlay pages showing Navbar, MascotBuddy, SupportChatbot, BottomTabBar, etc.

The overlays are rendered inside AppContent which always includes chrome components.
For OBS Browser Source, these must be hidden.

Solution: Use the URL path to detect overlay pages and conditionally hide chrome.
We use a simple `useIsOverlay()` check in AppContent.
"""

import re

BASE = "/home/z/my-project/bateumz-cb2c44d1/src"

def fix_app_content():
    """Add overlay detection and conditionally hide chrome components"""
    path = f"{BASE}/App.tsx"
    with open(path, 'r') as f:
        content = f.read()

    # Add useIsOverlay hook before AppContent
    hook_code = '''const useIsOverlay = () => {
  if (typeof window === "undefined") return false;
  return /^\/(lives\/overlay|overlay\/)/.test(window.location.pathname);
};

'''

    # Find the right place to insert - before `const AppContent`
    if 'useIsOverlay' not in content:
        content = content.replace('const AppContent = () => {', hook_code + 'const AppContent = () => {', 1)

    # Now wrap the chrome components with overlay check
    # Replace the chrome section inside BrowserRouter
    old_chrome = '''        <BrowserRouter>
        {!authLoading && user && <PushNotificationBanner />}
        <MobileTopBar />
        <AnimatedRoutes />
        <MascotBuddy />
        <SupportChatbot />
        <NotificationBell />
        <BottomTabBar />
        <RegionalPreviewBar />
      </BrowserRouter>'''

    new_chrome = '''        <BrowserRouter>
        {useIsOverlay() ? null : <>
          {!authLoading && user && <PushNotificationBanner />}
          <MobileTopBar />
        </>}
        <AnimatedRoutes />
        {useIsOverlay() ? null : <>
          <MascotBuddy />
          <SupportChatbot />
          <NotificationBell />
          <BottomTabBar />
          <RegionalPreviewBar />
        </>}
      </BrowserRouter>'''

    # Also hide BackgroundDecorations and Toaster/Sonner for overlays
    old_toast = '''      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BackgroundDecorations />
      <BrowserRouter>'''

    new_toast = '''      <TooltipProvider>
      {useIsOverlay() ? null : <><Toaster /><Sonner /><BackgroundDecorations /></>}
      <BrowserRouter>'''

    if old_toast in content:
        content = content.replace(old_toast, new_toast, 1)

    if old_chrome in content:
        content = content.replace(old_chrome, new_chrome, 1)
        with open(path, 'w') as f:
            f.write(content)
        print("[OK] App.tsx: Overlay pages now hide all chrome components (navbar, mascot, chat, etc.)")
        return True
    else:
        # Try partial match to debug
        if '<BrowserRouter>' in content and 'MascotBuddy' in content:
            print("[PARTIAL] Pattern changed, trying line-by-line approach")
            lines = content.split('\n')
            new_lines = []
            in_browser_router = False
            chrome_inserted = False
            for i, line in enumerate(lines):
                if '<BrowserRouter>' in line and not chrome_inserted:
                    new_lines.append('        <BrowserRouter>')
                    new_lines.append('        {useIsOverlay() ? null : <>')
                    in_browser_router = True
                    continue
                if in_browser_router and ('<AnimatedRoutes' in line):
                    new_lines.append('        </>' if not chrome_inserted else '        ')
                    # Re-approach: just add the conditional wrapper
                    in_browser_router = False
                new_lines.append(line)
            # If line-by-line is too complex, just report
            print("[WARN] Could not auto-patch chrome hiding. Manual fix needed.")
            return False
        print("[SKIP] Pattern not found")
        return False

if __name__ == "__main__":
    print("=== Fixing Overlay Chrome ===")
    result = fix_app_content()
    if not result:
        print("Trying alternative approach...")
    print("=== Done ===")
