# 📂 Rangkai Marketplace - Folder Structure

Here's what your project should look like after setup:

```
rangkai-marketplace/
│
├── 📄 package.json              ← Lists all dependencies
├── 📄 next.config.js            ← Next.js configuration
├── 📄 tailwind.config.js        ← Design system (colors, spacing)
├── 📄 postcss.config.js         ← CSS processing
├── 📄 tsconfig.json             ← TypeScript configuration
├── 📄 .env.local                ← Your secret settings (API URL)
├── 📄 .env.local.example        ← Template for .env.local
│
├── 📁 app/                      ← Pages and layouts
│   ├── 📄 layout.tsx            ← Wraps every page (header + footer)
│   ├── 📄 page.tsx              ← Home page (/)
│   └── 📄 globals.css           ← Global styles
│
├── 📁 components/               ← Reusable UI pieces
│   ├── 📄 Header.tsx            ← Top navigation
│   └── 📄 Footer.tsx            ← Bottom footer
│
├── 📁 lib/                      ← Helper code
│   └── 📄 sdk.ts                ← Protocol SDK wrapper
│
├── 📁 public/                   ← Static files (images, icons)
│   └── 📁 images/               ← Product photos go here
│
└── 📁 node_modules/             ← Installed dependencies (auto-generated)
```

---

## 🎯 What Each Folder Does

### `app/` - Your Pages
- Every file here becomes a page on your site
- `page.tsx` = the actual page content
- `layout.tsx` = shared wrapper (header, footer)

**Example:**
```
app/page.tsx              → http://localhost:3000/
app/products/page.tsx     → http://localhost:3000/products
app/products/[id]/page.tsx → http://localhost:3000/products/123
```

---

### `components/` - Reusable Pieces
- Build once, use everywhere
- Like LEGO blocks for your site

**Example:**
```tsx
// Create once in components/Button.tsx
<Button>Click Me</Button>

// Use everywhere
<Button>Shop Now</Button>
<Button>Add to Cart</Button>
<Button>Checkout</Button>
```

---

### `lib/` - Helper Functions
- SDK connection
- Utility functions
- Shared logic

**Example:**
```tsx
// In lib/sdk.ts
export const sdk = createSDK()

// Use in any page
import { sdk } from '@/lib/sdk'
const products = await sdk.catalog.search()
```

---

### `public/` - Static Files
- Images, fonts, icons
- Accessible at `/image-name.jpg`

**Example:**
```
public/logo.png → <img src="/logo.png" />
```

---

## 📦 Key Files Explained

### `package.json`
**What it is:** Recipe for your project  
**What it does:** Lists all the tools you need  
**You'll edit it:** Rarely (only to add new tools)

```json
{
  "name": "rangkai-marketplace",
  "dependencies": {
    "next": "14.2.15",      ← Website framework
    "react": "^18.3.1",     ← UI library
    "tailwindcss": "^3.4.14" ← Styling
  }
}
```

---

### `next.config.js`
**What it is:** Next.js settings  
**What it does:** Configures image optimization, domains, etc.  
**You'll edit it:** Sometimes (to add allowed image domains)

```javascript
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: '**.supabase.co' } // Allow Supabase images
    ]
  }
}
```

---

### `tailwind.config.js`
**What it is:** Your design system  
**What it does:** Defines colors, fonts, spacing  
**You'll edit it:** To add new colors or styles

```javascript
theme: {
  extend: {
    colors: {
      'warm-white': '#FAFAF8',  // Your custom colors
      'warm-taupe': '#8B7355',
    }
  }
}
```

---

### `.env.local`
**What it is:** Secret configuration  
**What it does:** Stores API URLs, keys  
**You'll edit it:** To change API endpoints  
**⚠️ Never commit this to GitHub!**

```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 🔄 How Files Connect

```
User visits http://localhost:3000
         ↓
    app/layout.tsx loads
    (adds Header and Footer)
         ↓
    app/page.tsx loads
    (your home page content)
         ↓
    components/Header.tsx
    components/Footer.tsx
         ↓
    Styles from app/globals.css applied
         ↓
    Beautiful page renders! ✨
```

---

## 🎨 Design System Location

All your Studio McGee styling lives in:

1. **tailwind.config.js** - Color palette, spacing
2. **app/globals.css** - Custom styles, utilities
3. **Components** - Reusable styled elements

---

## 📁 Future Structure (Sessions 2-5)

As we build more features, we'll add:

```
app/
├── products/
│   ├── page.tsx           ← Product listing
│   └── [id]/
│       └── page.tsx       ← Single product
├── auth/
│   ├── login/
│   │   └── page.tsx       ← Login page
│   └── register/
│       └── page.tsx       ← Sign up page
├── cart/
│   └── page.tsx           ← Shopping cart
├── vendors/
│   └── dashboard/
│       └── page.tsx       ← Vendor dashboard

components/
├── products/
│   ├── ProductCard.tsx    ← Product display
│   ├── ProductGrid.tsx    ← Product grid layout
│   └── ProductFilter.tsx  ← Search filters
├── auth/
│   └── LoginForm.tsx      ← Login form
└── cart/
    └── CartItem.tsx       ← Cart item display
```

---

## 💡 Pro Tips

### 1. File Naming Conventions
- Components: `PascalCase.tsx` (ProductCard.tsx)
- Pages: `lowercase/page.tsx` (products/page.tsx)
- Utilities: `camelCase.ts` (formatPrice.ts)

### 2. Import Aliases
```tsx
// ✅ Good - using alias
import { sdk } from '@/lib/sdk'

// ❌ Bad - relative path
import { sdk } from '../../../lib/sdk'
```

The `@/` is a shortcut that always points to your project root!

### 3. File Organization
- Keep related files together
- Don't nest too deep (max 3 levels)
- Name files by what they do

---

## 🚀 Quick Reference

| Need to... | Look in... |
|------------|-----------|
| Add a new page | `app/` folder |
| Create reusable UI | `components/` folder |
| Connect to protocol | `lib/sdk.ts` |
| Change colors | `tailwind.config.js` |
| Add custom CSS | `app/globals.css` |
| Configure API URL | `.env.local` |
| Add images | `public/images/` |

---

## ✅ Checklist

After copying all files, verify:
- [ ] All folders created
- [ ] All 11 files copied
- [ ] File paths match this structure
- [ ] No TypeScript errors in VS Code
- [ ] `.env.local` created (copy from example)

---

**Your folder structure is the foundation!** Get this right, and everything else will be smooth sailing! 🚢