# 🚀 Rangkai Marketplace - Setup Guide

Welcome! Follow these steps to get your marketplace running.

---

## 📁 Step 1: Create Project Folder

Open your terminal in VS Code (View → Terminal) and navigate to where you want the project:

```bash
# Go to your marketplace-protocol folder
cd C:\Users\chris\marketplace-protocol

# Create new folder for the reference client
mkdir rangkai-marketplace
cd rangkai-marketplace
```

---

## 📂 Step 2: Create Folder Structure

Create all the folders we need:

```bash
# For Windows (PowerShell)
New-Item -ItemType Directory -Path app, components, lib, styles, public, public/images

# Or manually create these folders in VS Code:
# - app/
# - components/
# - lib/
# - styles/
# - public/
# - public/images/
```

---

## 📄 Step 3: Copy Files

Copy each file from the artifacts I created into your project:

### Root Files (in `rangkai-marketplace/`)
1. `package.json`
2. `next.config.js`
3. `tailwind.config.js`
4. `postcss.config.js`
5. `tsconfig.json`
6. `.env.local.example`

### App Files (in `rangkai-marketplace/app/`)
1. `layout.tsx`
2. `page.tsx`
3. `globals.css`

### Component Files (in `rangkai-marketplace/components/`)
1. `Header.tsx`
2. `Footer.tsx`

### Lib Files (in `rangkai-marketplace/lib/`)
1. `sdk.ts`

---

## 🔑 Step 4: Create Environment File

Copy `.env.local.example` to `.env.local`:

```bash
# Copy the example file
copy .env.local.example .env.local
```

Edit `.env.local` and set your API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 📦 Step 5: Install Dependencies

This will download all the tools we need:

```bash
npm install
```

**What this does:**
- Downloads Next.js (website framework)
- Downloads React (UI library)
- Downloads Tailwind CSS (styling)
- Links your @rangkai/sdk (your protocol!)
- Downloads other helpful tools

**This takes 2-3 minutes.** You'll see a progress bar. ☕

---

## 🎨 Step 6: Start Development Server

Run this command to start your site:

```bash
npm run dev
```

**What you'll see:**
```
- ready started server on 0.0.0.0:3000, url: http://localhost:3000
- event compiled client and server successfully
```

---

## 🎉 Step 7: View Your Site!

Open your browser and go to:
```
http://localhost:3000
```

**You should see:**
- ✅ Beautiful home page with Studio McGee styling
- ✅ Clean navigation header
- ✅ Category cards (Footwear, Bags, etc.)
- ✅ Footer with links
- ✅ Everything in warm neutrals and sharp corners!

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@rangkai/sdk'"

**Solution:** Link your SDK:
```bash
# Go to your SDK folder
cd ../packages/sdk

# Create link
npm link

# Go back to marketplace
cd ../../rangkai-marketplace

# Use the link
npm link @rangkai/sdk
```

### Issue: Port 3000 already in use

**Solution:** Either:
1. Stop your protocol API temporarily
2. Or change Next.js port:
```bash
npm run dev -- -p 3001
```
Then visit `http://localhost:3001`

### Issue: Styles not loading

**Solution:** 
1. Make sure `globals.css` is in `app/globals.css` (not `styles/`)
2. Restart dev server (Ctrl+C, then `npm run dev`)

---

## ✅ Success Checklist

After setup, you should have:
- [ ] Project folder created
- [ ] All files copied
- [ ] Dependencies installed
- [ ] Dev server running
- [ ] Home page visible in browser
- [ ] Navigation working (hover effects)
- [ ] Sharp corners everywhere (no rounded borders!)
- [ ] Studio McGee color palette (warm neutrals)

---

## 🎯 What We Built Today

### Files Created: 11
1. Configuration files (5)
2. Layout components (3)
3. Pages (1)
4. SDK wrapper (1)
5. Styles (1)

### Features Working:
- ✅ Beautiful home page
- ✅ Responsive navigation
- ✅ Category preview
- ✅ Footer with links
- ✅ Studio McGee aesthetic
- ✅ Mobile-friendly

### Not Yet Working (We'll Build These Next):
- ⏳ Product listing page
- ⏳ Product details
- ⏳ Authentication
- ⏳ Shopping cart
- ⏳ Vendor dashboard

---

## 📚 Understanding the Code

### What is Next.js?
Think of it like WordPress, but for developers. It makes building fast, modern websites easier.

### What is React?
A way to build websites using reusable components (like LEGO blocks).

### What is Tailwind CSS?
Instead of writing CSS files, you add styling classes directly to HTML:
```tsx
// Traditional CSS
<div className="header"></div>
// Then in CSS file: .header { background: white; padding: 20px; }

// Tailwind CSS
<div className="bg-white p-6"></div>
// Styling right there! No separate CSS file needed.
```

### What is TypeScript?
JavaScript with type checking. It catches errors before you run the code:
```typescript
// JavaScript - might crash
function greet(name) {
  return "Hello " + name
}
greet(123) // Oops! Works but weird

// TypeScript - won't let you make mistakes
function greet(name: string) {
  return "Hello " + name
}
greet(123) // Error! TypeScript says "name must be text, not number"
```

---

## 🎓 Key Concepts

### 1. Components
Reusable pieces of UI:
```tsx
// Header.tsx is a component
// You use it in layout.tsx like this:
<Header />

// It's like a custom HTML tag you created!
```

### 2. Pages
Next.js automatically creates routes from files:
```
app/page.tsx          → http://localhost:3000/
app/products/page.tsx → http://localhost:3000/products
```

### 3. Client vs Server
```tsx
// Server Component (default)
// Runs on server, faster
export default function Page() { }

// Client Component
// Runs in browser, can use clicks/interactions
'use client'
export default function Header() { }
```

---

## 🚀 Next Session Preview

In Session 2, we'll build:
1. **Product listing page** - Show all footwear
2. **Connect to your SDK** - Real data from protocol
3. **Product cards** - Beautiful grid layout
4. **Filters** - Search by price, style, etc.

**Goal:** Browse real products from your protocol! 👟

---

## 💡 Tips

1. **Keep dev server running** - Leave `npm run dev` running while you code. Changes appear instantly!

2. **Save often** - VS Code auto-saves, but Ctrl+S is your friend.

3. **Use browser dev tools** - Press F12 to see errors and inspect elements.

4. **Read error messages** - They're usually helpful! Copy-paste them to me if stuck.

---

## 📞 Need Help?

Ask me anything! Common questions:

**Q: "Where does this file go?"**
A: Check the file path at the top of each artifact.

**Q: "What does this code do?"**
A: Point to any line, I'll explain it!

**Q: "It's not working!"**
A: Share the error message - we'll fix it together!

---

**Ready to see your beautiful site? Follow the steps above!** 🎨✨