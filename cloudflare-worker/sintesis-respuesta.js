/**
 * @file sintesis-respuesta.js
 * @description Cloudflare Worker — genera, en el formato "El Corazón
 *   Dividido" (párrafo por posición + Aspectos positivos + Aspectos a
 *   considerar + Síntesis + Mensaje final), la lectura completa de
 *   CUALQUIER tirada de más de una carta — no está limitado a tiradas de
 *   elección entre opciones; cada posición se trata igual, usando su
 *   propio significado (viene de posiciones.json). Reemplaza el prompt
 *   viejo de "un párrafo corto" (24/9/2026) — ese mecanismo se sacó del
 *   sitio.
 *
 *   NO TESTEADO CONTRA LA API REAL DE GEMINI — este entorno no tiene
 *   acceso de red a generativelanguage.googleapis.com. Probalo apenas
 *   lo despliegues, con una tirada real.
 *
 * @despliegue Ver cloudflare-worker/README.md.
 */

// Modelo actualizado 26/9/2026: gemini-2.5-flash se apaga el 16 de
// octubre de 2026 y ya no acepta cuentas nuevas. Se probó primero
// gemini-3-flash-preview (recomendado por Google como reemplazo), pero
// su cuota gratis medida es de solo 20 consultas por día — no alcanza
// para el uso esperado (hasta 100/día). Se pasó a gemini-3.1-flash-lite:
// 500 consultas gratis por día, de sobra, sin activar pago (decisión
// explícita: este proyecto no es comercial, no se paga nada). Si con el
// tiempo la calidad del texto no convence, la alternativa sería
// gemini-3-flash-preview con más de una cuenta repartiendo la carga, no
// pago — ver notas del proyecto.
const MODELO = 'gemini-3.1-flash-lite';

function _claveCache(idTirada, cartas) {
  const partes = cartas.map(c => `${c.posicion}:${c.carta}:${c.orientacion}`).sort().join('|');
  return `${idTirada}::${partes}`;
}

/**
 * @param {string} nombreTirada
 * @param {Array<{posicion:string, significado:string, carta:string, orientacion:string, caracteristicas:string, tendencia:string, alerta:string, decisiones:string}>} cartas
 */
function _armarPrompt(nombreTirada, cartas) {
  const bloque = cartas.map(c => `
${c.posicion} — ${c.significado}
Carta: ${c.carta} (${c.orientacion})
- Características: ${c.caracteristicas || '—'}
- Tendencia: ${c.tendencia || '—'}
- Punto ciego: ${c.alerta || '—'}
- Decisiones/consejo de esta carta: ${c.decisiones || '—'}`).join('\n');

  return `Sos redactor de un sitio serio de tarot. Tenés los datos reales de una tirada llamada "${nombreTirada}", con ${cartas.length} posiciones. Estos son sus datos, posición por posición — usá SOLO esta información, no inventes ningún dato, hecho, carta ni matiz que no esté acá:
${bloque}

Escribí el resultado completo en español, con ESTA estructura exacta y estos títulos literales, sin usar la palabra "tarot" en ningún momento y sin mencionar que sos una inteligencia artificial:

Para CADA una de las ${cartas.length} posiciones, en el mismo orden en que están arriba:
- Un subtítulo con la posición, el nombre de la carta y su orientación (ej. "C1 — Nombre de la carta").
- Un párrafo de 2 a 3 oraciones en prosa que responda al significado de esa posición específica, apoyándote en las características y la tendencia de la carta.
- "Aspectos positivos" seguido de 3 o 4 viñetas cortas (una frase cada una), con lo favorable de esa carta en ese lugar.
- "Aspectos a considerar" seguido de 2 o 3 viñetas cortas, basadas en el punto ciego de esa carta.

Al final, siempre agregá estas dos secciones, integrando TODAS las posiciones entre sí (no una por una):
- "Síntesis": un párrafo breve que conecte lo que dicen las posiciones en conjunto — si hay caminos o energías que contrastan entre sí, señalalo; si es una sola línea narrativa, resumí el recorrido. Segui con una viñeta corta por cada posición (una frase resumen cada una) y una oración de cierre sobre qué es lo que está realmente en juego.
- "Mensaje final": un párrafo de 2 a 3 oraciones con un consejo integrador que una todo lo anterior, sin forzar una conclusión que el conjunto de cartas no sostenga, invitando a decidir o a mirar la situación desde la honestidad y no desde el miedo.

Devolvé solamente ese texto, con saltos de línea entre secciones. Sin JSON, sin marcado de markdown (nada de #, **, etc.), sin comillas envolviendo todo.`;
}

async function _llamarGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODELO}:generateContent?key=${apiKey}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 3000,
        temperature: 0.5,
        // Los modelos Gemini 3.x usan "thinkingLevel" en vez de
        // "thinkingBudget" (eso era de la familia 2.5). En
        // gemini-3.1-flash-lite el valor por defecto ya es "MINIMAL",
        // pero se deja explícito para que no dependa del valor por
        // defecto de Google, que puede cambiar.
        thinkingConfig: { thinkingLevel: 'MINIMAL' },
      },
    }),
  });
  if (!resp.ok) {
    const detalle = await resp.text().catch(() => '');
    throw new Error(`Gemini respondió ${resp.status}: ${detalle.slice(0, 200)}`);
  }
  const data = await resp.json();
  const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!texto) throw new Error('Gemini no devolvió texto (posible bloqueo de seguridad o respuesta vacía)');
  return texto.trim();
}

/**
 * Prueba las claves en orden y usa la primera que funcione — 3 cuentas
 * de Google distintas, cuotas distintas, se suman de verdad.
 */
async function _llamarGeminiConRotacion(prompt, claves) {
  let ultimoError;
  for (const apiKey of claves) {
    if (!apiKey) continue;
    try {
      return await _llamarGemini(prompt, apiKey);
    } catch (err) {
      ultimoError = err;
      console.error('[sintesis-respuesta] Una clave falló, probando la siguiente:', err.message);
    }
  }
  throw ultimoError || new Error('No hay ninguna clave de Gemini configurada (GEMINI_API_KEY_1/2/3)');
}

function _corsHeaders(origenPermitido) {
  return {
    'Access-Control-Allow-Origin': origenPermitido,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  /**
   * @param {Request} request
   * @param {{ GEMINI_API_KEY_1: string, GEMINI_API_KEY_2: string, GEMINI_API_KEY_3: string, CACHE_SINTESIS: KVNamespace, ORIGEN_PERMITIDO: string }} env
   */
  async fetch(request, env) {
    const origen = env.ORIGEN_PERMITIDO || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: _corsHeaders(origen) });
    }
    if (request.method !== 'POST') {
      return new Response('Método no permitido', { status: 405, headers: _corsHeaders(origen) });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON inválido' }), {
        status: 400, headers: { ..._corsHeaders(origen), 'Content-Type': 'application/json' },
      });
    }

    const { idTirada, nombreTirada, cartas } = body || {};
    if (!idTirada || !nombreTirada || !Array.isArray(cartas) || cartas.length === 0) {
      return new Response(JSON.stringify({ error: 'Faltan idTirada, nombreTirada o cartas' }), {
        status: 400, headers: { ..._corsHeaders(origen), 'Content-Type': 'application/json' },
      });
    }
    if (cartas.length > 12) {
      return new Response(JSON.stringify({ error: 'Demasiadas cartas' }), {
        status: 400, headers: { ..._corsHeaders(origen), 'Content-Type': 'application/json' },
      });
    }

    const clave = _claveCache(idTirada, cartas);

    try {
      const cacheado = await env.CACHE_SINTESIS.get(clave);
      if (cacheado) {
        return new Response(JSON.stringify({ texto: cacheado, deCache: true }), {
          headers: { ..._corsHeaders(origen), 'Content-Type': 'application/json' },
        });
      }
    } catch (err) {
      console.error('[sintesis-respuesta] Error leyendo KV:', err);
    }

    let texto;
    try {
      const prompt = _armarPrompt(nombreTirada, cartas);
      const claves = [env.GEMINI_API_KEY_1, env.GEMINI_API_KEY_2, env.GEMINI_API_KEY_3];
      texto = await _llamarGeminiConRotacion(prompt, claves);
    } catch (err) {
      console.error('[sintesis-respuesta] Error llamando a Gemini:', err);
      return new Response(JSON.stringify({ error: 'No se pudo generar la lectura' }), {
        status: 502, headers: { ..._corsHeaders(origen), 'Content-Type': 'application/json' },
      });
    }

    try {
      await env.CACHE_SINTESIS.put(clave, texto, { expirationTtl: 60 * 60 * 24 * 90 });
    } catch (err) {
      console.error('[sintesis-respuesta] Error guardando en KV:', err);
    }

    return new Response(JSON.stringify({ texto, deCache: false }), {
      headers: { ..._corsHeaders(origen), 'Content-Type': 'application/json' },
    });
  },
};
