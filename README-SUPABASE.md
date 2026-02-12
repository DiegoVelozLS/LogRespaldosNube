# 🚀 GUÍA COMPLETA DE CONFIGURACIÓN SUPABASE

## ✅ ESTADO ACTUAL
- ✅ Credenciales configuradas en `.env.local`
- ✅ Cliente Supabase creado
- ✅ Scripts SQL listos
- ✅ Servicio de datos con Supabase creado
- ✅ Librería @supabase/supabase-js instalada

---

## 📋 PASOS QUE DEBES HACER (EN SUPABASE)

### PASO 1: Verificar tu Proyecto Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Tu proyecto debe ser: **ohguhkejrygqoknmrqck**
3. Si no existe, créalo de nuevo y actualiza las credenciales en `.env.local`

### PASO 2: Ejecutar el Script SQL

1. En tu proyecto de Supabase, ve a **"SQL Editor"** (menú izquierdo)
2. Click en **"+ New Query"**
3. Copia y pega **TODO** el contenido del archivo `supabase-clean.sql`
4. Click en **"RUN"** (o Ctrl+Enter)
5. ✅ Debe decir: **"Success. No rows returned"**

Esto creará:
   - ✅ Tabla `users` (perfiles de usuario)
   - ✅ Tabla `backup_schedules` (tareas programadas)
   - ✅ Tabla `backup_logs` (registros de respaldos)
   - ✅ 3 tareas de ejemplo
   - ✅ Políticas de seguridad RLS
   - ✅ Trigger automático para crear perfiles

### PASO 3: Crear tu Usuario Admin

**OPCIÓN A: Desde la interfaz de Supabase**
1. Ve a **"Authentication"** > **"Users"**
2. Click en **"Add user"** > **"Create new user"**
3. Rellena:
   - Email: `admin@listosoft.com`
   - Password: `12345`
   - **Auto Confirm User**: Activado ✅
4. En **"User Metadata"** (expandir), agrega este JSON:
   ```json
   {
     "name": "Admin",
     "last_name": "Listosoft",
     "role": "ADMIN"
   }
   ```
5. Click **"Create user"**
6. ✅ Se debe crear automáticamente el perfil en la tabla `users`

**OPCIÓN B: Con SQL (más rápido)**
1. Ve al SQL Editor  
2. Ejecuta este script (reemplaza el email/password si quieres):

\`\`\`sql
-- Insertar usuario en auth.users con metadata
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@listosoft.com',
  crypt('12345', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin","last_name":"Listosoft","role":"ADMIN"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);
\`\`\`

3. Esto activará el trigger que crea el perfil automáticamente

### PASO 4: Verificar que todo funciona

1. Ve a **"Table Editor"** en Supabase
2. Selecciona la tabla **`users`**
3. ✅ Debes ver tu usuario admin con rol ADMIN
4. Selecciona la tabla **`backup_schedules`**
5. ✅ Debes ver 3 tareas de ejemplo

---

## 💻 LO QUE YO YA HICE (ARCHIVOS)

✅ Actualizado `package.json` con @supabase/supabase-js  
✅ Creado `services/supabaseDataService.ts` (servicio completo)  
✅ Creado `.env.example` con plantilla  
✅ Tu `.env.local` ya tiene las credenciales  

---

## 🔧 SIGUIENTE PASO: ACTUALIZAR LA APP

Ahora necesito actualizar tu `App.tsx` y componentes para usar Supabase en lugar de localStorage.

Hay 2 opciones:

**OPCIÓN 1: Completa (Recomendada)**  
Actualizo TODOS los componentes para usar 100% Supabase

**OPCIÓN 2: Híbrida**  
Mantengo compatibilidad con localStorage como fallback

**¿Cuál prefieres?** (Recomiendo Opción 1 para empezar limpio)

---

## 🧪 CÓMO PROBAR LA CONEXIÓN

Una vez actualizados los componentes, prueba:

1. **Ejecuta la app:**
   \`\`\`bash
   npm run dev
   \`\`\`

2. **Inicia sesión con:**
   - Email: `admin@listosoft.com`
   - Password: `12345`

3. **Verifica que:**
   - ✅ Puedes ver las 3 tareas de ejemplo
   - ✅ Puedes registrar un respaldo
   - ✅ Los datos se guardan en Supabase (no localStorage)

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Error: "Invalid API key"
- Verifica que `.env.local` tenga las credenciales correctas
- Reinicia el servidor (`npm run dev`)

### Error: "Row Level Security"
- Asegúrate de ejecutar TODO el script SQL
- Verifica que las políticas RLS estén creadas en Supabase

### No puedo iniciar sesión
- Verifica que el usuario existe en Authentication > Users
- Verifica que el perfil existe en Table Editor > users
- El trigger debe haber creado el perfil automáticamente

### Los datos no se guardan
- Abre la consola del navegador (F12)
- Busca errores en rojo
- Verifica que estés usando `supabaseDataService` y no `dataService`

---

## 📞 LISTO PARA CONTINUAR

Dime cuando hayas:
1. ✅ Ejecutado el script SQL en Supabase
2. ✅ Creado tu usuario admin
3. ✅ Verificado que las tablas existen

Y yo procedo a actualizar todos los componentes para usar Supabase.
