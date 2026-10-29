# Week 4 - ShopEase

This folder contains the ShopEase ecommerce project. The React application is
in `frontend/`, and the Express API and MongoDB connection are in `backend/`.

## Prerequisites

- Node.js and npm
- MongoDB running locally, or a MongoDB connection string

## Run the backend

In a terminal:

```powershell
cd week_4\backend
npm install
Copy-Item .env.example .env
```

Update `backend\.env` if your MongoDB connection string is different, then run:

```powershell
node -e "const fs=require('fs');const secret=require('crypto').randomBytes(48).toString('base64');fs.writeFileSync('.env',fs.readFileSync('.env','utf8').replace(/^SESSION_SECRET=.*$/m,'SESSION_SECRET='+secret))"
npm run dev
```

The API listens on `http://localhost:5000`. Check `http://localhost:5000/api/health`
to verify that the server and database are available.

## Run the frontend

In a second terminal:

```powershell
cd week_4\frontend
npm install
npm run dev
```

Open the local URL printed by Vite. Requests to `/api` are proxied to the
backend at `http://localhost:5000`.

## Frontend products

The storefront reads its product list from
`frontend\src\data\products.json`. Add or edit product objects in that file to
update the product cards. Each product uses this shape:

```json
{
  "id": "everyday-tote",
  "name": "Everyday Canvas Tote",
  "category": "Accessories",
  "image": "https://example.com/product-image.jpg",
  "rating": 4.8,
  "price": 24.00,
  "stock": 12,
  "badge": "Bestseller",
  "description": "A sturdy everyday canvas tote.",
  "variants": {
    "Color": ["A", "B", "C"]
  },
  "variantStock": {
    "Color=A": 5,
    "Color=B": 10,
    "Color=C": 1
  },
  "variantImages": {
    "Color=A": "https://example.com/product-a.jpg",
    "Color=B": "https://example.com/product-b.jpg",
    "Color=C": "https://example.com/product-c.jpg"
  },
  "reviews": [
    {
      "name": "Maya R.",
      "rating": 5,
      "comment": "Roomy and comfortable for everyday errands.",
      "date": "October 12, 2026"
    }
  ]
}
```

Give each product a unique `id`, and provide its image as a URL. `variants`
accepts any option groups; for example, mobile phones and laptops can have
`Color` and `Storage`, while beauty products can have `Color`. `variantStock`
assigns stock to each exact variant selection. For a product with more than
one variant group, include every combination, such as
`"Color=Midnight|Storage=128 GB": 3`. Use `0` for an unavailable combination.
The values must be non-negative whole numbers, and their sum should match the
product's overall `stock`.

`variantImages` is optional and maps a variant option or complete combination
to its product image URL. For multi-option products, a color-only image key
such as `"Color=Silver"` applies to every storage option of that color; a
full-combination key such as `"Color=Silver|Storage=512 GB"` can override it.
When no image is configured for a selected color, the storefront applies a
color-specific visual tint to the default image.

A product page shows its information, variant selectors, description, rating,
and customer feedback. Available stock and quantity choices update when a
variant is selected, and adding to the cart cannot exceed that exact variant's
remaining inventory.

## Accounts, feedback, and checkout

The backend provides signup and sign-in using bcrypt-hashed passwords and
MongoDB-backed HTTP-only sessions. Set a random `SESSION_SECRET` in
`backend\.env` before starting the API. Signed-in users can leave a product
rating and comment; submitted feedback is saved in the current browser's
localStorage, not MongoDB.

Checkout requires a signed-in account. After sign-in, the user returns to the
cart and can continue to the demo payment page. Completing checkout only
simulates an order and clears the current cart; it does not collect card
details, charge money, or create a persisted order. Connect a payment provider
before accepting real payments.

Products can be opened from their card image, name, or View details button. On
the product page, select variants and a quantity before adding the item. A
customer can add no more than four units of a product in total, across all its
variants, and never more than its listed stock. Cart lines retain the selected
variants. The cart count updates as items are added or removed.

Select the cart control to view cart lines, quantities, line totals, subtotal,
discount, and total amount. The discount is currently $0.00 because no discount
rules are configured. Cart contents last for the current visit.

## Project features

- React + Vite storefront with Home, About Us, and Contact Us navigation
- Responsive product cards populated from the JSON catalog
- Product detail pages with configurable variant selectors and customer feedback
- Color-specific product images configurable per variant in the catalog
- Quantity-limited cart, cart page, live cart count, and stock display
- MongoDB-backed account sessions and browser-saved customer feedback
- Header profile avatar, signed-in greeting, and cart icon count badge
- Demo checkout that does not request or process payment information
- Express API with a health endpoint
- Mongoose database connection configured through environment variables

Customer accounts, persistent carts, and order workflows can be added next.
