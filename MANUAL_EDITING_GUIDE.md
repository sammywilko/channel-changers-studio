# 📝 MANUAL EDITING GUIDE
## Complete Guide to Editing Your Storyboards

---

## 🎯 QUICK NAVIGATION

- [Script Editing](#1-script-editing) - Edit your screenplay
- [Character Management](#2-character-management) - Add/edit characters
- [Location Management](#3-location-management) - Manage locations
- [Beat/Shot Editing](#4-beatshot-editing) - Edit individual shots
- [Scene Management](#5-scene-management) - Add/remove/reorder scenes
- [Batch Operations](#6-batch-operations) - Bulk editing features

---

## 1. SCRIPT EDITING

### 📍 **Location:** Script Tab (top navigation)

### **What You Can Do:**

#### ✏️ **Edit Script Text Directly**
1. Click on the **"Script"** tab in the top navigation
2. Your generated script appears in a text area
3. Click anywhere in the script to start editing
4. Changes auto-save after 3 seconds

**Where to find it:**
```
Top Bar: [Dashboard] [Script] [Board] [Canvas]
                        ^
                   Click here
```

#### 🔄 **Regenerate Script**
- Click **"Regenerate Script"** button below the script
- AI will create a new version based on your idea

#### ✨ **Refine Script with AI**
1. Edit your script manually
2. Click **"Ask Producer to Refine"** button
3. Producer chat opens with suggestion prompt
4. Type what you want to change (e.g., "make it more dramatic")

---

## 2. CHARACTER MANAGEMENT

### 📍 **Location:** World Bible Panel (right sidebar)

### **What You Can Do:**

#### 👤 **Add New Character**
1. Click **"World Bible"** button in top-right
2. Scroll to **"Characters"** section
3. Click **"+ Add Character"** button
4. Fill in:
   - Name (e.g., "Sam")
   - Handle (e.g., "@sam")
   - Description
   - Visual style notes

**Button looks like:**
```
┌─────────────────────┐
│  + Add Character    │
└─────────────────────┘
```

#### 🖼️ **Upload Character Reference Images**
1. Find your character card in World Bible
2. Click **"Upload References"** button on character card
3. Select 2-6 images showing different angles
4. These images will be used when generating shots with that character

**Character Card Structure:**
```
┌──────────────────────────────┐
│ @sam - Sam                   │
│ Description: ...              │
│ [Upload References]           │
│ [✏️ Edit] [🗑️ Delete]        │
│ References: [img] [img]       │
└──────────────────────────────┘
```

#### ✏️ **Edit Existing Character**
- Click **✏️ Edit** icon on character card
- Modify name, description, or visual style
- Click **Save**

#### 🗑️ **Delete Character**
- Click **🗑️ Delete** icon on character card
- Confirm deletion

#### 🔒 **Lock Character (Prevent Changes)**
- Click **🔒 Lock** toggle on character card
- Locked characters can't be accidentally deleted

---

## 3. LOCATION MANAGEMENT

### 📍 **Location:** World Bible Panel → Locations Tab

### **What You Can Do:**

#### 🏢 **Add New Location**
1. Open World Bible
2. Click **"Locations"** tab
3. Click **"+ Add Location"** button
4. Fill in:
   - Name (e.g., "Coffee Shop")
   - Handle (e.g., "@coffeeshop")
   - Description

#### 📸 **Generate Location Reference Angles**
1. Find your location in World Bible
2. Click **"Generate Angles"** button
3. AI generates 8 standard angles:
   - Wide establishing shot
   - Medium shot
   - Close-up details
   - Over-the-shoulder
   - Reverse angle
   - High angle
   - Low angle
   - POV shot

**Location Card:**
```
┌──────────────────────────────┐
│ @coffeeshop - Coffee Shop    │
│ Description: Cozy cafe...     │
│ [Generate Angles]             │
│ [Upload Reference]            │
│ [✏️ Edit] [🗑️ Delete]        │
│ Angles: 8/8 generated         │
└──────────────────────────────┘
```

---

## 4. BEAT/SHOT EDITING

### 📍 **Location:** Board Tab → Individual Beat Cards

### **What You Can Do:**

#### ✏️ **Edit Beat Details**

Each beat card has multiple editable fields:

**Beat Card Structure:**
```
┌─────────────────────────────────────┐
│ Beat #1                    [⋮ Menu] │
│                                     │
│ 🎬 Action:                          │
│ Sam enters coffee shop, nervous     │
│ [✏️ Edit Action]                    │
│                                     │
│ 📸 Camera:                          │
│ Medium shot, eye level              │
│ [✏️ Edit Camera]                    │
│                                     │
│ 💡 Lighting:                        │
│ Natural window light                │
│ [✏️ Edit Lighting]                  │
│                                     │
│ ⏱️ Duration: 3s [+/-]              │
│                                     │
│ 👥 Characters: @sam                 │
│ [+ Add Character]                   │
│                                     │
│ 🖼️ [Generate Image]                │
│ [🔄 Regenerate] [💾 Save]          │
└─────────────────────────────────────┘
```

**How to Edit Each Field:**

1. **Action Description**
   - Click **✏️ Edit Action** button
   - Type new action description
   - Press Enter or click Save

2. **Camera Direction**
   - Click **✏️ Edit Camera** button
   - Modify shot type (wide, medium, close-up)
   - Add camera movement (dolly, pan, static)
   - Add angle (eye-level, low, high)

3. **Lighting**
   - Click **✏️ Edit Lighting** button
   - Change lighting setup
   - Add mood/quality (soft, dramatic, natural)

4. **Duration**
   - Click **+** or **-** buttons to adjust seconds
   - Or click on the number to type directly

5. **Add/Remove Characters**
   - Click **+ Add Character** button
   - Select from dropdown of available characters
   - Click **✕** on character tag to remove

#### 🖼️ **Regenerate Beat Image**
1. Click **🔄 Regenerate** button on beat card
2. AI generates new image using current beat settings
3. Previous images are saved in history

#### 🗑️ **Delete Beat**
1. Click **⋮ Menu** (three dots) on beat card
2. Select **"Delete Beat"**
3. Confirm deletion

---

## 5. SCENE MANAGEMENT

### 📍 **Location:** Board Tab → Scene Headers

### **What You Can Do:**

#### ➕ **Add New Scene**

**Between Existing Scenes:**
1. Hover between two scene headers
2. Click **"+ Add Scene"** button that appears
3. New empty scene is inserted

**At End:**
1. Scroll to bottom of Board tab
2. Click **"+ Add Scene at End"** button

**Scene Header Structure:**
```
┌────────────────────────────────┐
│ ACT 1 - SCENE 1: INT. COFFEE  │
│                         [⋮ Menu]│
│ [+ Add Beat Above]              │
│                                 │
│  [Beat Card 1]                  │
│  [Beat Card 2]                  │
│                                 │
│ [+ Add Beat Below]              │
└────────────────────────────────┘
     ↓
[+ Add Scene] ← Click to add new scene
     ↓
┌────────────────────────────────┐
│ ACT 1 - SCENE 2                │
```

#### ✏️ **Edit Scene Title**
1. Click **⋮ Menu** on scene header
2. Select **"Edit Scene Title"**
3. Type new title
4. Press Enter or click outside to save

#### 🔄 **Reorder Scenes**
1. Click and hold on scene header
2. Drag up or down
3. Drop in new position
4. Scene numbers auto-update

#### 🗑️ **Delete Scene**
1. Click **⋮ Menu** on scene header
2. Select **"Delete Scene"**
3. Confirm deletion (all beats in scene will be deleted)

---

## 6. BATCH OPERATIONS

### 📍 **Location:** Board Tab → Top Toolbar

### **What You Can Do:**

#### 🎬 **Generate All Images**
1. Click **"Generate All"** button in toolbar
2. Batch generation starts
3. Progress bar shows: "Generating beat 5/25..."
4. Can pause/resume at any time

**Toolbar:**
```
┌──────────────────────────────────────────┐
│ [Generate All] [Export] [Settings] [⋮]  │
└──────────────────────────────────────────┘
```

#### 📥 **Export Storyboard**
1. Click **"Export"** button
2. Choose format:
   - **CSV** - Shot list spreadsheet
   - **PDF** - Visual storyboard (coming soon)
   - **JSON** - Raw project data
   - **ZIP** - All images + data

#### 🎨 **Apply Style to All Beats**
1. Upload style reference images in World Bible
2. Click **"Analyze Style"** button
3. Click **"Apply to All Beats"**
4. All future generated images match style

#### 🔄 **Regenerate Failed Shots**
1. Click **⋮ More** menu in toolbar
2. Select **"Regenerate Failed Shots"**
3. AI retries all beats with errors

---

## 7. PRODUCER CHAT EDITING

### 📍 **Location:** Producer Chat Panel (click 💬 icon)

### **Natural Language Editing:**

You can ask the Producer AI to make changes for you!

**Examples:**

```
You: "Make beat 3 more dramatic"
AI: Updates beat 3 with dramatic lighting and close-up camera

You: "Add a transition beat between scenes 2 and 3"
AI: Inserts new beat at that position

You: "Change all lighting to golden hour"
AI: Updates all beats with golden hour lighting

You: "Remove character @alex from beat 5"
AI: Removes @alex from that beat

You: "Split beat 7 into two shots"
AI: Divides beat 7 at midpoint

You: "Make the first 5 beats faster paced"
AI: Reduces duration on beats 1-5
```

**How It Works:**
1. Click **💬 Producer Chat** icon (bottom-right)
2. Type your editing request
3. AI analyzes and proposes changes
4. Review the plan
5. Click **"Execute"** to apply changes

---

## 8. KEYBOARD SHORTCUTS

Coming soon! Planned shortcuts:

- `Cmd/Ctrl + E` - Edit selected beat
- `Cmd/Ctrl + D` - Duplicate beat
- `Cmd/Ctrl + Delete` - Delete beat
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo
- `Space` - Play/pause preview

---

## 9. DRAG & DROP EDITING

### **Reorder Beats:**
1. Click and hold **🔲 Grip** icon on beat card (left side)
2. Drag beat up or down
3. Drop in new position
4. Beat numbers auto-renumber

### **Reorder Characters:**
1. In World Bible, click and hold character card
2. Drag to reorder
3. Priority order affects reference image selection

---

## 10. CANVAS VIEW EDITING

### 📍 **Location:** Canvas Tab (visual timeline)

### **What You Can Do:**

#### 🎞️ **Visual Timeline Editing**
- See all beats as thumbnails in a timeline
- Click thumbnail to select beat
- Drag thumbnails to reorder
- Double-click to edit

#### ✂️ **Split/Trim (Coming Soon)**
- Click between beats to add transition
- Drag beat edges to adjust duration
- Split beats visually

---

## 📊 WHERE EVERYTHING IS SAVED

### **Auto-Save:**
- ✅ Every 3 seconds after changes
- ✅ Saved to IndexedDB (local browser storage)
- ✅ Optional: Google Drive backup (enable in Settings)

### **Save Indicator:**
Top-right corner shows:
- 💾 **Saved** - All changes saved
- ⏳ **Saving...** - Save in progress
- ⚠️ **Unsaved** - Changes pending
- ❌ **Error** - Save failed

---

## 🎯 QUICK TIPS

### **For Fast Editing:**
1. Use Producer Chat for bulk changes
2. Use **Cmd/Ctrl + Click** to multi-select beats
3. Edit in Script tab for story changes
4. Edit in Board tab for visual/technical changes

### **For Precision:**
1. Edit individual beat fields manually
2. Use World Bible to manage characters/locations
3. Upload reference images for consistency
4. Check Canvas view to see overall flow

### **For Experimentation:**
1. Duplicate beats before editing (right-click → Duplicate)
2. Generate variations (click 🔄 Variations button)
3. Try different camera angles
4. A/B test with multiple images per beat

---

## ❓ TROUBLESHOOTING

### **"I can't find the edit button!"**
- Make sure you're on the **Board** tab, not Script or Canvas
- Scroll down to see beat cards
- Each beat card has ✏️ Edit buttons on each field

### **"Changes aren't saving!"**
- Check save indicator in top-right
- Wait 3 seconds after editing (auto-save debounce)
- Check browser console for errors (F12)

### **"Characters aren't showing up in beats"**
- Make sure characters have @handles (e.g., "@sam")
- Regenerate beats after adding characters
- Check that script mentions character names

### **"Generated images don't match my references"**
- Verify reference images uploaded to character/location
- Check that beat's "characters" array includes the @handle
- Try regenerating with more specific prompts

---

## 🎬 WALKTHROUGH: Complete Edit Workflow

### **Scenario:** You want to add a dramatic reveal shot

1. **Navigate to Board Tab**
   - Click "Board" in top navigation

2. **Find the Scene**
   - Scroll to where you want the new beat
   - Let's say after Beat #7

3. **Add New Beat**
   - Click **"+ Add Beat"** button after Beat #7
   - New beat appears as Beat #8

4. **Edit Beat Details**
   - Click **✏️ Edit Action**
   - Type: "Close-up on Sam's shocked expression as truth revealed"
   - Click **✏️ Edit Camera**
   - Type: "Extreme close-up, slightly low angle"
   - Click **✏️ Edit Lighting**
   - Type: "Dramatic side lighting with rim light"
   - Set Duration: 2 seconds

5. **Add Character**
   - Click **+ Add Character**
   - Select "@sam" from dropdown

6. **Generate Image**
   - Click **🖼️ Generate Image**
   - Wait for AI to generate
   - Review result

7. **Done!**
   - Changes auto-save
   - Beat #8 now exists
   - Subsequent beats renumbered to 9, 10, etc.

---

## 🚀 ADVANCED EDITING

### **Multi-Beat Editing:**
1. Hold `Shift` and click multiple beat cards
2. Right-click → "Edit Selected Beats"
3. Change affects all selected beats

### **Template Beats:**
1. Edit a beat to perfection
2. Right-click → "Save as Template"
3. Click **"+ Add Beat from Template"** to reuse

### **Conditional Branching (Product Mode):**
1. Create multiple beats for same moment
2. Mark as "Variations"
3. Generate all, pick best

---

## 📞 NEED MORE HELP?

- Check **HOW_TO_USE_PRODUCER_CHAT.md** for AI editing
- Check **META_ORCHESTRATOR_README.md** for workflow automation
- Ask the Producer: "How do I [your question]?"

---

**Last Updated:** November 26, 2025
**Version:** Channel Changers Studio - Desktop Production v8
