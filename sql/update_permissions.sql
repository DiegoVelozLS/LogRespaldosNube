-- ================================================================
-- ACTUALIZACIÓN DE PERMISOS RLS PARA ROLES: SOPORTE Y TECH
-- ================================================================

-- -------------------------------------------------------------
-- 1. ANUNCIOS (announcements)
-- SOPORTE puede crear y modificar. TECH y ADMIN pueden crear, modificar y eliminar.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Todos pueden ver anuncios" ON public.announcements;
DROP POLICY IF EXISTS "All users can view announcements" ON public.announcements;

CREATE POLICY "Todos pueden ver anuncios" ON public.announcements
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Admin, Tech y Soporte can insert announcements" ON public.announcements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admin, Tech y Soporte can update announcements" ON public.announcements
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admins y Techs can delete announcements" ON public.announcements
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH'))
  );

-- -------------------------------------------------------------
-- 2. CLIENTES Y CONTACTOS (clients, client_contacts)
-- SOPORTE puede crear y modificar. TECH y ADMIN pueden crear, modificar y eliminar.
-- -------------------------------------------------------------
-- Clientes
DROP POLICY IF EXISTS "Admins y Techs pueden modificar clientes" ON public.clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can update clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can delete clients" ON public.clients;

CREATE POLICY "Admin, Tech y Soporte can insert clients" ON public.clients
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admin, Tech y Soporte can update clients" ON public.clients
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admins y Techs can delete clients" ON public.clients
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH'))
  );

-- Contactos de Clientes
DROP POLICY IF EXISTS "Admins can insert client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Admins can update client_contacts" ON public.client_contacts;
DROP POLICY IF EXISTS "Admins can delete client_contacts" ON public.client_contacts;

CREATE POLICY "Admin, Tech y Soporte can insert client_contacts" ON public.client_contacts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admin, Tech y Soporte can update client_contacts" ON public.client_contacts
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admins y Techs can delete client_contacts" ON public.client_contacts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH'))
  );

-- -------------------------------------------------------------
-- 3. EMPLEADOS (employees)
-- SOPORTE y TECH pueden crear, modificar y eliminar
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Empleados actualizables por Admin/RRHH o el mismo empleado" ON public.employees;
DROP POLICY IF EXISTS "Empleados eliminables por Admin/RRHH" ON public.employees;
DROP POLICY IF EXISTS "Todos pueden insertar empleados" ON public.employees;

CREATE POLICY "Admin, Tech y Soporte pueden insertar empleados" ON public.employees
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admin, Tech y Soporte pueden actualizar empleados" ON public.employees
  FOR UPDATE USING (
    (user_id = auth.uid()::text) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );

CREATE POLICY "Admin, Tech y Soporte pueden eliminar empleados" ON public.employees
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('ADMIN', 'TECH', 'SOPORTE'))
  );
