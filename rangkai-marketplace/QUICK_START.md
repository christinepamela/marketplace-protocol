# ⚡ Quick Start Checklist

Follow these steps **in order**. Check off each one as you complete it!

---

## Step 1: Create Project Folder
```bash
cd C:\Users\chris\marketplace-protocol
mkdir rangkai-marketplace
cd rangkai-marketplace
```
- [ ] Folder created
- [ ] Navigated into it

---

## Step 2: Create Subfolders

**Option A - PowerShell:**
```powershell
New-Item -ItemType Directory -Path app, components, lib, public, public/images
```

**Option B - Manually in VS Code:**
1. Right-click in Explorer
2. New Folder
3. Create: `app`, `components`, `lib`, `public`, `public/images`

- [ ] `app/` folder created
- [ ] `components/` folder created
- [ ] `lib/` folder created
- [ ] `public/` folder created
- [ ] `public/images/` folder created

---

## Step 3: Copy Root Files

Copy these 6 files to `rangkai-marketplace/` root:

1. [ ] `package.json`
2. [ ] `next.config.js`
3. [ ] `tailwind.config.js`
4. [ ] `postcss.config.js`
5. [ ] `tsconfig.json`
6. [ ] `.env.local.example`

---

## Step 4: Copy App Files

Copy these 3 files to `rangkai-marketplace/app/`:

1. [ ] `layout.tsx`
2. [ ] `page.tsx`
3. [ ] `globals.css`

---

## Step 5: Copy Component Files

Copy these 2 files to `rangkai-marketplace/components/`:

1. [ ] `Header.tsx`
2. [ ] `Footer.tsx`

---

## Step 6: Copy Lib Files

Copy this 1 file to `rangkai-marketplace/lib/`:

1. [ ] `sdk.ts`

---

## Step 7: Create Environment File

```bash
copy .env.local.example .env.local
```

Then edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

- [ ] `.env.local` created
- [ ] API URL set

---

## Step 8: Link Your SDK

```bash
# Go to SDK folder
cd ../packages/sdk

# Create global link
npm link

# Go back to marketplace
cd ../../rangkai-marketplace

# Use the link
npm link @rangkai/sdk
```

- [ ] SDK linked successfully

---

## Step 9: Install Dependencies

```bash
npm install
```

**Wait 2-3 minutes.** You'll see:
```
added XXX packages in XXs
```

- [ ] Dependencies installed
- [ ] No error messages

---

## Step 10: Start Dev Server

```bash
npm run dev
```

**Wait for:**
```
✓ Ready in X seconds
○ Local:        http://localhost:3000
```

- [ ] Server started
- [ ] No error messages

---

## Step 11: Test in Browser

Open: `http://localhost:3000`

**You should see:**
- [ ] Rangkai logo in header
- [ ] Navigation links (Shop, Vendors, About)
- [ ] Hero section with "Global Marketplace..." headline
- [ ] Three feature cards (Non-Custodial, Global Reach, Fair Fees)
- [ ] Four category cards (Footwear, Bags, Accessories, Home)
- [ ] Footer with links

---

## Step 12: Test Navigation

Click around and verify:
- [ ] Hover effects work (links change color)
- [ ] Mobile menu button works (click hamburger icon)
- [ ] Sharp corners everywhere (no rounded borders!)
- [ ] Warm neutral colors (Studio McGee palette)

---

## Step 13: Check Responsiveness

Resize browser window or press F12 → Device Toolbar

Test these widths:
- [ ] Mobile (375px) - menu collapses
- [ ] Tablet (768px) - grid adjusts
- [ ] Desktop (1280px+) - full layout

---

## 🎉 Success Criteria

If you can check ALL of these, you're ready for Session 2!

### Visual Check
- [ ] Home page loads without errors
- [ ] All text is readable (not too light/dark)
- [ ] Images/icons display (emoji placeholders)
- [ ] Layout looks clean and organized
- [ ] Sharp corners on all cards/buttons

### Technical Check
- [ ] No console errors (F12 → Console tab)
- [ ] Dev server running without crashes
- [ ] Hot reload works (edit a file, see changes instantly)
- [ ] TypeScript shows no red squiggles in VS Code

---

## 🐛 Common Issues & Fixes

### Issue 1: "Cannot find module '@rangkai/sdk'"
**Fix:**
```bash
cd ../packages/sdk
npm link
cd ../../rangkai-marketplace
npm link @rangkai/sdk
npm run dev
```

### Issue 2: "Port 3000 already in use"
**Fix:** Use different port:
```bash
npm run dev -- -p 3001
```
Then visit `http://localhost:3001`

### Issue 3: Styles not loading (everything looks unstyled)
**Fix:**
1. Check `app/globals.css` exists (not `styles/globals.css`)
2. Check `app/layout.tsx` imports it: `import './globals.css'`
3. Restart dev server (Ctrl+C, then `npm run dev`)

### Issue 4: TypeScript errors in VS Code
**Fix:**
1. Wait 10 seconds (TypeScript is indexing)
2. Reload VS Code window: Ctrl+Shift+P → "Reload Window"
3. Check `tsconfig.json` exists in root

---

## 📸 What Success Looks Like

Your home page should have:

### Header (Top)
```
Rangkai          Shop  Vendors  About     🔍 👤 🛒
────────────────────────────────────────────────────
```

### Hero (Big text)
```
     Global Marketplace for Small Businesses
       Connecting artisans and manufacturers...
            [Shop Now]  [Start Selling]
```

### Features (3 boxes)
```
🛡️             🌐              ⚡
Non-Custodial  Global Reach  Fair Fees
```

### Categories (4 cards)
```
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│ 👟  │ │ 👜  │ │ ⌚  │ │ 🏠  │
│Foot │ │Bags │ │Accs │ │Home │
└─────┘ └─────┘ └─────┘ └─────┘
```

### Footer (Bottom)
```
Rangkai     Shop        For Vendors    Support
...         ...         ...            ...
────────────────────────────────────────────
© 2024 Rangkai Protocol. Built on Bitcoin.
```

---

## ✅ Final Verification

Run through this checklist one more time:

1. [ ] All 11 files copied to correct locations
2. [ ] Dependencies installed (`node_modules/` folder exists)
3. [ ] SDK linked (no import errors)
4. [ ] Environment file created (`.env.local`)
5. [ ] Dev server running (`npm run dev`)
6. [ ] Browser showing home page (no blank page)
7. [ ] No console errors (press F12)
8. [ ] Visual design matches Studio McGee aesthetic
9. [ ] Everything responsive (mobile, tablet, desktop)
10. [ ] Ready to build product listing! 🚀

---

## 🎯 Next Steps

Once everything above is ✅, you're ready for **Session 2: Product Listing!**

We'll build:
- Product listing page
- Connect to your protocol
- Show real footwear products
- Add search and filters

**Estimated time:** 2-3 hours  
**Difficulty:** ⭐⭐ (Medium)

---

## 📞 Questions?

If you get stuck:
1. Check error message in terminal or browser console
2. Verify file locations match folder structure
3. Make sure all files are saved
4. Try restarting dev server

**Copy-paste any error messages to me and I'll help!** 🤝

---

**You've got this!** Take it step by step, check off each box, and you'll have a beautiful site running in no time! 🎨✨