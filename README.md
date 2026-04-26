# 🎉 WOW Surprises

> **Make It WOW!** — A premium surprise gifting platform for creating unforgettable moments across Nigeria.

![WOW Surprises](images/wowlogo.png)

---

## 🌐 Live Site

[wow-suprises.vercel.app](https://wow-suprises.vercel.app)

---

## 📋 Overview

WOW Surprises is a full-stack web application that connects customers with merchants to plan and deliver bespoke surprise experiences — from birthday setups and marriage proposals to corporate events and romantic dinners.

The platform supports three user roles:

| Role | Access | Entry Point |
|------|--------|-------------|
| **Customer** | Browse packages, book surprises, manage orders | `login.html` |
| **Merchant** | List services, manage bookings, track earnings | `login.html` |
| **Admin** | Full platform oversight and management | `login.html?role=admin` |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vanilla HTML, CSS, JavaScript |
| Styling | Tailwind CSS (CDN), Custom `wow-theme.css` |
| Backend | [Supabase](https://supabase.com) (Auth + PostgreSQL) |
| Payments | [Flutterwave](https://flutterwave.com) |
| Hosting | [Vercel](https://vercel.com) |
| Icons | Material Symbols, Bootstrap Icons |
| Fonts | Plus Jakarta Sans, Be Vietnam Pro |

---

## 📁 Project Structure

```
wow-suprises/
├── index.html                  # Homepage — package discovery
├── login.html                  # Unified auth (Customer + Merchant + Admin)
├── booking.html                # 5-step booking flow
├── booking-history.html        # Customer order history
├── package-details.html        # Individual package view
├── custom-package.html         # Custom surprise builder
├── reviews.html                # Customer reviews
├── faq.html                    # FAQ with search & accordion
├── privacy-policy.html
├── terms-of-service.html
├── refund-policy.html
│
├── css/
│   └── wow-theme.css           # Shared design system (all pages)
│
├── js/
│   ├── config.js               # Supabase URL & anon key
│   ├── supabaseApi.js          # Role-aware Supabase auth + API
│   ├── utils.js                # Shared utilities
│   ├── packages.js             # Package rendering & filters
│   ├── booking.js              # Booking form logic + Flutterwave
│   ├── booking-history.js      # Booking history & status updates
│   └── reviews.js              # Reviews load & submit
│
├── admin/
│   ├── admin-dashboard.html
│   ├── admin-bookings.html
│   ├── admin-orders.html
│   ├── admin-packages.html
│   ├── admin-users.html
│   ├── admin-merchants.html
│   ├── admin-analytics.html
│   ├── admin-payouts.html
│   ├── admin-settings.html
│   ├── admin-navigation.html   # Shared sidebar component
│   ├── admin-login.html        # Redirects to /login.html
│   ├── css/
│   │   └── admin.css           # Admin design system
│   └── js/
│       ├── admin-auth.js       # Admin session management
│       └── admin-config.js     # Admin Supabase config
│
├── merchant/
│   ├── merchant-dashboard.html
│   ├── merchant-bookings.html
│   ├── merchant-orders.html
│   ├── merchant-order-details.html
│   ├── merchant-services.html
│   ├── merchant-earnings.html
│   ├── merchant-reviews.html
│   ├── merchant-profile.html
│   ├── merchant-settings.html
│   ├── merchant-login.html     # Redirects to /login.html
│   ├── css/
│   │   └── merchant.css        # Merchant design system
│   └── js/
│       ├── merchant-auth.js    # Merchant session management
│       └── merchant-config.js  # Merchant Supabase config
│
├── images/                     # Static assets & product images
├── data/                       # Static JSON data files
└── database/                   # Supabase schema & migrations
```

---

## 🔐 Authentication

Authentication is handled by **Supabase Auth** with role-based access control stored in `user_metadata` and the `profiles` table.

### Sign In Flow

All users sign in through a single unified page at `login.html`:

- **Customers** and **Merchants** see role cards and sign in/register normally
- **Admins** access a hidden role card via the secret URL:
  ```
  /login.html?role=admin
  ```

### Role Redirects After Login

| Role | Redirected To |
|------|--------------|
| Customer | `index.html` |
| Merchant | `merchant/merchant-dashboard.html` |
| Admin | `admin/admin-dashboard.html` |

### Route Protection

Every protected page calls the appropriate auth guard on load:
- `API.auth.getSession()` — customer pages
- `MerchantAuth.requireAuth()` — merchant pages
- `requireAdminAuth()` — admin pages

All guards redirect to `login.html` if the session is invalid or the role doesn't match.

---

## ⚙️ Environment Setup

### 1. Clone the repo

```bash
git clone https://github.com/Bex-Labs/wow-suprises.git
cd wow-suprises
```

### 2. Configure Supabase

Open `js/config.js` and set your Supabase project credentials:

```js
window.SUPABASE_CONFIG = {
  url: 'https://your-project.supabase.co',
  anonKey: 'your-anon-key'
};
```

Do the same for `admin/js/admin-config.js` and `merchant/js/merchant-config.js`.

### 3. Configure Flutterwave

Open `js/config.js` and set your Flutterwave public key:

```js
window.FLUTTERWAVE_PUBLIC_KEY = 'FLWPUBK_TEST-xxxxxxxxxxxx';
```

### 4. Run locally

Since this is a static site, simply open `index.html` in your browser or use a local server:

```bash
# Using VS Code Live Server, or:
npx serve .
```

---

## 🗄 Database

The Supabase schema includes the following core tables:

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with role (`customer`, `merchant`, `admin`) |
| `packages` | Merchant-listed surprise packages |
| `bookings` | Customer bookings with status tracking |
| `merchants` | Merchant business profiles |
| `reviews` | Customer reviews (moderated) |
| `custom_package_requests` | Custom surprise enquiries |
| `admin_activity_logs` | Admin action audit trail |

Schema files are in the `database/` folder.

---

## 💳 Payments

Payments are processed via **Flutterwave** and support:
- Debit/Credit Cards (Visa, Mastercard, Verve)
- Bank Transfer
- USSD
- Mobile Money (Opay, PalmPay)

Payment references are stored against bookings in Supabase for reconciliation.

---

## 🚀 Deployment

The project is deployed on **Vercel** as a static site.

**Auto-deploy:** Every push to the `main` branch triggers an automatic Vercel deployment.

**Manual deploy via Vercel CLI:**
```bash
npm i -g vercel
vercel --prod
```

---

## 🎨 Design System

All pages share a unified design system defined in `css/wow-theme.css` with:

- **Primary colour:** `#6200EE` (purple)
- **Secondary colour:** `#B00020` (red)
- **Fonts:** Plus Jakarta Sans (headlines) + Be Vietnam Pro (body)
- **Components:** Buttons, cards, forms, modals, navbar, footer, badges, alerts

The admin and merchant portals have their own supplementary stylesheets (`admin.css`, `merchant.css`) that extend the same design tokens.

---

## 👥 Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit: `git commit -m "Add your feature"`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request to `main`

---

## 📞 Support

For platform-related questions contact the WOW Surprises team:

- **Email:** hello@wowsurprises.com
- **Phone:** +234 801 234 5678
- **Location:** Victoria Island, Lagos, Nigeria

---

## 📄 License

This project is proprietary software owned by **Bex Labs**. All rights reserved.

---

<p align="center">Built with ❤️ by the Bex Labs team · <a href="https://wow-suprises.vercel.app">wow-suprises.vercel.app</a></p>
