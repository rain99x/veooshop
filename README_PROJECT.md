# veoo — Handmade Jewelry Shop

> This document is written for the project owner. It explains what the app does, what is already built, and what could come next.

---

## 1. Project Purpose

**veoo** is a small online showroom for handmade jewelry. It lets visitors browse a curated collection, add pieces to a cart, and place orders by sending a message on Instagram. There is also a private admin area where the shop team can manage products, track orders, and update inventory.

The tone of the site is quiet and minimal — soft colors, elegant typography, and no loud promotions.

---

## 2. Current Implemented Features

### For customers
- Browse the homepage with featured pieces
- View the full shop collection with search and category filters
- Click a product to see details, choose colors (if available), check stock, and add to cart
- Add items to a cart that updates instantly and stays saved between visits
- Review the cart, select/deselect items, change quantities, or remove items
- Go through checkout to generate an order summary and copy it to send via Instagram DM
- Read an About page that explains the brand story

### For staff (admin)
- Log in with email and password
- Reset forgotten passwords via email link
- View all orders in a dashboard with status filters (Pending, Confirmed, Paid, Preparing, Ready for pickup, Completed, Cancelled)
- Update order status and add internal notes
- Manage the product catalog: add, edit, hide, or delete products
- Manage product variants (colors) and stock counts
- Update inventory with change logs tracked automatically
- Manage team access: invite staff by email and assign roles (Admin or Inventory Staff)
- Change your own account password

### Technical safeguards
- Only users with a "staff" role can enter the admin area
- Two role levels: **Admin** (full control) and **Inventory Staff** (can update stock only)
- Product images, stock numbers, and tags are stored in a database
- Cart data is saved in the visitor's browser so it persists across sessions
- Passwords are handled securely through the auth system

---

## 3. Existing Pages and Routes

| Page | URL | Who can see it |
|------|-----|----------------|
| Home | `/` | Everyone |
| Shop | `/shop` | Everyone |
| Product Detail | `/shop/:id` | Everyone |
| Cart | `/cart` | Everyone |
| Checkout | `/checkout` | Everyone |
| About | `/about` | Everyone |
| Login | `/login` | Everyone |
| Reset Password | `/reset-password` | Everyone (via email link) |
| Admin — Orders | `/admin` | Staff only |
| Admin — Products | `/admin/products` | Staff only |
| Admin — Team | `/admin/team` | Admin only |
| Admin — Account | `/admin/account` | Staff only |

---

## 4. User Flow (Customer Journey)

1. A visitor lands on the **Home** page and sees featured jewelry.
2. They click "Explore the collection" or use the top menu to go to the **Shop**.
3. They can search by name or filter by category (e.g., rings, necklaces).
4. They click a product card to open the **Product Detail** page.
5. On the detail page they can:
   - See photos, description, price, and stock
   - Choose a color if the piece has variants
   - Adjust quantity
   - Click **Add to cart** or **Buy now**
6. The cart icon in the top-right corner shows the current count.
7. They can open the **Cart** drawer to review items, then proceed to the full **Cart** page.
8. On the **Checkout** page they enter:
   - Name
   - Phone number
   - Shipping address
   - Optional note
9. The page generates an order summary and an order code.
10. The customer copies the summary and opens Instagram to send it to `@veooshop`.
11. After messaging, they click "I have sent the message — complete" to clear the cart.

> **Important:** There is no online payment inside the app. All orders are finalized through Instagram direct messages.

---

## 5. Admin Flow (Staff Journey)

1. A staff member goes to `/login` and signs in with email and password.
2. If they don't have an account, they can sign up first; an admin must then grant them a role via the **Team** page.
3. Once inside `/admin`, they land on the **Orders** dashboard.
4. They can:
   - Filter orders by status
   - Click into an order to change its status and write internal notes
   - Track how many items and the total amount per order
5. From the sidebar they can switch to:
   - **Products** — view, search, edit, add, or delete products; update stock counts
   - **Team** — add or remove staff access (Admins only)
   - **Account** — change their own password

---

## 6. Data Storage

| What | Where | Notes |
|------|-------|-------|
| Products, tags, variants, orders, inventory logs, status logs, user roles | **Supabase (cloud database)** | This is the main source of truth for all shop data |
| Cart items | **Browser localStorage** | Each visitor's cart lives in their own browser; it is not stored in the cloud |
| User accounts & passwords | **Supabase Auth** | Secure, handled automatically |
| Session / login state | **Browser localStorage** | Keeps staff logged in across visits |

---

## 7. Current Dependencies and External Services

| Service | What it does |
|---------|--------------|
| **Supabase** | Database, authentication, and user management |
| **Instagram** | Orders are placed by sending a DM to `@veooshop` |
| **Google Fonts** | Loads the elegant fonts used on the site (Cormorant Garamond + Inter) |
| **Lovable / Cloudflare** | Hosts the live website and handles server-side features |

The app is built with modern web technologies (React, Tailwind CSS, TanStack Router, and TanStack Query) but these are internal details handled by the development platform.

---

## 8. Features That Are Partially Implemented

| Feature | What works | What is still needed |
|---------|-----------|----------------------|
| **Checkout / Orders** | Customers can generate an order summary and copy it to Instagram | Orders are **not** automatically saved to the database from the customer side. The admin order dashboard exists, but orders likely need to be created manually by staff after receiving the Instagram message |
| **Online payment** | Not implemented by design | If you ever want card payment, it would need a new integration (Stripe, PayPal, etc.) |
| **Order confirmation to customer** | No automated emails or messages | After an order is logged, the customer is not automatically notified from the app |
| **Product image upload** | Staff must paste an external image URL | There is no built-in file upload; you need to host images elsewhere (Imgur, Cloudinary, etc.) and paste the link |
| **Shipping / delivery tracking** | Not built | Admin can write internal notes, but there is no tracking number field or delivery status |

---

## 9. Known Issues

- **Mixed languages on the checkout page:** Some buttons and labels on the checkout page are in Vietnamese while the rest of the site is in English. This can confuse non-Vietnamese speakers.
- **Cart used to have click-blocking bugs:** Recent fixes resolved issues where product cards and the "Add to Cart" button were not clickable. The current version should work correctly.
- **Order workflow is manual:** Because customers submit orders via Instagram DM, there is a gap between the customer experience (cart + checkout) and the admin dashboard (orders list). Staff must manually create or confirm orders in the system.
- **No automatic stock reservation:** Adding an item to the cart does not reserve it. If two people add the last piece to their carts, the first person to message on Instagram gets it.

---

## 10. Suggested Next Development Steps

Here are practical improvements you could consider, roughly ordered from simplest to more involved:

### Quick wins
1. **Unify language on checkout** — translate all Vietnamese labels on the checkout page to English so the whole site is consistent.
2. **Add a "Sold out" badge on the Shop page** — currently sold-out items are shown in the grid; a badge helps customers browse faster.
3. **Sort/filter by price** — add price range or sort options (low to high, high to low) on the shop page.

### Medium effort
4. **Auto-save orders from checkout** — when a customer finishes checkout, automatically create an order record in the admin dashboard (status: Pending). This closes the gap between customer checkout and staff management.
5. **Email notifications** — send a simple confirmation email to customers after checkout, and notify staff when a new order comes in.
6. **Low-stock warnings for staff** — show a warning in the admin Products page when inventory drops below a threshold.

### Larger features
7. **Image upload for products** — integrate a file upload service (like Cloudinary or Supabase Storage) so staff can upload product photos directly instead of pasting URLs.
8. **Customer accounts** — let customers create accounts so they can view past orders and save shipping addresses.
9. **Online payment integration** — add a payment gateway (Stripe, Momo, VNPay) if you want customers to pay directly on the site instead of via Instagram.
10. **Analytics dashboard** — add a simple stats page for admins showing total sales, popular products, and order trends.

---

*Last updated: June 2026*
