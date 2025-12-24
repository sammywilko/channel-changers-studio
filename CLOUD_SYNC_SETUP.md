# Director - Supabase Cloud Sync Setup Guide

## Quick Setup (2 Steps)

### Step 1: Add Environment Variables in Vercel

Go to: **Vercel → channel-changers-studio → Settings → Environment Variables**

Add these two variables:

```
VITE_SUPABASE_URL=https://ajsbopbuejhhaxwtbbku.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqc2JvcGJ1ZWpoaGF4d3RiYmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMDY0NDgsImV4cCI6MjA4MTU4MjQ0OH0.dkUvAz7iShkuH0haytI0H2iEEGP6rUca6k-Yj6a-pcw
```

### Step 2: Redeploy

Click "Redeploy" in Vercel or push a new commit.

---

## What's Included

### Database Table (`director_projects`)

Already created in your Supabase project with:
- Full project data storage (script, structure, characters, locations, etc.)
- Multi-tenant support (tenant_id: cc-internal-001)
- Auto-updating timestamps and version tracking
- Row Level Security enabled

### Service Layer (`services/supabaseService.ts`)

Functions available:
- `saveProjectToCloud(project)` - Save single project
- `loadProjectFromCloud(projectId)` - Load single project
- `listCloudProjects()` - List all cloud projects
- `deleteProjectFromCloud(projectId)` - Delete from cloud
- `syncAllToCloud(projects)` - Bulk sync all projects
- `pullFromCloud()` - Pull all from cloud
- `isCloudEnabled()` - Check if cloud sync is configured

### Hook (`hooks/useCloudSync.ts`)

Easy integration hook:
```tsx
const cloudSync = useCloudSync();

// In auto-save effect:
if (cloudSync.state.isEnabled) {
  cloudSync.syncNow(currentProject);
}
```

### UI Component (`components/CloudSyncPanel.tsx`)

Ready-to-use components:
- `CloudToggle` - Header toggle button with status
- `CloudBrowser` - Modal to browse/restore cloud projects
- `CloudSyncPanel` - Sidebar panel for settings

---

## Integration Options

### Option A: Auto-sync on Save (Recommended)

In App.tsx, update the auto-save effect:

```tsx
import { saveProjectToCloud, isCloudEnabled } from '../services/supabaseService';

// Add to state
const [isCloudSyncEnabled, setIsCloudSyncEnabled] = useState(false);
const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle'|'syncing'|'success'|'error'>('idle');

// Add to init effect
useEffect(() => {
  const cloudEnabled = localStorage.getItem('cc_cloud_sync_enabled') === 'true';
  setIsCloudSyncEnabled(cloudEnabled && isCloudEnabled());
}, []);

// Update auto-save effect
useEffect(() => {
  if (!currentProject) return;
  setSaveStatus('unsaved');

  const timeout = setTimeout(async () => {
    try {
      setSaveStatus('saving');
      saveProject(currentProject);
      setProjects(getProjects());
      setLastSaveTime(Date.now());
      setSaveStatus('saved');

      // ☁️ Cloud Sync
      if (isCloudSyncEnabled) {
        setCloudSyncStatus('syncing');
        const result = await saveProjectToCloud(currentProject);
        setCloudSyncStatus(result.success ? 'success' : 'error');
        setTimeout(() => setCloudSyncStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      setSaveStatus('error');
    }
  }, 3000);

  return () => clearTimeout(timeout);
}, [currentProject, isCloudSyncEnabled]);
```

### Option B: Manual Sync Button

Add to header:

```tsx
import { CloudToggle } from '../components/CloudSyncPanel';

// In header
<CloudToggle
  isEnabled={isCloudSyncEnabled}
  onToggle={() => {
    const newValue = !isCloudSyncEnabled;
    localStorage.setItem('cc_cloud_sync_enabled', String(newValue));
    setIsCloudSyncEnabled(newValue);
  }}
  syncStatus={cloudSyncStatus}
  onSyncNow={async () => {
    if (!currentProject) return;
    setCloudSyncStatus('syncing');
    const result = await saveProjectToCloud(currentProject);
    setCloudSyncStatus(result.success ? 'success' : 'error');
  }}
/>
```

### Option C: Export Menu Integration

Add to export dropdown:

```tsx
<button 
  onClick={async () => {
    setIsExportOpen(false);
    const result = await saveProjectToCloud(currentProject);
    if (result.success) {
      alert('✅ Saved to Supabase cloud!');
    } else {
      alert('❌ Cloud sync failed: ' + result.error);
    }
  }} 
  className="w-full text-left px-4 py-2 text-xs text-gray-300 hover:bg-gray-800 flex items-center gap-2"
>
  <Cloud size={14} className="text-cyan-400"/> 
  Sync to Cloud
</button>
```

---

## Files Created

| File | Description |
|------|-------------|
| `services/supabaseService.ts` | Core Supabase integration |
| `hooks/useCloudSync.ts` | React hook for easy integration |
| `components/CloudSyncPanel.tsx` | UI components |

---

## Database Schema Reference

```sql
CREATE TABLE director_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'cc-internal-001',
  name TEXT NOT NULL,
  project_type TEXT DEFAULT 'narrative',
  idea TEXT,
  script TEXT,
  structure JSONB,
  characters JSONB DEFAULT '[]',
  locations JSONB DEFAULT '[]',
  models JSONB DEFAULT '[]',
  style_references JSONB DEFAULT '[]',
  style_analysis JSONB,
  brand_assets JSONB DEFAULT '[]',
  world_look TEXT,
  prompt_guidelines TEXT,
  resolution TEXT DEFAULT '1080p',
  aspect_ratio TEXT DEFAULT '16:9',
  gems JSONB DEFAULT '[]',
  team JSONB DEFAULT '[]',
  orchestrator_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  deal_id UUID REFERENCES deals(id),
  version INTEGER DEFAULT 1,
  owner_email TEXT
);
```

---

## Testing

1. Enable cloud sync in your browser localStorage:
   ```js
   localStorage.setItem('cc_cloud_sync_enabled', 'true');
   ```

2. Create/edit a project in Director

3. Check Supabase dashboard:
   - https://supabase.com/dashboard/project/ajsbopbuejhhaxwtbbku/editor
   - Look for `director_projects` table

---

**Version:** 1.0.0 | **Updated:** December 24, 2025
