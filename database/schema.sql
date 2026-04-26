-- ============================================================
-- WOW SURPRISES — SUPABASE DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── EXTENSIONS ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. PROFILES
--    Auto-created for every new auth user via trigger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT,
  full_name       TEXT,
  phone           TEXT,
  role            TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'merchant', 'admin')),
  avatar_url      TEXT,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 2. MERCHANTS
--    Business profiles for merchant users
-- ============================================================
CREATE TABLE IF NOT EXISTS public.merchants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT UNIQUE NOT NULL,
  business_name   TEXT NOT NULL,
  owner_name      TEXT,
  phone           TEXT,
  address         TEXT,
  category        TEXT,
  description     TEXT,
  logo_url        TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  is_verified     BOOLEAN DEFAULT FALSE,
  commission_rate NUMERIC(5,2) DEFAULT 10.00,
  bank_name       TEXT,
  account_number  TEXT,
  account_name    TEXT,
  total_earnings  NUMERIC(12,2) DEFAULT 0,
  total_orders    INTEGER DEFAULT 0,
  rating          NUMERIC(3,2) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 3. PACKAGES
--    Surprise packages listed by merchants
-- ============================================================
CREATE TABLE IF NOT EXISTS public.packages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id     UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  category        TEXT NOT NULL CHECK (category IN (
                    'gift_packages','flowers_bouquet','cakes_desserts',
                    'event_decorations','balloons_party','birthday',
                    'proposal','anniversary','romantic','corporate','others'
                  )),
  price           NUMERIC(12,2) NOT NULL,
  original_price  NUMERIC(12,2),
  images          TEXT[] DEFAULT '{}',
  includes        TEXT[] DEFAULT '{}',
  duration        TEXT,
  min_notice      TEXT DEFAULT '48 hours',
  location        TEXT DEFAULT 'Lagos',
  delivery_fee    NUMERIC(10,2) DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','draft')),
  is_featured     BOOLEAN DEFAULT FALSE,
  rating          NUMERIC(3,2) DEFAULT 0,
  review_count    INTEGER DEFAULT 0,
  booking_count   INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 4. BOOKINGS
--    Customer bookings with full details
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference       TEXT UNIQUE,
  user_id                 UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  package_id              UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  merchant_id             UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  package_name            TEXT NOT NULL,
  package_price           NUMERIC(12,2) NOT NULL,
  -- Recipient
  recipient_name          TEXT NOT NULL,
  recipient_phone         TEXT NOT NULL,
  recipient_address       TEXT,
  -- Schedule
  surprise_date           DATE NOT NULL,
  surprise_time           TEXT,
  timezone                TEXT DEFAULT 'WAT',
  flexible_timing         BOOLEAN DEFAULT FALSE,
  -- Personalization
  personal_message        TEXT,
  special_requests        TEXT,
  addons                  JSONB DEFAULT '[]',
  -- Payment
  total_amount            NUMERIC(12,2) NOT NULL,
  payment_status          TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_reference       TEXT,
  flutterwave_reference   TEXT,
  payment_method          TEXT,
  -- Status
  status                  TEXT DEFAULT 'pending' CHECK (status IN (
                            'pending','confirmed','processing','delivered','cancelled'
                          )),
  cancelled_at            TIMESTAMPTZ,
  cancellation_reason     TEXT,
  delivered_at            TIMESTAMPTZ,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-generate booking reference
CREATE OR REPLACE FUNCTION public.generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_reference IS NULL THEN
    NEW.booking_reference := 'WOW-' || UPPER(SUBSTRING(NEW.id::TEXT, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_booking_reference ON public.bookings;
CREATE TRIGGER set_booking_reference
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.generate_booking_reference();


-- ============================================================
-- 5. REVIEWS
--    Customer reviews (moderated before showing)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id      UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  package_id      UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  merchant_id     UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  user_name       TEXT,
  rating          INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title           TEXT,
  comment         TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 6. CUSTOM PACKAGE REQUESTS
--    Enquiries from custom-package.html
-- ============================================================
CREATE TABLE IF NOT EXISTS public.custom_package_requests (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occasion_type   TEXT,
  budget_range    TEXT,
  includes        TEXT[] DEFAULT '{}',
  package_name    TEXT NOT NULL,
  preferred_date  DATE,
  venue_location  TEXT,
  guest_count     INTEGER,
  description     TEXT,
  contact_name    TEXT NOT NULL,
  contact_phone   TEXT NOT NULL,
  contact_email   TEXT NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','contacted','confirmed','cancelled')),
  admin_notes     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 7. ADMIN ACTIVITY LOGS
--    Audit trail for admin actions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  details         TEXT,
  ip_address      TEXT,
  user_agent      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_package_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs     ENABLE ROW LEVEL SECURITY;

-- ─── PROFILES ────────────────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── PACKAGES ────────────────────────────────────────────────
CREATE POLICY "Anyone can view active packages"
  ON public.packages FOR SELECT
  USING (status = 'active');

CREATE POLICY "Merchants can manage own packages"
  ON public.packages FOR ALL
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all packages"
  ON public.packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── BOOKINGS ────────────────────────────────────────────────
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Merchants can view their bookings"
  ON public.bookings FOR SELECT
  USING (
    merchant_id IN (
      SELECT id FROM public.merchants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all bookings"
  ON public.bookings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── MERCHANTS ───────────────────────────────────────────────
CREATE POLICY "Anyone can view active merchants"
  ON public.merchants FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Merchants can update own profile"
  ON public.merchants FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all merchants"
  ON public.merchants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── REVIEWS ─────────────────────────────────────────────────
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Logged in users can submit reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── CUSTOM PACKAGE REQUESTS ─────────────────────────────────
CREATE POLICY "Anyone can submit custom requests"
  ON public.custom_package_requests FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Admins can manage custom requests"
  ON public.custom_package_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ─── ADMIN ACTIVITY LOGS ─────────────────────────────────────
CREATE POLICY "Admins can manage activity logs"
  ON public.admin_activity_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ============================================================
-- 9. INDEXES (for performance)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_user_id     ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_merchant_id ON public.bookings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_surprise_date ON public.bookings(surprise_date);
CREATE INDEX IF NOT EXISTS idx_packages_category    ON public.packages(category);
CREATE INDEX IF NOT EXISTS idx_packages_status      ON public.packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_merchant_id ON public.packages(merchant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status       ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id    ON public.merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON public.profiles(role);


-- ============================================================
-- 10. STORAGE BUCKETS
--     Run these separately in Storage section or via SQL
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('package-images', 'package-images', TRUE)
-- ON CONFLICT DO NOTHING;

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('merchant-logos', 'merchant-logos', TRUE)
-- ON CONFLICT DO NOTHING;

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('avatars', 'avatars', TRUE)
-- ON CONFLICT DO NOTHING;


-- ============================================================
-- DONE ✅
-- ============================================================
SELECT 'WOW Surprises schema created successfully!' AS status;
