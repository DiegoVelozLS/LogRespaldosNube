# Módulo Gestión VPN

Módulo de la Intranet Listosoft para administrar los accesos remotos: organiza las empresas por túnel, asigna direcciones IP siguiendo el esquema corporativo, genera las claves criptográficas de cada dispositivo y entrega tanto el archivo de configuración del cliente como el bloque que debe pegarse en el servidor.

---

## 1. Ubicación y acceso

- **Menú lateral:** sección *Intranet*, opción **Gestión VPN**, justo debajo de *Gestor de Claves*.

| Acción | ADMIN | TECH | SOPORTE |
|---|:--:|:--:|:--:|
| Ver empresas y equipos | Sí | Sí | Sí |
| Registrar empresas y equipos | Sí | Sí | Sí |
| Descargar configuraciones `.conf` | Sí | Sí | Sí |
| Eliminar empresas y equipos | Sí | Sí | No |
| Ver los parámetros del servidor | Sí | No | No |
| Crear, editar y eliminar túneles | Sí | No | No |

Por *parámetros del servidor* se entiende la ficha que aparece sobre el listado con el endpoint, el puerto, el prefijo de direcciones y la clave pública del servidor. Esa tarjeta, el puerto que se muestra en las pestañas y los botones de administración de túneles solo son visibles para el administrador. Los técnicos y el personal de soporte siguen viendo las pestañas con sus totales y pueden trabajar con normalidad, porque esos valores se aplican de forma automática al generar cada configuración.

---

## 2. Archivos que componen el módulo

| Archivo | Responsabilidad |
|---|---|
| `components/VpnManagement.tsx` | Interfaz completa: pestañas por túnel, listado de empresas, detalle con sus equipos y todos los modales. |
| `services/vpnService.ts` | Generación de claves Curve25519, armado de los archivos de configuración y todas las consultas a Supabase. |
| `sql/create_vpn_management_tables.sql` | Script inicial: tablas, índices, triggers, políticas RLS y funciones RPC. |
| `sql/add_private_key_to_vpn_peers.sql` | Migración que añade la columna `private_key` y actualiza la función `create_vpn_peer`. |
| `sql/add_vpn_tunnels.sql` | Migración que introduce la tabla `vpn_tunnels`, vincula las empresas a un túnel y actualiza ambas funciones RPC. |
| `App.tsx` | Registro de la pestaña `vpn` en la navegación y montaje del componente. |

---

## 3. Modelo de túneles

Un **túnel** es un punto de acceso remoto independiente, con su propio endpoint, su propia clave pública de servidor y su propio espacio de direcciones. Cada empresa pertenece a exactamente un túnel, y en la interfaz cada túnel es una pestaña con sus propios totales de empresas y de PCs.

La instalación actual tiene tres:

| Túnel | Tipo | Puerto | Prefijo de IP | `AllowedIPs` del cliente | Prefijo de archivo |
|---|---|---|---|---|---|
| Túnel Principal | WireGuard | 51820 | `10.0` | `10.0.0.1/32` | `Lsoft-VPN` |
| Túnel Secundario | WireGuard | 51821 | `10.1` | `10.1.0.1/16` | `Lsoft-VPN-T2` |
| Radmin | Radmin | — | — | — | `Radmin` |

Los túneles de tipo **WireGuard** generan claves, direcciones y archivos de configuración. Los de tipo **Radmin** no: sirven únicamente como ficha informativa de las empresas y equipos que se atienden con ese software, con un campo de notas libre para anotar el identificador de Radmin, un contacto o cualquier dato de soporte.

Los tres túneles se pueden editar desde la propia intranet con el botón **Editar Túnel** que aparece sobre el listado, y se pueden agregar nuevos con **Nuevo Túnel**. Ambas acciones son exclusivas del administrador, tanto en la interfaz como en las políticas de la base de datos. Un túnel no se puede eliminar mientras tenga empresas asignadas.

---

## 4. Esquema de direccionamiento

Cada dispositivo recibe una IP única combinando el prefijo de su túnel con dos números:

```
[prefijo del túnel].[X].[Y]
```

- **X — Número de Empresa:** identifica a la empresa. Se asigna al registrarla y no cambia nunca.
- **Y — Número de PC:** identifica al equipo dentro de esa empresa.

Así, el primer equipo de la empresa 5 recibe `10.0.5.1` si está en el túnel principal, o `10.1.5.1` si está en el secundario.

El número de empresa es **único dentro de cada túnel**, no a nivel global. Dos empresas distintas pueden ser la número 5 siempre que estén en túneles diferentes, porque sus IPs no colisionan.

Ambos números se calculan como **el mayor valor existente más uno**, no como un conteo de registros. Esto evita que al eliminar una empresa o un equipo se reutilice un número que ya estuvo en uso. En los dos formularios el campo del número queda vacío por defecto para que el sistema lo asigne, pero se puede escribir un valor manual cuando la empresa o el dispositivo ya tiene una IP fija asignada en producción.

El identificador visible de cada empresa se construye con el prefijo de su túnel y el número: `Lsoft-VPN-01`, `Lsoft-VPN-05`, `Lsoft-VPN-T2-01`.

---

## 5. Base de datos

### Tabla `vpn_tunnels`

| Columna | Descripción |
|---|---|
| `id` | Identificador UUID. |
| `name` | Nombre visible del túnel, que es el rótulo de la pestaña. |
| `kind` | `wireguard` o `radmin`. Determina si se generan claves y configuración. |
| `endpoint_host` | IP pública o dominio del servidor. |
| `listen_port` | Puerto de escucha, por ejemplo `51820`. |
| `server_public_key` | Clave pública del servidor WireGuard. |
| `dns` | DNS que se escribe en la configuración del cliente. |
| `client_allowed_ips` | Valor de `AllowedIPs` del lado cliente. |
| `address_prefix` | Primeros dos octetos del espacio de direcciones, por ejemplo `10.0`. |
| `address_cidr` | Máscara del `Address` del cliente. |
| `persistent_keepalive` | Segundos de `PersistentKeepalive`. |
| `file_prefix` | Prefijo del nombre del archivo `.conf` descargado. |
| `sort_order` | Orden en que aparecen las pestañas. |
| `status` | `Activo`, `Inactivo` o `Mantenimiento`. |

### Tabla `vpn_companies`

| Columna | Descripción |
|---|---|
| `id` | Identificador UUID. |
| `tunnel_id` | Túnel al que pertenece la empresa. |
| `company_number` | Número **X** de la empresa. Único dentro de su túnel. |
| `name` | Nombre de la empresa. |
| `group_name` | Grupo empresarial. Opcional. |
| `vpn_number` | Identificador visible, por ejemplo `Lsoft-VPN-05`. |
| `vpn_range` | Rango de la subred, por ejemplo `10.0.5.0/24`. En túneles Radmin queda como `N/A`. |
| `status` | `Activo`, `Inactivo` o `Mantenimiento`. |
| `created_by` | Usuario que la registró. |

La restricción `unique_tunnel_company_number` es la que garantiza que el número de empresa no se repita dentro de un mismo túnel.

### Tabla `vpn_peers`

| Columna | Descripción |
|---|---|
| `id` | Identificador UUID. |
| `company_id` | Empresa a la que pertenece. Con borrado en cascada. |
| `pc_number` | Número **Y** del dispositivo. |
| `ip` | Dirección completa. Única en toda la tabla. Queda vacía en túneles Radmin. |
| `device_name` | Nombre del equipo, por ejemplo `LAPTOP-JUAN`. |
| `user_name` | Usuario asignado. |
| `public_key` | Clave pública WireGuard del dispositivo. Vacía en túneles Radmin. |
| `private_key` | Clave privada del dispositivo, necesaria para volver a generar el `.conf`. |
| `notes` | Notas libres, usadas sobre todo en los equipos de Radmin. |
| `status` | `Activo` o `Inactivo`. |
| `created_by` | Usuario que lo registró. |

La restricción `unique_company_pc_number` impide dos equipos con el mismo número **Y** en una misma empresa.

### Funciones RPC

Las dos operaciones de creación se ejecutan mediante funciones en PostgreSQL en lugar de inserciones directas:

- **`create_vpn_company`** recibe el túnel, calcula el siguiente número de empresa dentro de ese túnel, arma el identificador y el rango con su prefijo, e inserta el registro.
- **`create_vpn_peer`** bloquea la fila de la empresa con `FOR UPDATE` antes de calcular el número de PC, y construye la IP con el prefijo del túnel de esa empresa. Ese bloqueo es lo que garantiza que dos administradores creando equipos al mismo tiempo no obtengan la misma dirección IP. Si el túnel es de tipo Radmin, guarda el equipo sin IP ni claves.

Ambas validan que el número y la IP no estén ocupados y lanzan una excepción con un mensaje legible si lo están. El servicio en el frontend tiene una ruta de respaldo con inserción directa por si alguna función no estuviera disponible en la base de datos.

---

## 6. Generación de claves

Las claves se generan en el navegador del administrador, no en el dispositivo del usuario final. El proceso es:

1. Se obtienen 32 bytes aleatorios con `crypto.getRandomValues`.
2. Se aplica el *clamping* que exige WireGuard sobre el primer y el último byte.
3. Se deriva la clave pública multiplicando el escalar por el punto base de Curve25519, con una implementación de la escalera de Montgomery descrita en el RFC 7748.
4. Ambas claves se codifican en Base64, el formato que usa WireGuard.

Esto significa que el administrador no necesita pedirle al usuario que genere nada: al crear el equipo, el módulo ya entrega el túnel completo y listo para usar.

En los túneles de tipo Radmin este paso se omite por completo.

---

## 7. Configuración que entrega el módulo

### Archivo del cliente

```ini
[Interface]
PrivateKey = <clave privada generada para el dispositivo>
Address = <prefijo>.X.Y/<cidr>
DNS = <dns del túnel>

[Peer]
PublicKey = <clave pública del servidor del túnel>
AllowedIPs = <allowed ips del túnel>
Endpoint = <endpoint>:<puerto>
PersistentKeepalive = <keepalive>
```

### Bloque del servidor

```ini
[Peer]
# <nombre del equipo> - <usuario>
PublicKey = <clave pública del dispositivo>
AllowedIPs = <prefijo>.X.Y/32
```

Todos esos parámetros se leen del túnel al que pertenece la empresa. Si cambia el endpoint, la clave pública o el DNS de un servidor, se corrige desde **Editar Túnel** en la intranet y las configuraciones que se generen después ya salen con el valor nuevo.

---

## 8. Nomenclatura de los archivos descargados

El archivo `.conf` se descarga con el nombre `[prefijo del túnel]-NN.conf`, donde `NN` es el número de empresa con dos dígitos: `Lsoft-VPN-01.conf`, `Lsoft-VPN-05.conf`.

Cuando una empresa tiene más de un equipo, a partir del segundo se añade el número de PC como sufijo para que los archivos no se sobreescriban en la carpeta de descargas: `Lsoft-VPN-05-02.conf`, `Lsoft-VPN-05-03.conf`.

Como el prefijo es distinto en cada túnel, dos empresas con el mismo número en túneles diferentes tampoco generan archivos con el mismo nombre.

El nombre exacto se muestra en la interfaz antes de descargar, tanto en la etiqueta *Archivo* como en el propio botón.

---

## 9. Flujo de uso

### Elegir el túnel

Las pestañas superiores son los túneles. Cada una indica cuántas empresas y cuántos PCs contiene. Si quien entra es administrador, debajo aparece además una ficha con el endpoint, el prefijo de IP y la clave pública del servidor correspondiente. Todo lo que se cree a continuación pertenece al túnel seleccionado.

### Registrar una empresa

1. Seleccionar la pestaña del túnel donde va la empresa.
2. Pulsar **Nueva Empresa**.
3. Completar el nombre y, opcionalmente, el grupo.
4. Dejar vacío el número de empresa para que se asigne el siguiente consecutivo de ese túnel, o escribirlo si la empresa ya tiene un rango en producción.
5. Guardar. El módulo crea el identificador y el rango usando el prefijo del túnel.

### Crear el túnel de un equipo

1. Hacer clic sobre la fila de la empresa para entrar a su detalle.
2. Pulsar **Crear Nuevo Peer**.
3. Indicar el nombre del equipo y el usuario asignado. El número de PC se deja vacío salvo que se necesite uno específico.
4. Al guardar aparece un panel con las dos configuraciones: el bloque del servidor a la izquierda y el archivo del cliente a la derecha, con botones para copiar y para descargar el `.conf`.

### Registrar un equipo en Radmin

El flujo es el mismo, pero el formulario reemplaza la generación de claves por un campo de **Notas**, y el detalle del equipo muestra una ficha en lugar de archivos de configuración.

### Aplicar el peer en el servidor

Copiar el bloque `[Peer]` y pegarlo en el archivo de configuración del servidor WireGuard que corresponde al túnel. **Pegar el bloque no activa el acceso por sí solo**: hay que recargar la interfaz en el servidor, por ejemplo con `wg addconf`, `wg set` o reiniciando el servicio.

### Volver a consultar la configuración

Hacer clic sobre la fila del equipo en la tabla de detalle. Se abre una ventana con el archivo del cliente y el bloque del servidor, ambos con opción de copiar y de descargar. Como las claves quedan almacenadas, la configuración se puede recuperar en cualquier momento, incluso después de cerrar sesión o desde otro computador.

Los equipos registrados antes de aplicar la migración `add_private_key_to_vpn_peers.sql` no tienen clave privada guardada. En esos casos la ventana muestra un aviso y la línea `PrivateKey` debe completarse manualmente con la clave del dispositivo.

---

## 10. Consideraciones de seguridad

La clave privada de cada dispositivo queda almacenada en la tabla `vpn_peers`. Esto es lo que permite volver a descargar el archivo de configuración más adelante, y es una decisión consciente a cambio de esa comodidad. El acceso a la tabla está restringido por políticas RLS a los roles `ADMIN`, `TECH` y `SOPORTE`.

Si en el futuro se quisiera endurecer este punto, la alternativa sería cifrar la columna con el mismo esquema de bóveda que usa el Gestor de Claves, o dejar de persistirla y mostrarla una sola vez al crear el túnel.

Sobre la visibilidad de los parámetros del servidor: la ocultación para técnicos y soporte se aplica en la interfaz. A nivel de base de datos, la tabla `vpn_tunnels` sigue siendo legible por los tres roles, porque el endpoint y la clave pública del servidor son necesarios para armar cualquier archivo `.conf` de cliente, y esos mismos datos aparecen dentro de la configuración que descargan. Lo que sí queda bloqueado en la base de datos para técnicos y soporte es modificar, crear o eliminar túneles.

Sobre el alcance del acceso: el valor de `AllowedIPs` del cliente se define por túnel. Con `10.0.0.1/32` el cliente solo enruta hacia esa dirección a través de la VPN; con `10.1.0.1/16` alcanza toda la subred. Si un equipo necesitara un alcance distinto, se ajusta ese campo en la configuración del túnel.

---

## 11. Instalación en una base de datos nueva

Ejecutar en el SQL Editor de Supabase, en este orden:

1. `sql/create_vpn_management_tables.sql`
2. `sql/add_private_key_to_vpn_peers.sql`
3. `sql/add_vpn_tunnels.sql`

El primer script ya incluye la columna `private_key` en la definición de la tabla, por lo que el segundo solo es imprescindible en instalaciones que se crearon antes de ese cambio. El tercero crea la tabla de túneles, siembra los tres túneles actuales, asigna al principal todas las empresas que ya existían y reemplaza las dos funciones RPC por sus versiones con soporte de túnel. Los tres son seguros de volver a ejecutar, ya que usan `IF NOT EXISTS` y `CREATE OR REPLACE`.
