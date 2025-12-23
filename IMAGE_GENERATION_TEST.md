# Image Generation Diagnostic Test

## Quick Test Instructions

### Step 1: Start the Development Server

```bash
cd ~/Desktop/channel-changers-studio
npm run dev
```

### Step 2: Open Browser Console

1. Open the app in your browser (usually http://localhost:3000)
2. Open Developer Tools (F12 or Cmd+Option+I on Mac)
3. Go to the Console tab

### Step 3: Run the Test

In the browser console, type:

```javascript
await testImageGeneration()
```

## What the Test Does

The test will:
1. Verify your API key is set correctly
2. Test if `gemini-3-pro-image-preview` can generate images
3. Provide detailed diagnostic output
4. Give you specific solutions if there are issues

## Expected Results

### ✅ SUCCESS (Image Generation Working)

```
🧪 TESTING GEMINI IMAGE GENERATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
API Key: AIzaSyCzuV...

📡 Test 1: gemini-3-pro-image-preview (Imagen 3)
   Prompt: "Red apple on white background"
   ✅ SUCCESS: Image generated!
   📊 Type: image/png
   📊 Size: 123456 chars

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 RESULT: Your setup is CORRECT!
   Model: gemini-3-pro-image-preview works
   API Key: Valid and has image generation access

💡 Next Steps:
   1. Create a product campaign brief
   2. Add product reference images with @handles
   3. Generate shots - @handles should inject references
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**This means**: Your setup is working perfectly! The @handle reference system should work.

### ❌ FAILED (Text Response Instead of Image)

```
📡 Test 1: gemini-3-pro-image-preview (Imagen 3)
   ❌ FAILED: Returned text instead of image
   Response: I cannot generate images. I am a text-based AI...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  PROBLEM: Model not generating images

Possible causes:
   1. API key lacks Imagen 3 access
   2. Model name changed or deprecated
   3. Billing/quota issue

💡 Solutions:
   1. Check Google AI Studio for model availability
   2. Verify billing is enabled
   3. Try alternative: Vertex AI or external API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**This means**: The model exists but cannot generate images. Possible solutions:
- Your API key may not have access to Imagen 3
- The model name may have changed
- You may need to enable billing or additional APIs

### ❌ ERROR (Model Not Found)

```
❌ ERROR: Model not found: gemini-3-pro-image-preview

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ TEST FAILED

⚠️  Model not available with your API key

💡 Solutions:
   1. Verify API key has Imagen 3 access
   2. Check if model name is correct
   3. Enable required APIs in Google Cloud Console
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**This means**: The model doesn't exist or isn't accessible. Solutions:
- Check [Google AI Studio](https://aistudio.google.com/) for available models
- Verify your API key has the right permissions
- Enable the Generative Language API in Google Cloud Console

## Additional Test Functions

### Test All Available Models

```javascript
await testImageGenerationModels()
```

This tests multiple models to find which ones support image generation.

### Quick Test

```javascript
await quickImageTest()
```

A faster, simpler test of just the main model.

## Troubleshooting

### "API_KEY is undefined"

1. Check `.env.local` file has `GEMINI_API_KEY=your_key_here`
2. Restart the dev server after modifying `.env.local`
3. Verify the API key is valid in [Google AI Studio](https://aistudio.google.com/)

### "Quota exceeded"

1. Check your quota in Google Cloud Console
2. Verify billing is enabled
3. Wait a few minutes and retry

### Still not working?

If the test fails, you have several options:

1. **Use Vertex AI** - More reliable for production image generation
2. **External API** - Integrate Stability AI, DALL-E, or Midjourney
3. **Contact Support** - Verify your API key has Imagen 3 access

## What This Means for Your Project

- **If test PASSES**: Your @handle reference system should work perfectly
- **If test FAILS**: You'll need an alternative image generation solution

The test isolates whether the issue is:
- API access problem (solvable by enabling APIs/billing)
- Model compatibility (may need different model or API)
- Configuration issue (restart server, check .env)
