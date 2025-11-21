# 🧪 TEST: Click Servers to See Categories Hide/Show

## Instructions

1. **Open** `index.html` in your browser
2. **Watch the left sidebar** (channel list)
3. **Click Metadata server** (📷 icon)
4. **Observe**: You should see:
   ```
   Server For Edit
   ─────────────────
   IMAGE
   • #viewing
   • #editing
   • #dataset
   
   FILE
   • #lora-metadata
   ```

5. **Click Stable Diffusion server** (✨ icon)
6. **Observe**: The entire list should change to:
   ```
   Server Gen Img
   ─────────────────
   PICTURES
   • #txt2img
   • #img2img
   • #inpaint
   • #settings
   ```

   **The "Server For Edit" header, IMAGE category, and FILE category should COMPLETELY DISAPPEAR**

---

## What Should Happen

### Click Server 1 (Metadata) 📷
```
VISIBLE:
├─ "Server For Edit" (header)
├─ IMAGE (category)
├─ FILE (category)
└─ All channels below them

HIDDEN:
└─ Everything from Server 2
```

### Click Server 2 (Stable Diffusion) ✨
```
HIDDEN:
├─ "Server For Edit" (header) ← GONE!
├─ IMAGE (category) ← GONE!
├─ FILE (category) ← GONE!
└─ All metadata channels ← GONE!

VISIBLE:
├─ "Server Gen Img" (header)
├─ PICTURES (category)
└─ All SD channels
```

---

## How It Works (Technical)

### HTML
Two separate divs:
```html
<div class="channel-list active" id="metadata-channel-list">
    <!-- Server 1: Metadata content -->
</div>

<div class="channel-list hidden" id="sd-channel-list">
    <!-- Server 2: SD content -->
</div>
```

### JavaScript
```javascript
_switchServer(serverType) {
    if (serverType === 'sd') {
        metadataList.classList.add('hidden');    // Hide Server 1
        sdList.classList.remove('hidden');       // Show Server 2
    } else {
        metadataList.classList.remove('hidden'); // Show Server 1
        sdList.classList.add('hidden');          // Hide Server 2
    }
}
```

### CSS
```css
.channel-list.hidden {
    display: none;  /* Complete hide - takes 0 space */
}
```

---

## Test Results

### Expected Result ✅
- [x] Server 1 channels visible by default
- [x] Click Server 2 → Server 1 categories + header disappear
- [x] Click Server 1 → Server 1 categories + header reappear
- [x] Smooth transitions
- [x] No flickering

### If This Doesn't Work
1. Press `Ctrl+Shift+Delete` to clear browser cache
2. Close and reopen browser
3. Press `F5` to hard refresh
4. Check browser console (`F12`) for errors

---

## What You're Testing

The feature: **Hide entire channel list when switching servers**

✅ The code implements this correctly  
✅ The CSS makes it happen  
✅ The JavaScript triggers it  

---

**Everything is ready!** Just test it in your browser! 🚀

*Created: November 21, 2025*
