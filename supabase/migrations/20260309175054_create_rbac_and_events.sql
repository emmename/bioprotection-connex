-- ========================================
-- DYNAMIC RBAC (Role-Based Access Control)
-- ========================================

CREATE TABLE public.permissions (
  id TEXT PRIMARY KEY,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.role_permissions (
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id TEXT REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE public.user_custom_roles (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

-- Seed basic permissions
INSERT INTO public.permissions (id, description) VALUES
  ('scan_events', 'Can scan QR codes for event check-in'),
  ('manage_events', 'Can create and edit events'),
  ('manage_roles', 'Can create roles and assign permissions');

-- Seed a "Staff" role
INSERT INTO public.roles (id, name, description) 
VALUES (gen_random_uuid(), 'Event Staff', 'Staff member capable of scanning event tickets');

-- Helper function to check permissions
-- Super Admins (from user_roles) automatically bypass this and get true
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_custom_roles ucr
    JOIN public.role_permissions rp ON ucr.role_id = rp.role_id
    WHERE ucr.user_id = _user_id AND rp.permission_id = _permission
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- ========================================
-- EVENTS & CHECK-INS
-- ========================================

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE public.event_registration_status AS ENUM ('registered', 'checked_in', 'cancelled');

CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status event_registration_status NOT NULL DEFAULT 'registered',
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, profile_id)
);

-- ========================================
-- RLS POLICIES
-- ========================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_custom_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- Permissions, Roles: Anyone can read, Admin/manage_roles can write
CREATE POLICY "Public read permissions" ON public.permissions FOR SELECT USING (true);
CREATE POLICY "Admin manage permissions" ON public.permissions FOR ALL USING (public.has_permission(auth.uid(), 'manage_roles'));

CREATE POLICY "Public read roles" ON public.roles FOR SELECT USING (true);
CREATE POLICY "Admin manage roles" ON public.roles FOR ALL USING (public.has_permission(auth.uid(), 'manage_roles'));

CREATE POLICY "Public read role_permissions" ON public.role_permissions FOR SELECT USING (true);
CREATE POLICY "Admin manage role_permissions" ON public.role_permissions FOR ALL USING (public.has_permission(auth.uid(), 'manage_roles'));

CREATE POLICY "Users view own custom roles" ON public.user_custom_roles FOR SELECT USING (auth.uid() = user_id OR public.has_permission(auth.uid(), 'manage_roles'));
CREATE POLICY "Admin manage custom roles" ON public.user_custom_roles FOR ALL USING (public.has_permission(auth.uid(), 'manage_roles'));

-- Events: Anyone can read active, Manage events can write
CREATE POLICY "Public read active events" ON public.events FOR SELECT USING (is_active = true OR public.has_permission(auth.uid(), 'manage_events'));
CREATE POLICY "Admin manage events" ON public.events FOR ALL USING (public.has_permission(auth.uid(), 'manage_events'));

-- Event Registrations: Users read/write own, Scan events can update status
CREATE POLICY "Users read own registrations" ON public.event_registrations FOR SELECT USING (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR public.has_permission(auth.uid(), 'scan_events'));
CREATE POLICY "Users insert own registrations" ON public.event_registrations FOR INSERT WITH CHECK (profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));
CREATE POLICY "Admin manage registrations" ON public.event_registrations FOR ALL USING (public.has_permission(auth.uid(), 'manage_events') OR public.has_permission(auth.uid(), 'scan_events'));

-- Set updated_at trigger for events
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
