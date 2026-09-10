# Módulo Gestión VPN WireGuard

Módulo de la Intranet Listosoft para administrar los accesos remotos WireGuard: registra las empresas conectadas, asigna direcciones IP siguiendo el esquema corporativo, genera las claves criptográficas de cada dispositivo y entrega tanto el archivo de configuración del cliente como el bloque que debe pegarse en el servidor.

---

## 1. Ubicación y acceso

- **Menú lateral:** sección *Intranet*, opción **Gestión VPN**, justo debajo de *Gestor de Claves*.
- **Roles con acceso de lectura y creación:** `ADMIN`, `TECH` y `SOPORTE`.
- **Roles que pueden eliminar** empresas y equipos: solo `ADMIN` y `TECH`.

---

## 2. Archivos que componen el módulo

| Archivo | Responsabilidad |
|---|---|
| `components/VpnManagement.tsx` | Interfaz completa: listado de empresas, detalle con sus equipos, modales de creación y de consulta de configuración. |
| `services/vpnService.ts` | Generación de claves Curve25519, armado de los archivos de configuración y todas las consultas a Supabase. |
| `sql/create_vpn_management_tables.sql` | Script inicial: tablas, índices, triggers, políticas RLS y funciones RPC. |
| `sql/add_private_key_to_vpn_peers.sql` | Migración que añade la columna `private_key` y actualiza la función `create_vpn_peer`. |
| `App.tsx` | Registro de la pestaña `vpn` en la navegación y montaje del componente. |

---

## 3. Esquema de direccionamiento `10.0.X.Y`

Cada dispositivo recibe una IP única dentro de la VPN combinando dos números:

- **X — Número de Empresa:** identifica a la empresa. Se asigna al registrarla y no cambia nunca.
- **Y — Número de PC:** identifica al equipo dentro de esa empresa.

Por ejemplo, el primer equipo de la empresa 5 recibe `10.0.5.1`, el segundo `10.0.5.2`, y así sucesivamente.

Ambos números se calculan como **el mayor valor existente más uno**, no como un conteo de registros. Esto evita que al eliminar una empresa o un equipo se reutilice un número que ya estuvo en uso. En los dos formularios el campo del número queda vacío por defecto para que el sistema lo asigne, pero se puede escribir un valor manual cuando la empresa o el dispositivo ya tiene una IP fija asignada en producción.

El identificador visible de cada empresa se construye con el mismo número: `Lsoft-VPN-01`, `Lsoft-VPN-02`, `Lsoft-VPN-05`, etc.

---

## 4. Base de datos

### Tabla `vpn_companies`

| Columna | Descripción |
|---|---|
| `id` | Identificador UUID. |
| `company_number` | Número **X** de la empresa. Único. |
| `name` | Nombre de la empresa. |
| `group_name` | Grupo empresarial. Opcional. |
| `vpn_number` | Identificador visible, por ejemplo `Lsoft-VPN-05`. Único. |
| `vpn_range` | Rango de la subred, por ejemplo `10.0.5.0/24`. |
| `status` | `Activo`, `Inactivo` o `Mantenimiento`. |
| `created_by` | Usuario que la registró. |

### Tabla `vpn_peers`

| Columna | Descripción |
|---|---|
| `id` | Identificador UUID. |
| `company_id` | Empresa a la que pertenece. Con borrado en cascada. |
| `pc_number` | Número **Y** del dispositivo. |
| `ip` | Dirección completa `10.0.X.Y`. Única en toda la tabla. |
| `device_name` | Nombre del equipo, por ejemplo `LAPTOP-JUAN`. |
| `user_name` | Usuario asignado. |
| `public_key` | Clave pública WireGuard del dispositivo. |
| `private_key` | Clave privada del dispositivo, necesaria para volver a generar el `.conf`. |
| `status` | `Activo` o `Inactivo`. |
| `created_by` | Usuario que lo registró. |

La restricción `unique_company_pc_number` impide dos equipos con el mismo número **Y** en una misma empresa, y la columna `ip` es única a nivel global.

### Funciones RPC

Las dos operaciones de creación se ejecutan mediante funciones en PostgreSQL en lugar de inserciones directas:

- **`create_vpn_company`** calcula el siguiente número de empresa, arma el identificador y el rango, e inserta el registro.
- **`create_vpn_peer`** bloquea la fila de la empresa con `FOR UPDATE` antes de calcular el número de PC. Ese bloqueo es lo que garantiza que dos administradores creando equipos al mismo tiempo no obtengan la misma dirección IP.

Ambas validan que el número y la IP no estén ocupados y lanzan una excepción con un mensaje legible si lo están. El servicio en el frontend tiene una ruta de respaldo con inserción directa por si alguna función no estuviera disponible en la base de datos.

---

## 5. Generación de claves

Las claves se generan en el navegador del administrador, no en el dispositivo del usuario final. El proceso es:

1. Se obtienen 32 bytes aleatorios con `crypto.getRandomValues`.
2. Se aplica el *clamping* que exige WireGuard sobre el primer y el último byte.
3. Se deriva la clave pública multiplicando el escalar por el punto base de Curve25519, con una implementación de la escalera de Montgomery descrita en el RFC 7748.
4. Ambas claves se codifican en Base64, el formato que usa WireGuard.

Esto significa que el administrador no necesita pedirle al usuario que genere nada: al crear el equipo, el módulo ya entrega el túnel completo y listo para usar.

---

## 6. Configuración que entrega el módulo

### Archivo del cliente

```ini
[Interface]
PrivateKey = <clave privada generada para el dispositivo>
Address = 10.0.X.Y/16
DNS = 1.1.1.1

[Peer]
PublicKey = p9YbHVGQh5r7RsoW2zc9iAGGSkCavdbpidlpEVFzY24=
AllowedIPs = 10.0.0.1/32
Endpoint = 20.242.117.143:51820
PersistentKeepalive = 25
```

### Bloque del servidor

```ini
[Peer]
# <nombre del equipo> - <usuario>
PublicKey = <clave pública del dispositivo>
AllowedIPs = 10.0.X.Y/32
```

La clave pública del servidor, el endpoint, el DNS y el `AllowedIPs` del cliente están centralizados en la constante `WG_SERVER_CONFIG` dentro de `services/vpnService.ts`. Si alguno de esos parámetros cambia en el servidor, ese es el único lugar que hay que editar.

---

## 7. Nomenclatura de los archivos descargados

El archivo `.conf` se descarga con el nombre `Lsoft-VPN-NN.conf`, donde `NN` es el número de empresa con dos dígitos: `Lsoft-VPN-01.conf`, `Lsoft-VPN-05.conf`.

Cuando una empresa tiene más de un equipo, a partir del segundo se añade el número de PC como sufijo para que los archivos no se sobreescriban en la carpeta de descargas: `Lsoft-VPN-05-02.conf`, `Lsoft-VPN-05-03.conf`.

El nombre exacto se muestra en la interfaz antes de descargar, tanto en la etiqueta *Archivo* como en el propio botón.

---

## 8. Flujo de uso

### Registrar una empresa

1. Pulsar **Nueva Empresa** en la vista de listado.
2. Completar el nombre y, opcionalmente, el grupo.
3. Dejar vacío el número de empresa para que se asigne el siguiente consecutivo, o escribirlo si la empresa ya tiene un rango en producción.
4. Guardar. El módulo crea el identificador `Lsoft-VPN-NN` y el rango `10.0.X.0/24`.

### Crear el túnel de un equipo

1. Hacer clic sobre la fila de la empresa para entrar a su detalle.
2. Pulsar **Crear Nuevo Peer**.
3. Indicar el nombre del equipo y el usuario asignado. El número de PC se deja vacío salvo que se necesite uno específico.
4. Al guardar aparece un panel con las dos configuraciones: el bloque del servidor a la izquierda y el archivo del cliente a la derecha, con botones para copiar y para descargar el `.conf`.

### Aplicar el peer en el servidor

Copiar el bloque `[Peer]` y pegarlo en el archivo de configuración del servidor WireGuard. **Pegar el bloque no activa el acceso por sí solo**: hay que recargar la interfaz en el servidor, por ejemplo con `wg addconf`, `wg set` o reiniciando el servicio.

### Volver a consultar la configuración

Hacer clic sobre la fila del equipo en la tabla de detalle. Se abre una ventana con el archivo del cliente y el bloque del servidor, ambos con opción de copiar y de descargar. Como las claves quedan almacenadas, la configuración se puede recuperar en cualquier momento, incluso después de cerrar sesión o desde otro computador.

Los equipos registrados antes de aplicar la migración `add_private_key_to_vpn_peers.sql` no tienen clave privada guardada. En esos casos la ventana muestra un aviso y la línea `PrivateKey` debe completarse manualmente con la clave del dispositivo.

---

## 9. Consideraciones de seguridad

La clave privada de cada dispositivo queda almacenada en la tabla `vpn_peers`. Esto es lo que permite volver a descargar el archivo de configuración más adelante, y es una decisión consciente a cambio de esa comodidad. El acceso a la tabla está restringido por políticas RLS a los roles `ADMIN`, `TECH` y `SOPORTE`.

Si en el futuro se quisiera endurecer este punto, la alternativa sería cifrar la columna con el mismo esquema de bóveda que usa el Gestor de Claves, o dejar de persistirla y mostrarla una sola vez al crear el túnel.

Sobre el alcance del acceso: con `AllowedIPs = 10.0.0.1/32` el cliente solo enruta hacia esa dirección a través de la VPN. Si un equipo necesitara alcanzar otros servidores o el resto de la subred, habría que ampliar ese valor en `WG_SERVER_CONFIG`.

---

## 10. Instalación en una base de datos nueva

Ejecutar en el SQL Editor de Supabase, en este orden:

1. `sql/create_vpn_management_tables.sql`
2. `sql/add_private_key_to_vpn_peers.sql`

El primer script ya incluye la columna `private_key` en la definición de la tabla, por lo que el segundo solo es imprescindible en instalaciones que se crearon antes de ese cambio. Ejecutarlo de todas formas es seguro, ya que usa `IF NOT EXISTS` y `CREATE OR REPLACE`.
