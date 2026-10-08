-- Online Marketplace for Local Sellers (PostgreSQL)
-- Run: createdb marketplace && psql marketplace -f schema.sql

DROP TABLE IF EXISTS order_items, orders, products, categories, shops, users CASCADE;
DROP TYPE  IF EXISTS user_role, order_status;

CREATE TYPE user_role    AS ENUM ('admin', 'seller', 'buyer');
CREATE TYPE order_status AS ENUM ('placed', 'shipped', 'delivered', 'cancelled');

-- Everyone who can log in. Role drives RBAC.
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL UNIQUE,
  role       user_role   NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One shop per seller (UNIQUE owner_id). Drop the UNIQUE to allow many shops.
CREATE TABLE shops (
  id          SERIAL PRIMARY KEY,
  owner_id    INT  NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  locality    TEXT NOT NULL,            -- neighbourhood / area, the "local" part
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id   SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  shop_id     INT  NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  category_id INT           REFERENCES categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  stock       INT           NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active   BOOLEAN       NOT NULL DEFAULT true,   -- soft delete, keeps order history intact
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_shop     ON products(shop_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_active   ON products(is_active) WHERE is_active;

CREATE TABLE orders (
  id         SERIAL PRIMARY KEY,
  buyer_id   INT           NOT NULL REFERENCES users(id),
  status     order_status  NOT NULL DEFAULT 'placed',
  total      NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_buyer ON orders(buyer_id);

-- unit_price is copied at purchase time so later price edits don't rewrite history.
CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INT           NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INT           NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity   INT           NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  UNIQUE (order_id, product_id)
);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- Seed data (these users power the dummy login)
INSERT INTO users (name, email, role) VALUES
  ('Admin',          'admin@demo.com', 'admin'),
  ('Asha (seller)',  'asha@demo.com',  'seller'),
  ('Ravi (seller)',  'ravi@demo.com',  'seller'),
  ('Meera (buyer)',  'meera@demo.com', 'buyer');
INSERT INTO shops (owner_id, name, locality, description) VALUES
  (2, 'Asha Pickles & Preserves', 'Jayanagar', 'Home-made pickles'),
  (3, 'Ravi Handlooms',           'Malleshwaram', 'Local weaves');
INSERT INTO categories (name) VALUES ('Food'), ('Clothing'), ('Home'), ('Other');
INSERT INTO products (shop_id, category_id, name, description, price, stock) VALUES
  (1, 1, 'Mango Pickle',  '500g jar',        180.00, 25),
  (1, 1, 'Lemon Pickle',  '500g jar',        150.00, 30),
  (2, 2, 'Cotton Towel',  'Handwoven',       220.00, 12),
  (2, 3, 'Table Runner',  'Jute and cotton', 340.00,  8);
