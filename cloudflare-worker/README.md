# Desplegar el Worker de síntesis (Gemini)

Esta carpeta NO se sube con el resto del sitio a GitHub Pages — GitHub
Pages solo sirve archivos estáticos, no ejecuta Workers. Se despliega
aparte, una sola vez, con Cloudflare.

**No probado contra la API real de Gemini** — el entorno donde se escribió
este código no tenía acceso de red a Gemini. La sintaxis y la lógica de
armado de prompt/cache sí se probaron con datos simulados. Probalo en
cuanto lo despliegues, con una tirada real.

## Paso a paso

1. **Cuenta de Cloudflare** (gratis, sin tarjeta): https://dash.cloudflare.com/sign-up

2. **Instalar wrangler** (la herramienta de línea de comandos de Cloudflare):
   ```
   npm install -g wrangler
   wrangler login
   ```
   Esto abre el navegador para loguearte con tu cuenta de Cloudflare.

3. **Conseguir una clave de Gemini** (gratis, sin tarjeta): https://aistudio.google.com/apikey
   → "Create API key" → copiala, la vas a usar en el paso 5.

4. **Crear el namespace de KV** (el "cache"), parado en esta carpeta:
   ```
   wrangler kv namespace create CACHE_SINTESIS
   ```
   Esto devuelve algo como:
   ```
   { binding = "CACHE_SINTESIS", id = "abc123..." }
   ```
   Copiá ese `id` y pegalo en `wrangler.toml`, reemplazando
   `PEGAR_AQUI_EL_ID_QUE_DEVUELVE_WRANGLER`.

5. **Guardar las 3 claves de Gemini como secretos** (nunca van en texto plano
   en ningún archivo). Cada una de tus 3 cuentas de Google te dio una clave
   distinta en el paso 3 — guardalas con estos 3 nombres exactos, uno por
   comando:
   ```
   wrangler secret put GEMINI_API_KEY_1
   wrangler secret put GEMINI_API_KEY_2
   wrangler secret put GEMINI_API_KEY_3
   ```
   Cada comando te va a pedir que pegues una clave — pegá una distinta en
   cada uno. Si una de las 3 llega a fallar (cuota agotada, clave inválida),
   el Worker prueba automáticamente con la siguiente, sin que se note del
   lado del sitio.

6. **Desplegar**:
   ```
   wrangler deploy
   ```
   Al terminar te da una URL tipo:
   `https://el-codigo-de-las-cartas-sintesis.TU-SUBDOMINIO.workers.dev`

   **Copiá esa URL** — la necesitás para el paso 7.

7. **Conectar el sitio con el Worker**: abrí `js/sintesis-ia.js` (en la raíz
   del repo, no en esta carpeta) y pegá la URL del paso 6 en la constante
   `WORKER_URL` que está al principio del archivo. Si la dejás vacía
   (`''`), el sitio sigue funcionando exactamente igual que ahora, sin
   IA — no se rompe nada por no tener esto configurado.

8. **Probar**: entrá a una tirada cualquiera en el sitio y mirá si el
   párrafo de síntesis aparece arriba de la lista de razones, en Respuesta.
   Si no aparece, abrí la consola del navegador (F12) — cualquier error de
   red o de CORS se va a ver ahí.

## Costos

Con hasta 10 usuarios, esto se queda cómodamente dentro de las cuotas
gratis de ambos servicios (100.000 pedidos/día en Cloudflare Workers,
la cuota diaria de Gemini Flash) — no debería generar ningún cargo.
Ninguno de los dos pide tarjeta de crédito para el nivel gratis.
