import re

filepath = '/home/z/my-project/bateumz-cb2c44d1/src/App.tsx'
with open(filepath, 'r') as f:
    content = f.read()

# 1. Add imports for new pages
import_overlay_pro = 'import OverlayPro from "./pages/OverlayPro.tsx";'
import_company_profile = 'import CompanyPublicProfile from "./pages/CompanyPublicProfile.tsx";'
import_dashboard_stats = 'import DashboardLiveStats from "./pages/dashboard/DashboardLiveStats.tsx";'

if 'import OverlayPro' not in content:
    # Add after OverlayLive import
    content = content.replace(
        'import OverlayLive from "./pages/OverlayLive.tsx";',
        'import OverlayLive from "./pages/OverlayLive.tsx";\n' + import_overlay_pro
    )

if 'import CompanyPublicProfile' not in content:
    # Add after DashboardLiveStats or other imports
    content = content.replace(
        'import DashboardLiveHistory from "./pages/dashboard/DashboardLiveHistory.tsx";',
        'import DashboardLiveHistory from "./pages/dashboard/DashboardLiveHistory.tsx";\n' + import_company_profile
    )

if 'import DashboardLiveStats' not in content:
    content = content.replace(
        'import DashboardLiveHistory from "./pages/dashboard/DashboardLiveHistory.tsx";',
        'import DashboardLiveHistory from "./pages/dashboard/DashboardLiveHistory.tsx";\n' + import_dashboard_stats
    )

# 2. Add public routes
# Find the OverlayLive route and add OverlayPro after it
if 'OverlayPro' not in content:
    content = content.replace(
        '<Route path="/overlay/live/:id" element={<OverlayLive />} />',
        '<Route path="/overlay/live/:id" element={<OverlayLive />} />\n          <Route path="/overlay/pro" element={<OverlayPro />} />'
    )

# Add CompanyPublicProfile route (public) - after empresa/:id route
if 'CompanyPublicProfile' not in content:
    content = content.replace(
        '<Route path="/empresa/:id" element={<BusinessProfile />} />',
        '<Route path="/empresa/:id" element={<BusinessProfile />} />\n          <Route path="/empresa/:id/publico" element={<CompanyPublicProfile />} />'
    )

# 3. Add DashboardLiveStats route (protected, dashboard)
if 'DashboardLiveStats' not in content:
    # Find DashboardLiveHistory route in dashboard routes
    content = content.replace(
        '<Route path="/dashboard/live-history" element={<DashboardLiveHistory />} />',
        '<Route path="/dashboard/live-history" element={<DashboardLiveHistory />} />\n              <Route path="/dashboard/live-stats" element={<DashboardLiveStats />} />'
    )

with open(filepath, 'w') as f:
    f.write(content)

print('Routes updated successfully!')
