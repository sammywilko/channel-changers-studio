# Producer Actions - Making the Producer Actually DO Things

## Problem Fixed
Previously, the Producer Chat could only **talk** about what to do, but couldn't actually **execute** actions. If you said "insert a scene at the beginning", it would acknowledge but not do it.

## Solution
The Producer can now **detect action intents** and **execute them** automatically!

---

## What the Producer Can Do Now

### 1. **Modify Script** ✅
```
You: "Insert a scene at the beginning showing the character waking up"
Producer: "Got it! Let me modify script... ⚡"
         [Actually modifies the script]
         "✅ Script modified: insert scene at the beginning"
```

### 2. **Add Scene** ✅
```
You: "Add a scene at the coffee shop"
Producer: "Got it! Let me add scene... ⚡"
         [Adds the scene to the script]
         "✅ Added scene at coffee shop. Regenerate breakdown to see it."
```

### 3. **Remove Scene** ✅
```
You: "Remove scene 3"
Producer: "Got it! Let me remove scene... ⚡"
         [Removes scene from structure]
         "✅ Removed scene 3"
```

### 4. **Regenerate Shot** 📋
```
You: "Regenerate shot 5 with different lighting"
Producer: "📋 To regenerate shot 5, go to Production Board and click refresh on that shot."
```

### 5. **Add Coverage** 📋
```
You: "Add 3 more angles for scene 2"
Producer: "📋 To add 3 more shots to scene 2, go to Production Board and use 'Add Shot' button."
```

---

## How It Works

### Action Detection Flow

```
User Input → Detect Intent → Execute Action → Update Project
             (AI analyzes)    (Modify data)    (Save to DB)
```

**Example:**
1. **User:** "Insert a scene at the beginning showing Sam arriving at the office"
2. **AI Detection:** Recognizes this as `modify_script` action
3. **Execution:** Uses Gemini 3 Pro to modify the script intelligently
4. **Update:** Project script is updated, structure cleared for regeneration
5. **Feedback:** "✅ Script modified. Generate new breakdown to see changes."

---

## Technical Implementation

### Files Created

**[services/producerActions.ts](services/producerActions.ts)**
- `detectActionIntent()` - Uses AI to detect if user wants an action
- `executeProducerAction()` - Executes the detected action
- Action handlers:
  - `modifyScript()` - Intelligent script editing via AI
  - `addScene()` - Insert new scenes
  - `removeScene()` - Delete scenes from structure
  - `regenerateShot()` - Guides user to regenerate UI
  - `addCoverage()` - Guides user to add shots UI

### Files Modified

**[components/ProducerChat.tsx](components/ProducerChat.tsx)**
- Added `onProjectUpdate` callback prop
- Integrated action detection in `handleSendMessage()`
- Shows "⚡" indicator when executing actions
- Displays success/error feedback

**[src/App.tsx](src/App.tsx)**
- Passed `updateProject` to ProducerChat as `onProjectUpdate`
- Enables Producer to modify project state

---

## Action Detection Logic

The Producer uses **Gemini 3 Pro** to analyze natural language and detect action intent:

```typescript
User Input: "insert a scene at the beginning"

AI Analysis:
{
  "isAction": true,
  "actionType": "modify_script",
  "parameters": {
    "modification": "insert opening scene showing...",
    "location": "beginning"
  },
  "reasoning": "User explicitly requests script modification"
}
```

**Action Triggers:**
- "insert", "add", "modify", "change", "edit" → Script modification
- "remove", "delete" → Scene removal
- "regenerate", "redo" → Shot regeneration (guided)
- "add more angles", "add coverage" → Coverage addition (guided)

**Planning Triggers (no action):**
- Questions: "What should I...", "How do I..."
- Requests for advice: "I'm thinking of..."
- General discussion: "Tell me about..."

---

## Usage Examples

### Example 1: Add Opening Scene
```
User: "Can you add a scene at the start where Sam walks into the office?"

Producer:
🔍 Detecting action intent...
⚡ Action detected: modify_script
Got it! Let me modify script... ⚡

[AI modifies script to insert opening scene]

✅ Script modified: insert scene at the beginning

The structure has been cleared. Generate a new breakdown to see the changes.
```

### Example 2: Change Ending
```
User: "Change the ending - Sam should leave instead of staying"

Producer:
⚡ Action detected: modify_script
Got it! Let me modify script... ⚡

[AI rewrites ending while preserving rest of script]

✅ Script modified: change ending

Regenerate the breakdown to see the updated ending.
```

### Example 3: Remove Scene
```
User: "Delete scene 2, it's redundant"

Producer:
⚡ Action detected: remove_scene
Got it! Let me remove scene... ⚡

[Removes scene 2 from project structure]

✅ Removed scene 2
```

### Example 4: Planning (No Action)
```
User: "What do you think about adding a chase scene?"

Producer:
💬 Planning conversation (no action)

[No action executed - just discusses the idea]

That could work well! Where are you thinking of placing it?
For a chase scene, we'd need:
- Clear motivation for the chase
- Interesting obstacles
- Resolution
...
```

---

## Benefits

### Before ❌
- Producer could only give advice
- Had to manually edit script in UI
- Disconnected conversation and action

### After ✅
- Producer **executes** actions automatically
- Natural language commands work
- Seamless conversation → action flow
- Saves time and clicks

---

## Limitations & Future Improvements

### Current Limitations
1. **Shot regeneration**: Guides to UI (doesn't regenerate directly)
2. **Coverage addition**: Guides to UI (doesn't add shots directly)
3. **No undo**: Actions are immediate (export before major changes)

### Future Improvements
- **Direct shot regeneration**: Producer calls image generation API
- **Direct coverage addition**: Producer adds shots to structure
- **Undo/Redo**: Action history with rollback
- **Batch operations**: "Regenerate all shots in scene 2"
- **Smart suggestions**: "I noticed continuity issue in shot 3, should I fix it?"

---

## Error Handling

**Action detection fails:**
- Falls back to planning conversation
- No error shown to user

**Action execution fails:**
- Shows error message: "⚠️ Failed to execute..."
- Project remains unchanged
- User can retry or rephrase

**API errors:**
- Logged to console
- User-friendly error message
- Graceful degradation

---

## Testing

**Test Actions:**
1. "Insert a scene at the beginning" → Should modify script
2. "Remove scene 3" → Should delete scene
3. "What should I do next?" → Should plan (no action)
4. "Add a scene at the park" → Should modify script
5. "Regenerate shot 5" → Should show UI guidance

**Check Console:**
```
🔍 Detecting action intent...
⚡ Action detected: modify_script
🎬 Executing producer action: modify_script
✅ Script modified
```

---

## Status
✅ **Production Ready**
- Action detection working
- Script modification working
- Scene add/remove working
- UI guidance for complex actions
- Error handling in place

**Last Updated:** November 24, 2025
