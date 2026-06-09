# veoo — Handmade Jewelry Showroom

An online showroom for handmade jewelry. Customers browse the collection, add
pieces to a cart, and place orders via Instagram DM. Staff manage products,
inventory, categories, and orders through an admin area.

## Overview

- **Customer side**: public, browsable catalog with search and category filters.
- **Admin side**: protected dashboard for staff to manage products, inventory,
  categories, owners, product status, and orders.
- **Data**: products, variants, categories (tags), orders, and inventory logs
  are stored in Lovable Cloud (Supabase). The cart is stored in the browser.

## Routes

### Customer
- `/` — Home / landing page
- `/shop` — Collection with search and category filters
- `/shop/:id` — Product detail + add to cart
- `/cart` — Cart
- `/checkout` — Order summary (sent via Instagram DM)
- `/about` — About page

### Auth
- `/login` — Staff sign in / sign up
- `/reset-password` — Password reset

### Admin (staff only)
- `/admin/dashboard` — Overview widgets, recent orders & inventory updates
- `/admin` — Orders management
- `/admin/products` — Product management & inventory
- `/admin/categories` — Category management (admin only)
- `/admin/team` — Team & roles (admin only)
- `/admin/account` — Change password

## User Roles

- **Admin** — full access: create/edit/delete products, manage categories,
  set product owner, change product status, manage team, manage orders.
- **Inventory staff** — update inventory and order status. Cannot add/edit
  products, manage categories, or see product **owner** information.
- **Customer** — no account needed; browses and orders via Instagram.

## Product Management Workflow

1. Admin opens **Products** and clicks **New product**.
2. Fills in name, price, image URL, description, prep time.
3. Sets a **Status** (Available, Low Stock, Made To Order, Sold Out, Archived).
4. Optionally assigns an **Owner** (Linh or Tú) — visible to admins only.
5. Assigns one or more **categories**; can add color variants with per-color stock.
6. Saves. A product code is auto-generated from the first category if left blank.

- **Sold Out** products show a badge on the shop page.
- **Archived** products are hidden from customers but stay visible in admin.

## Category Workflow

- Admin manages categories under **Categories** (create, rename, delete).
- Categories load dynamically into product forms and the shop filter bar.
- Products can have multiple categories; customers filter by them on `/shop`.

## Order Workflow

1. Customer adds pieces to the cart and goes to checkout.
2. Checkout produces an order summary the customer sends via Instagram DM.
3. Staff track and update order status in **Orders**
   (pending → confirmed → paid → preparing → ready for pickup → completed,
   or cancelled). Internal notes can be added per order.

## Inventory Workflow

- Staff update stock from **Products** (simple stock or per-color variants).
- Every change is recorded in an inventory log (amount, new quantity, note).
- The dashboard shows the 10 most recent inventory updates and flags
  low-stock and sold-out products.
