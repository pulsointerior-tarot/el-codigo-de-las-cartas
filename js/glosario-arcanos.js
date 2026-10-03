/**
 * @file glosario-arcanos.js
 * @description Texto fijo del glosario que se muestra al final de
 *   arcanos.html: para cada campo de la ficha de carta, su etiqueta tal
 *   como aparece en la app y una explicación de qué es y cómo influye.
 *   Es el mismo contenido para las 78 cartas de una tradición — por eso
 *   vive en un archivo aparte en vez de repetirse en cada carta del JSON,
 *   y se renderiza una sola vez por tradición activa (arcanos-init.js:
 *   _renderGlosario()), no dentro del modal de cada carta.
 *
 * FUENTE: tablas de campos aportadas por el usuario (Marsella y RWS),
 *   16/9/2026. Los campos marcados "NO SE MUESTRA" en esas tablas
 *   (id, slug, numero_arabigo, id_arcano_mayor_numerico_rel) se excluyen
 *   a propósito — no tienen ficha visible en la app.
 * AÑADIDOS A PEDIDO DEL USUARIO (no estaban en las tablas originales):
 *   - Marsella: "Personalidad" (aspectos_personalidad) — el campo existe
 *     en cartas-marsella.json y ya se mostraba en el modal antes de este
 *     cambio; se documenta acá con el mismo texto que usa la tabla RWS
 *     para el campo equivalente.
 *   - RWS: "Verdad arquetípica" (esencia) ya estaba en la tabla original,
 *     no hizo falta añadirlo — se deja la nota para que quede constancia
 *     de que ambos casos señalados por el usuario quedaron cubiertos.
 *
 * Exports: GLOSARIO_MARSELLA, GLOSARIO_RWS — mismo formato:
 *   [{ seccion: string, campos: [{ etiqueta: string, texto: string }] }]
 */

export const GLOSARIO_MARSELLA = [
  {
    seccion: 'Identificación del arcano',
    campos: [
      { etiqueta: 'Numeración clásica', texto: 'Número tradicional de la carta tal como aparece impreso en el mazo: cero en Le Mat, numeral romano en el resto de los Mayores, la palabra «AS» en los ases, un dígito llano en los numerales menores. En las figuras de la corte queda vacío.' },
      { etiqueta: 'Nombre del Arcano', texto: 'Nombre oficial de la carta en francés, en mayúsculas — LE MAT, AS DE DENIERS —, fiel a la tradición del mazo. Es el nombre que reconoce el consultante y el que aparece en toda la ficha.' },
      { etiqueta: 'Tipo de Arcano', texto: 'Distingue si la carta es un Arcano Mayor o un Arcano Menor. Es la clasificación más básica del sistema: fija de entrada el peso simbólico de la carta y determina en qué hoja de combinaciones cae cuando se cruza con otra.' },
      { etiqueta: 'Palo', texto: 'Palo tradicional del Arcano Menor —Bâtons, Coupes, Épées o Deniers—; vacío en los Arcanos Mayores, que no pertenecen a ningún palo. Sitúa a la carta menor en uno de los cuatro terrenos clásicos de la experiencia humana.' },
      { etiqueta: 'Elemento', texto: 'Energía elemental —Fuego, Agua, Aire o Tierra— asociada al palo; vacía en los Arcanos Mayores, cuyo campo de acción trasciende por completo el plano elemental. Es la base de la que se deriva, más adelante, la afinidad entre cartas al combinarse.' },
      { etiqueta: 'Esencia de la carta', texto: 'Rasgos definitorios esenciales de la carta, en un único registro sin versión invertida. Funciona como anclaje rápido antes de leer el resto de la ficha: fija en una frase qué es la carta.' },
    ],
  },
  {
    seccion: 'Resumen rápido',
    campos: [
      { etiqueta: 'Palabras asociadas', texto: 'Lista breve de términos sueltos que resumen la energía de la carta para una consulta de un vistazo, sin necesidad de leer un párrafo completo. Es el campo de mayor uso en lecturas rápidas o en tiradas con muchas cartas.' },
      { etiqueta: 'Respuesta rápida: Sí o No', texto: 'Resolución directa —sí o no— con un matiz breve, pensada para preguntas binarias del tipo «¿es un buen momento para…?». Da una orientación inmediata cuando la pregunta lo exige, sin sustituir una lectura completa.' },
    ],
  },
  {
    seccion: 'Interpretación narrativa',
    campos: [
      { etiqueta: 'Dirección de los acontecimientos', texto: 'Hacia dónde empuja la energía de la carta, no dónde está en este momento. Orienta la lectura hacia la dirección de movimiento que sugiere la carta dentro de una tirada.' },
      { etiqueta: 'Cómo se manifiesta', texto: 'Registro de lo que se percibe cuando la carta aparece: qué siente o nota el consultante en el ambiente, no qué va a ocurrir después. Aporta el matiz emocional inmediato de la lectura.' },
    ],
  },
  {
    seccion: 'Perfil psicológico',
    campos: [
      { etiqueta: 'Personalidad', texto: 'El temperamento que asoma cuando la carta representa a una persona concreta y no una energía abstracta. Ayuda a delinear a alguien real dentro de la consulta.' },
    ],
  },
  {
    seccion: 'Áreas de consulta',
    campos: [
      { etiqueta: 'Amor y vínculos', texto: 'Aplica la energía general de la carta al terreno de la pareja y los vínculos afectivos. Responde directamente a consultas sentimentales.' },
      { etiqueta: 'Expresión creativa', texto: 'Aplica la carta a proyectos creativos, arte y expresión personal — qué favorece o qué bloquea la inspiración y su materialización.' },
      { etiqueta: 'Crisis y transformación', texto: 'Aplica la carta a procesos de ruptura, cambio importante o renacimiento — cómo se atraviesa ese proceso, con apertura o con resistencia.' },
      { etiqueta: 'Decisiones', texto: 'Aplica la carta a encrucijadas y dilemas — qué claridad u obstáculo trae a la hora de elegir un camino.' },
      { etiqueta: 'Espiritualidad', texto: 'Aplica la carta al crecimiento interior y a la práctica espiritual del consultante, en un registro de camino personal dentro del orden simbólico del mazo, no de una experiencia mística puntual.' },
      { etiqueta: 'Familia y hogar', texto: 'Aplica la carta a la convivencia y al entorno doméstico — armonía, tensión, roles y dinámicas dentro del hogar o la familia.' },
      { etiqueta: 'Finanzas y trabajo', texto: 'Aplica la carta al ámbito laboral y económico — oportunidad, estabilidad, estancamiento o riesgo en ese terreno.' },
      { etiqueta: 'Lectura general', texto: 'Lectura de la carta sin un ámbito de vida específico; funciona como comodín cuando la consulta no precisa un dominio concreto, o en posiciones de síntesis dentro de una tirada.' },
      { etiqueta: 'Salud', texto: 'Aplica la carta al bienestar físico y energético, siempre en un registro simbólico — nunca como diagnóstico ni sustituto de una consulta médica.' },
      { etiqueta: 'Viajes y cambios', texto: 'Aplica la carta a desplazamientos y cambios de entorno físico — qué favorece o qué retrasa un movimiento o una mudanza.' },
    ],
  },
  {
    seccion: 'Guía práctica',
    campos: [
      { etiqueta: 'Siguiente paso', texto: 'Recomendación concreta de acción inmediata, formulada como instrucción — qué hacer a partir de esta carta, no solo qué significa.' },
      { etiqueta: 'Atención', texto: 'Advertencia breve sobre el riesgo o el punto ciego propio de esta energía, en tono de cautela, nunca catastrofista.' },
      { etiqueta: 'Marco temporal', texto: 'Estimación del marco temporal en que suele manifestarse la energía de la carta.' },
      { etiqueta: 'Entorno', texto: 'Tipo de entorno físico o simbólico asociado a la carta, útil cuando la consulta tiene un componente espacial.' },
      { etiqueta: 'Dinámica', texto: 'Cómo se mueve la energía de la carta —expansiva, contractiva o estática—, complementario a la tendencia: aquí importa el tipo de movimiento, no su dirección.' },
    ],
  },
  {
    seccion: 'Iconografía',
    campos: [
      { etiqueta: 'Escena representada', texto: 'Descripción objetiva de lo que aparece dibujado en la carta —figuras, objetos, disposición—, sin asignar todavía ningún significado. Es la base factual sobre la que se apoya el simbolismo.' },
      { etiqueta: 'Orientación de la mirada', texto: 'Hacia dónde mira la figura central de la carta, según la iconografía tradicional del Marsella. Es la base de la que se deriva la orientación temporal de la mirada, y el dato que permite comparar cómo se relacionan dos figuras cuando la carta se combina con otra.' },
      { etiqueta: 'Perspectiva temporal', texto: 'Traduce la dirección de la mirada a un marco simbólico de tiempo —pasado, presente o futuro—. Da a la carta un eje temporal propio dentro de la tirada.' },
      { etiqueta: 'Lectura simbólica', texto: 'Interpretación de los elementos visuales de la lámina en clave marsellesa: qué representa cada objeto o gesto dentro de la escena.' },
      { etiqueta: 'Elementos simbólicos', texto: 'Inventario breve, sin interpretar, de los objetos y figuras reconocibles de la lámina. Es el listado que permite comparar, más adelante, cuánto se repite una imagen entre dos cartas cuando se combinan.' },
      { etiqueta: 'Estructura numerológica', texto: 'Explica qué aporta el número de la carta a su significado, dentro de la numerología propia del Marsella — el papel simbólico del número en sí, más allá del palo o la escena.' },
      { etiqueta: 'Influencia del palo', texto: 'Explica cómo el palo de la carta modula el significado de su número, o bien, en los Arcanos Mayores, por qué su significado trasciende los cuatro palos.' },
    ],
  },
  {
    seccion: 'Estructura numerológica y elemental',
    campos: [
      { etiqueta: 'Jerarquía de la figura', texto: 'Tipo de figura representada en la carta —realeza, figura humana, figura alegórica, o ausencia de figura—. Da el registro de autoridad de la energía y sostiene, más adelante, la jerarquía entre dos cartas cuando se combinan.' },
      { etiqueta: 'Arcano asociado', texto: 'Nombre del Arcano Mayor cuyo número coincide con el de un numeral menor. Le presta a ese numeral el matiz simbólico del triunfo con el que comparte número, sin que ese triunfo aparezca físicamente en la tirada.' },
      { etiqueta: 'Ciclo evolutivo', texto: 'Agrupa la carta dentro de un ciclo numerológico propio del Marsella, del 1 al 7, que se repite tres veces a lo largo del mazo. Marca la fase del ciclo que expresa la carta —origen, dualidad, manifestación, estabilidad, cambio, equilibrio o cierre.' },
      { etiqueta: 'Afinidad elemental', texto: 'Agrupa los cuatro palos en dos polaridades amplias —activa o receptiva—, más la condición de los Arcanos Mayores, que no tienen polaridad elemental. Es la base de la que se deriva la afinidad entre dos cartas al combinarse.' },
    ],
  },
];

export const GLOSARIO_RWS = [
  {
    seccion: 'Identificación del arcano',
    campos: [
      { etiqueta: 'Numeración clásica', texto: 'El número tal como aparece en la propia lámina, con la forma que corresponde a cada familia: numeral romano en los triunfos, la palabra As en los ases, un número llano en los naipes intermedios, y ausencia total de número en las figuras de la corte.' },
      { etiqueta: 'Nombre del Arcano', texto: 'El nombre con que se conoce la carta, conservado siempre en su idioma original por fidelidad al mazo tal como se concibió. Es el nombre que reconocerá el consultante.' },
      { etiqueta: 'Tipo de Arcano', texto: 'La primera gran división del mazo: si la carta es un triunfo o pertenece a uno de los cuatro palos menores, y dentro de estos, si es as, naipe intermedio o figura de la corte. Marca de entrada qué clase de energía trae la carta.' },
      { etiqueta: 'Palo', texto: 'El terreno al que pertenece un naipe menor. Los triunfos no llevan palo: su alcance no cabe en ninguno de los cuatro ámbitos que estos representan.' },
      { etiqueta: 'Elemento', texto: 'El fuego, el agua, el aire o la tierra que corresponde a la carta, siguiendo la correspondencia propia de este mazo — aquí, a diferencia de otras tradiciones, también los triunfos llevan su propio elemento, heredado de su vínculo astrológico. De este dato depende buena parte de cómo se comportan dos cartas al combinarse.' },
      { etiqueta: 'Esencia de la carta', texto: 'El retrato más amplio de cómo se comporta esta energía — el primer contacto con la carta antes de entrar en cualquier otro matiz.' },
    ],
  },
  {
    seccion: 'Resumen rápido',
    campos: [
      { etiqueta: 'Palabras asociadas', texto: 'Un puñado de términos que capturan la energía de la carta de un solo vistazo, sin necesidad de leer nada más largo. Resulta muy útil en tiradas amplias, donde no siempre hay tiempo de detenerse en cada carta.' },
      { etiqueta: 'Respuesta rápida: Sí o No', texto: 'Una resolución directa entre sí y no, acompañada de un matiz, pensada para cuando la consulta pide algo puntual y no una reflexión extensa.' },
    ],
  },
  {
    seccion: 'Interpretación narrativa',
    campos: [
      { etiqueta: 'Dirección de los acontecimientos', texto: 'No dice dónde está la energía, sino hacia dónde se dirige. Da una idea de rumbo más que de estado.' },
      { etiqueta: 'Cómo se manifiesta', texto: 'Lo que se respira cuando la carta aparece: el clima que deja en el ambiente antes de que ocurra nada más.' },
      { etiqueta: 'Verdad arquetípica', texto: 'La enseñanza de fondo que trae la carta, más allá de cualquier situación puntual — el nivel más filosófico de toda la ficha.' },
    ],
  },
  {
    seccion: 'Perfil psicológico',
    campos: [
      { etiqueta: 'Personalidad', texto: 'El temperamento que asoma cuando la carta representa a una persona concreta y no una energía abstracta. Ayuda a delinear a alguien real dentro de la consulta.' },
    ],
  },
  {
    seccion: 'Áreas de consulta',
    campos: [
      { etiqueta: 'Amor y vínculos', texto: 'Aplica la energía general de la carta al terreno de la pareja y los vínculos afectivos. Responde directamente a consultas sentimentales.' },
      { etiqueta: 'Expresión creativa', texto: 'Aplica la carta a proyectos creativos, arte y expresión personal — qué favorece o qué bloquea la inspiración y su materialización.' },
      { etiqueta: 'Crisis y transformación', texto: 'Aplica la carta a procesos de ruptura, cambio importante o renacimiento — cómo se atraviesa ese proceso, con apertura o con resistencia.' },
      { etiqueta: 'Decisiones', texto: 'Aplica la carta a encrucijadas y dilemas — qué claridad u obstáculo trae a la hora de elegir un camino.' },
      { etiqueta: 'Espiritualidad', texto: 'Aplica la carta al crecimiento interior y a la práctica espiritual del consultante, en un registro de camino personal dentro del orden simbólico del mazo, no de una experiencia mística puntual.' },
      { etiqueta: 'Familia y hogar', texto: 'Aplica la carta a la convivencia y al entorno doméstico — armonía, tensión, roles y dinámicas dentro del hogar o la familia.' },
      { etiqueta: 'Finanzas y trabajo', texto: 'Aplica la carta al ámbito laboral y económico — oportunidad, estabilidad, estancamiento o riesgo en ese terreno.' },
      { etiqueta: 'Lectura general', texto: 'Lectura de la carta sin un ámbito de vida específico; funciona como comodín cuando la consulta no precisa un dominio concreto, o en posiciones de síntesis dentro de una tirada.' },
      { etiqueta: 'Salud', texto: 'Aplica la carta al bienestar físico y energético, siempre en un registro simbólico — nunca como diagnóstico ni sustituto de una consulta médica.' },
      { etiqueta: 'Viajes y cambios', texto: 'Aplica la carta a desplazamientos y cambios de entorno físico — qué favorece o qué retrasa un movimiento o una mudanza.' },
    ],
  },
  {
    seccion: 'Guía práctica',
    campos: [
      { etiqueta: 'Siguiente paso', texto: 'Una indicación concreta de qué hacer a continuación, no solo de qué significa la carta.' },
      { etiqueta: 'Atención', texto: 'El punto ciego propio de esta energía, señalado con cautela y sin alarmismo.' },
      { etiqueta: 'Marco temporal', texto: 'Una estimación de cuánto puede tardar en manifestarse lo que anuncia la carta.' },
      { etiqueta: 'Entorno', texto: 'El tipo de espacio, físico o simbólico, que mejor acompaña a esta energía.' },
      { etiqueta: 'Dinámica', texto: 'El modo en que se mueve la energía —si se expande o si se repliega—, más allá de hacia dónde apunte.' },
      { etiqueta: 'Actividades sugeridas', texto: 'Un puñado de acciones concretas que ayudan a encarnar esta energía en el día a día, más allá de la reflexión.' },
    ],
  },
  {
    seccion: 'Iconografía',
    campos: [
      { etiqueta: 'Aspecto físico', texto: 'El retrato de la figura que protagoniza la lámina, tal como aparece dibujada: su porte, su vestimenta, su expresión. Es un dato fijo, sin versión invertida, porque describe la imagen tal cual fue pintada.' },
      { etiqueta: 'Escena representada', texto: 'Lo que efectivamente está dibujado en la carta, contado sin interpretar todavía nada — el punto de partida sobre el que se construye el simbolismo.' },
      { etiqueta: 'Simbolismo', texto: 'La lectura de esos elementos dibujados, ya con su carga de sentido.' },
      { etiqueta: 'Símbolos clave', texto: 'Un listado escueto de los objetos y figuras que aparecen en la lámina, sin ningún juicio de significado — útil sobre todo para comparar, más adelante, cuánto se repite una imagen entre dos cartas.' },
      { etiqueta: 'Significado del número', texto: 'Lo que el número de la carta añade a su significado, dentro de la tradición numerológica propia de este mazo.' },
      { etiqueta: 'Relación con el palo', texto: 'Cómo el palo matiza el significado de la carta, o bien, en los triunfos, por qué su alcance no cabe en ningún palo.' },
      { etiqueta: 'Orientación de la mirada', texto: 'Hacia dónde dirige la vista la figura protagonista. De aquí nace la lectura temporal de la carta, y también el modo en que dos figuras se relacionan al combinarse.' },
      { etiqueta: 'Perspectiva temporal', texto: 'Traduce la dirección de la mirada a un tiempo simbólico —lo que ya pasó, lo que ocurre, lo que vendrá—, dando a la carta un eje temporal propio.' },
    ],
  },
  {
    seccion: 'Estructura numerológica y temporal',
    campos: [
      { etiqueta: 'Numerología', texto: 'El valor numérico de la carta, unificado en un solo formato más allá de cómo se escriba su número tradicional. Sobre este dato se calcula la afinidad numérica entre cartas al combinarse.' },
      { etiqueta: 'Velocidad energética', texto: 'Una estimación del ritmo con que suele manifestarse esta energía. Pesa después en el ritmo que adopta cualquier combinación en la que participe esta carta.' },
      { etiqueta: 'Carta de quiebre', texto: 'Señala si esta carta suele marcar un punto de ruptura o de inflexión dentro de una tirada. Cuando aparece, la lectura —o la combinación en la que interviene— hereda ese carácter decisivo.' },
    ],
  },
];
