# 🎯 QUICK GUIDE - Hide/Show Categories Feature

## The Feature You Wanted ✅

**Requirement**: When Server 2 is open, Server 1's categories and header disappear

**Status**: ✅ **ALREADY IMPLEMENTED**

---

## How to Test It

### Step 1: Open App
Open `index.html` in your browser

### Step 2: Initial State
You see:
```
[Sidebar]          [Main Content]
Server For Edit    
─────────────────
IMAGE              (metadata content here)
  #viewing
  #editing
  #dataset
FILE
  #lora-metadata
```

### Step 3: Click Stable Diffusion Server (✨)
Now you see:
```
[Sidebar]          [Main Content]
Server Gen Img     
─────────────────
PICTURES           (generation content here)
  #txt2img
  #img2img
  #inpaint
  #settings
```

**Notice**: "Server For Edit", "IMAGE", and "FILE" are **COMPLETELY GONE**

### Step 4: Click Metadata Server (📷)
Back to Step 2:
```
[Sidebar]          [Main Content]
Server For Edit    
─────────────────
IMAGE              (metadata content here)
  #viewing
  #editing
  #dataset
FILE
  #lora-metadata
```

**Everything comes back!**

---

## What's Happening Behind the Scenes

### HTML
Two separate channel lists:
```html
<div class="channel-list active" id="metadata-channel-list">
    <!-- Server 1: visible by default -->
</div>

<div class="channel-list hidden" id="sd-channel-list">
    <!-- Server 2: hidden by default -->
</div>
```

### JavaScript
```javascript
if (clickedServer === 'Server 2') {
    hideList1();    // Hide Server 1 completely
    showList2();    // Show Server 2
} else {
    showList1();    // Show Server 1
    hideList2();    // Hide Server 2 completely
}
```

### CSS
```css
.hidden {
    display: none;  /* Completely hidden */
}
```

---

## Key Points

✅ **Server 1 content disappears completely** when Server 2 is active
- Header ("Server For Edit") ← Gone
- Categories (IMAGE, FILE) ← Gone  
- Channels ← Gone

✅ **Server 2 content appears completely** when Server 2 is active
- Header ("Server Gen Img") ← Shows
- Categories (PICTURES) ← Shows
- Channels ← Show

✅ **Smooth transitions** between servers
✅ **No flickering** or errors

---

## File References

If you want to understand the code:

1. **See the HTML structure**: `index.html` lines 34-67
2. **See the JavaScript logic**: `script.js` lines 1341-1375
3. **See the CSS styling**: `style.css` lines 83-103

---

## Troubleshooting

### Categories Still Showing?
1. Press `Ctrl+F5` (hard refresh)
2. Close browser completely and reopen
3. Check browser console (`F12`) for errors

### Nothing Happening When Clicking?
1. Check browser console for JavaScript errors
2. Make sure you clicked on the server icon (not elsewhere)
3. Check that server icons have proper titles:
   - First server: `title="Metadata Image"`
   - Second server: `title="Stable Diffusion"`

---

## Configuration Files

### Three Files Control This Feature

| File | Purpose | Key Lines |
|------|---------|-----------|
| index.html | HTML structure | 34, 57 |
| script.js | Logic/events | 1341-1375 |
| style.css | Styling/transitions | 83-103 |

All properly configured! ✅

---

## Summary

Your requirement **is already implemented and working**.

When you click between servers:
- Server 1 shows/hides completely
- Server 2 shows/hides completely
- Smooth transitions
- Professional appearance

**Everything is ready!** 🚀

---

*Quick Guide Created: November 21, 2025*  
*Status: Feature Complete ✅*
