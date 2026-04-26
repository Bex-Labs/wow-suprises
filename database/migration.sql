-- ============================================================
-- WOW SURPRISES — MIGRATION SCRIPT
-- Safe to run on existing database — only ADDS what's missing
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ============================================================
-- 1. PROFILES — add missing columns
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();


-- ============================================================
-- 2. MERCHANTS — add missing columns
--    Existing: id, name, email, phone, address, document_url,
--              document_type, status, assigned_admin_id,
--              created_at, updated_at
--    Missing: user_id, business_name, owner_name, category,
--             description, logo_url, is_active, is_verified,
--             commission_rate, bank_name, account_number,
--             account_name, total_earnings, total_orders, rating
-- ============================================================
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS business_name   TEXT,
  ADD COLUMN IF NOT EXISTS owner_name      TEXT,
  ADD COLUMN IF NOT EXISTS category        TEXT,
  ADD COLUMN IF NOT EXISTS description     TEXT,
  ADD COLUMN IF NOT EXISTS logo_url        TEXT,
  ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS is_verified     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS bank_name       TEXT,
  ADD COLUMN IF NOT EXISTS account_number  TEXT,
  ADD COLUMN IF NOT EXISTS account_name    TEXT,
  ADD COLUMN IF NOT EXISTS total_earnings  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_orders    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating          NUMERIC(3,2) DEFAULT 0;

-- Migrate existing 'name' → 'business_name' where business_name is null
UPDATE public.merchants
  SET business_name = name
  WHERE business_name IS NULL AND name IS NOT NULL;


-- ============================================================
-- 3. PACKAGES — add missing columns
--    Existing: id, name, description, price, category, status,
--              image_url, created_at, featured
--    Missing: merchant_id, original_price, images, includes,
--             duration, min_notice, location, delivery_fee,
--             is_featured, rating, review_count, booking_count,
--             updated_at
-- ============================================================
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS merchant_id    UUID REFERENCES public.merchants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS original_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS images         TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS includes       TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS duration       TEXT,
  ADD COLUMN IF NOT EXISTS min_notice     TEXT DEFAULT '48 hours',
  ADD COLUMN IF NOT EXISTS location       TEXT DEFAULT 'Lagos',
  ADD COLUMN IF NOT EXISTS delivery_fee   NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rating         NUMERIC(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count   INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_count  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at     TIMESTAMPTZ DEFAULT NOW();

-- Migrate existing image_url → images array where images is empty
UPDATE public.packages
  SET images = ARRAY[image_url]
  WHERE image_url IS NOT NULL AND (images IS NULL OR images = '{}');

-- Migrate existing 'featured' → 'is_featured'
UPDATE public.packages
  SET is_featured = featured
  WHERE featured IS NOT NULL;


-- ============================================================
-- 4. BOOKINGS — add missing columns
--    Existing: all the core columns are already there ✅
--    Missing: package_id, merchant_id, payment_method,
--             cancellation_reason, delivered_at, notes,
--             updated_at
-- ============================================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS package_id           UUID REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merchant_id          UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method       TEXT,
  ADD COLUMN IF NOT EXISTS cancellation_reason  TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes                TEXT,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();


-- ============================================================
-- 5. REVIEWS — add missing columns
--    Existing: id, user_id, package_id, rating, comment,
--              created_at
--    Missing: booking_id, merchant_id, user_name, title, status
-- ============================================================
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS booking_id   UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merchant_id  UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_name    TEXT,
  ADD COLUMN IF NOT EXISTS title        TEXT,
  ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'));


-- ============================================================
-- 6. CUSTOM PACKAGE REQUESTS — create if not exists
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
-- 7. AUTO-CREATE PROFILE TRIGGER (if not already exists)
-- ============================================================
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
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    phone     = COALESCE(EXCLUDED.phone, profiles.phone),
    role      = COALESCE(EXCLUDED.role, profiles.role);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 8. AUTO-GENERATE BOOKING REFERENCE TRIGGER
-- ============================================================
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
-- 9. RLS — enable and add policies safely
-- ============================================================
ALTER TABLE public.profiles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_package_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_services       ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies to avoid conflicts
-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- PACKAGES
DROP POLICY IF EXISTS "Anyone can view active packages" ON public.packages;
CREATE POLICY "Anyone can view active packages"
  ON public.packages FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Merchants can manage own packages" ON public.packages;
CREATE POLICY "Merchants can manage own packages"
  ON public.packages FOR ALL
  USING (merchant_id IN (
    SELECT id FROM public.merchants WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage all packages" ON public.packages;
CREATE POLICY "Admins can manage all packages"
  ON public.packages FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- BOOKINGS
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings"
  ON public.bookings FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Merchants can view their bookings" ON public.bookings;
CREATE POLICY "Merchants can view their bookings"
  ON public.bookings FOR SELECT
  USING (merchant_id IN (
    SELECT id FROM public.merchants WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;
CREATE POLICY "Admins can manage all bookings"
  ON public.bookings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- MERCHANTS
DROP POLICY IF EXISTS "Anyone can view active merchants" ON public.merchants;
CREATE POLICY "Anyone can view active merchants"
  ON public.merchants FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Merchants can update own profile" ON public.merchants;
CREATE POLICY "Merchants can update own profile"
  ON public.merchants FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all merchants" ON public.merchants;
CREATE POLICY "Admins can manage all merchants"
  ON public.merchants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- REVIEWS
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.reviews;
CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT USING (status = 'approved');

DROP POLICY IF EXISTS "Logged in users can submit reviews" ON public.reviews;
CREATE POLICY "Logged in users can submit reviews"
  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all reviews" ON public.reviews;
CREATE POLICY "Admins can manage all reviews"
  ON public.reviews FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- CUSTOM PACKAGE REQUESTS
DROP POLICY IF EXISTS "Anyone can submit custom requests" ON public.custom_package_requests;
CREATE POLICY "Anyone can submit custom requests"
  ON public.custom_package_requests FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Admins can manage custom requests" ON public.custom_package_requests;
CREATE POLICY "Admins can manage custom requests"
  ON public.custom_package_requests FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- ADMIN ACTIVITY LOGS
DROP POLICY IF EXISTS "Admins can manage activity logs" ON public.admin_activity_logs;
CREATE POLICY "Admins can manage activity logs"
  ON public.admin_activity_logs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- MERCHANT SERVICES
DROP POLICY IF EXISTS "Merchants can manage own services" ON public.merchant_services;
CREATE POLICY "Merchants can manage own services"
  ON public.merchant_services FOR ALL
  USING (merchant_id IN (
    SELECT id FROM public.merchants WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Anyone can view available services" ON public.merchant_services;
CREATE POLICY "Anyone can view available services"
  ON public.merchant_services FOR SELECT USING (is_available = TRUE);


-- ============================================================
-- 10. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_bookings_user_id       ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status        ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_merchant_id   ON public.bookings(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_surprise_date ON public.bookings(surprise_date);
CREATE INDEX IF NOT EXISTS idx_packages_category      ON public.packages(category);
CREATE INDEX IF NOT EXISTS idx_packages_status        ON public.packages(status);
CREATE INDEX IF NOT EXISTS idx_packages_merchant_id   ON public.packages(merchant_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status         ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_merchants_user_id      ON public.merchants(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role          ON public.profiles(role);


-- ============================================================
-- DONE ✅
-- ============================================================
SELECT 'WOW Surprises migration completed successfully!' AS status;
