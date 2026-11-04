# C&B — Nos vemos fuera

Aplicación para organizar las quedadas de quince amigos en Murcia y Orihuela.

**Repositorio público:** https://github.com/angelmc1402-eng/cb-quedadas

**App desplegada (dirección principal):** https://angelmc1402-eng.github.io/cb-quedadas/

**Servidor de datos y dirección anterior:** https://cb-quedadas-club.capitanmoreno.chatgpt.site

## Qué hace

- Calendario mensual, semanal y lista, con propuestas, confirmaciones y cancelaciones.
- Doble clic o doble toque en un día: abre su plan, permite elegir si hay varios o inicia uno nuevo si está vacío. Intro ofrece la misma acción con teclado. El + pequeño de cada casilla crea directamente un plan con esa fecha.
- Categorías, fecha, hora peninsular, ubicación y Maps, presupuesto y notas.
- Respuestas individuales, comentarios y disponibilidad de cada persona.
- Histórico automático y álbumes; fotos JPG/PNG/WebP optimizadas antes de subir, máximo 5 MB almacenados y retirada de fotos propias.
- Agenda de Orihuela por semana, radar del RSS oficial de Murcia e ideas permanentes, con enlaces para revisar detalles.
- Resúmenes manuales por WhatsApp/correo y exportación ICS con aviso dos horas antes.
- Tutorial, selección de miembro en modo confianza, diseño móvil con navegación inferior y acceso desde pantalla de inicio.

## Cómo está conectado

| Parte | Servicio | Dónde está el código |
| --- | --- | --- |
| Interfaz y URL pública | GitHub Pages (React/Vite) | `app/`, `pages/`, `vite.pages.config.ts` |
| Servidor de API | Sites, Vinext/Cloudflare Workers | `app/api/`, `.openai/hosting.json` |
| Datos compartidos | Proyecto Supabase C&B Quedadas, `gboasldsdeqbzcnmolpp` | `supabase/migrations/` |
| API de datos y permisos | Edge Function `cb-api` | `supabase/functions/cb-api/` |
| Fotos | Bucket privado Supabase `cb-photos`, servido por la app | Edge Function y rutas `app/api/photos/` |
| Copia de origen y migración | D1/R2 originales, conservados | `app/supabase-gateway.ts`, `db/`, `drizzle/` |
| Comprobaciones para GitHub | GitHub Actions, al subir el repositorio | `.github/workflows/verify.yml` |

El navegador solo habla con las rutas de la app. El servidor conecta con la Edge Function mediante una clave privada en el almacén de secretos del alojamiento. La función guarda un verificador SHA-256, nunca la clave original. Las credenciales administrativas de Supabase solo se leen de su entorno del servidor.

Todas las tablas de Supabase tienen RLS activo y acceso directo denegado a `anon` y `authenticated`. La función valida los datos y los permisos antes de usar su acceso de servidor. El bucket es privado; las fotos se sirven mediante la URL pública de la app según el modo actual.

## Primera conexión y conservación de datos

Antes de la primera petición al nuevo backend, el servidor comprueba el marcador de migración. Si falta, copia los registros y fotos de D1/R2 a Supabase, preservando identificadores y hashes de propiedad. El RPC de importación usa una transacción y bloqueo, no sobreescribe registros existentes y solo marca éxito cuando termina. Los datos originales no se borran.

Una vez conectado a Supabase, un fallo de red devuelve error; no cambia silenciosamente a otra base de datos. Esto evita que diferentes miembros escriban en bases separadas.

## Desarrollo

Requiere Node.js 24 y pnpm. Instalar con `pnpm install --frozen-lockfile`.

- `pnpm exec tsc --noEmit`: tipos de la app.
- `node scripts/smoke-test.mjs`: integración D1/R2, validación, permisos, agendas y traslado al gateway con datos controlados.
- `pnpm run build`: compilación del alojamiento.
- `pnpm run dev`: desarrollo local. Sin variables Supabase usa la base local D1 y R2; aplicar las migraciones de `drizzle/` a la base local según el starter.
- `scripts/test-supabase-live.mjs`: comprobación contra el proyecto remoto. Recibe la clave por stdin oculto; crea datos QA temporales. El responsable debe limpiar el plan QA y disponibilidad al finalizar. No se ejecuta en CI.

Las funciones Deno quedan fuera del TypeScript de la app y se compilan al desplegar en Supabase. No se necesita SDK en el cliente.

## Configuración de producción

Variables privadas del servidor de alojamiento:

- `CB_SUPABASE_URL`: `https://gboasldsdeqbzcnmolpp.supabase.co/functions/v1/cb-api`.
- `CB_GATEWAY_KEY`: clave aleatoria privada; su SHA-256 debe coincidir con `gateway-config.ts`.

No guardar valores reales en `.env.example`, GitHub ni `.openai/hosting.json`. La clave está configurada en producción. Para rotarla, generar una nueva, actualizar el verificador de la función, desplegar la función y actualizar el secreto del alojamiento en una ventana controlada.

Las migraciones de `supabase/migrations/` reproducen el esquema y los permisos. La configuración de la función está en `supabase/config.toml`. La función obtiene las claves administrativas desde el entorno de Supabase (`SUPABASE_SECRET_KEYS`, con compatibilidad del entorno legado).

## Publicar cambios y GitHub

La interfaz se publica automáticamente en GitHub Pages al hacer push a `main`. El workflow `.github/workflows/pages.yml` comprueba tipos, pruebas y build estático y despliega `dist-pages/`. No necesita ninguna clave privada para publicar la interfaz.

GitHub Pages sirve el cliente; las rutas existentes `/api` del servidor original siguen realizando todas las operaciones mediante el gateway privado de Supabase. Solo se añade acceso CORS desde `https://angelmc1402-eng.github.io`; no se añade una nueva API pública en Supabase ni se cambian las políticas de sus tablas. Los cambios del backend deben publicarse también como una versión nueva del Site. Los cambios de las funciones de Supabase requieren su despliegue específico.

WhatsApp, correo, resúmenes e ICS generan enlaces canónicos a `https://angelmc1402-eng.github.io/cb-quedadas/?plan=...`, conservando la ruta del repositorio. El cierre de un plan conserva esa ruta y los recursos usan rutas compatibles con Pages.

Para conservar el permiso de editar planes creados en la dirección anterior, abrirla y pulsar «Abrir allí con mi perfil». El botón transfiere nombre y clave de dispositivo mediante el fragmento de la URL, que se consume y borra inmediatamente en Pages. El fragmento no se envía al servidor ni aparece en los enlaces compartidos. Si ya existe otro perfil en Pages, se confirma antes de sustituirlo. No reenviar el enlace temporal de transferencia; compartir siempre los enlaces de los planes.

Desarrollo estático: `pnpm run build:pages`. No incluir `dist-pages`, bases locales ni secretos en GitHub.

## Privacidad y límites actuales

Acceso por enlace público y selección de nombre: son etiquetas, no cuentas verificadas. Quien recibe el enlace puede ver planes, comentarios y fotos. Solo el dispositivo creador edita un plan o retira sus fotos; borrar el almacenamiento del navegador pierde ese permiso. No almacenar contactos o datos sensibles aquí.

La geolocalización opcional solo elige la zona de quien abre la app, sin guardar ni compartir coordenadas. El radar externo depende de sus fuentes y no es exhaustivo. Las ideas están identificadas como propuestas sin reserva ni evento confirmados.

WhatsApp y correo abren borradores que confirma la persona. Los avisos ICS dependen de su calendario. No hay envíos automáticos ni listas de difusión conectadas. Para activarlos se necesita proveedor, remitente, destinatarios y consentimiento; para WhatsApp también la configuración oficial correspondiente.

## Validación de esta edición

Pruebas locales y prueba remota real de Supabase: creación, permisos, RSVP sin duplicados, disponibilidad, comentarios, subida/lectura/borrado de fotos y rechazo de peticiones sin clave del gateway. Se verificó RLS y bucket privado; los datos QA se retiraron. El verificador de seguridad informa únicamente de tablas con RLS sin políticas: es deliberado, porque la API directa está denegada y el acceso se realiza en servidor.

La vista previa del entorno no está disponible, por lo que no se certifica una revisión visual en dispositivos reales.
