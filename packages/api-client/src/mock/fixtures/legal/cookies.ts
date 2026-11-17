import type { LegalContent } from '../../../generated/schema'

/**
 * Política de cookies de fábrica de la tienda (esquema b.3 del informe de leyes): solo almacenamiento
 * necesario, sin analítica ni publicidad (por eso no hay banner).
 * Cuerpo en el formato de los documentos legales (secciones con `## `, listas con `- ` y enlaces
 * `[texto](destino)`) y con los datos del vendedor como marcadores `{{clave}}` que resuelve la tienda.
 */
export const LEGAL_COOKIES: LegalContent = {
  title: 'Política de cookies',
  updatedAt: '2026-11-09',
  body: [
    'Esta política explica qué guarda Galpón Mates en tu navegador, para qué y por cuánto tiempo.',

    '## Qué son las cookies y el almacenamiento local',
    'Una cookie es un archivo chiquito que un sitio guarda en tu navegador para recordar algo entre una página y otra, como que ya ingresaste a tu cuenta. El almacenamiento local es parecido: el sitio guarda datos en tu navegador, por ejemplo tu carrito, y no los manda solo a ningún servidor.',

    '## Qué usamos',
    'Todo lo que usamos es necesario para que la tienda funcione o para que el pago sea seguro:',
    [
      '- Cookie __Host-galpon_session, nuestra: mantiene tu sesión y protege los formularios contra envíos falsos. Dura 24 horas si no ingresaste a una cuenta y 30 días si ingresaste.',
      '- Cookie __Host-galpon_admin, nuestra: mantiene la sesión del panel de administración de la tienda. Dura 8 horas y solo la reciben quienes administran la tienda.',
      '- galpon.cart, en el almacenamiento local, nuestro: guarda tu carrito. No vence: queda hasta que lo vacíes o borres los datos del navegador.',
      '- galpon.checkout y galpon.order, en el almacenamiento de la sesión, nuestros: guardan la compra en curso (tus datos de contacto, el envío y el pedido) hasta que cierres la pestaña. Nunca guardan datos de la tarjeta.',
      '- MercadoPago.js, de Mercado Pago: se carga solo cuando elegís pagar con tarjeta. Muestra los campos de la tarjeta y toma un identificador del dispositivo para prevenir fraudes. Su duración la define Mercado Pago.',
    ].join('\n'),
    'Si pagás en el sitio de Mercado Pago (Checkout Pro) o tu banco te pide una verificación (3-D Secure), esas páginas son de Mercado Pago o de tu banco y lo que guarden se rige por sus propias políticas.',
    'Cuando el pie de la tienda muestra el logo de Data Fiscal, tu navegador le pide esa imagen al sitio de ARCA (www.afip.gob.ar). La tienda no suma cookies con ese pedido.',

    '## Qué no usamos',
    'No usamos cookies de analítica ni de publicidad. Tampoco usamos píxeles de redes sociales ni videos o mapas de otros sitios incrustados en la tienda.',

    '## Cómo borrarlas o bloquearlas',
    'Podés borrar las cookies y el almacenamiento local desde la configuración de tu navegador, en la sección de privacidad o de datos de sitios. Si los borrás o los bloqueás:',
    [
      '- se vacía tu carrito;',
      '- se cierra tu sesión y no vas a poder ingresar a tu cuenta mientras estén bloqueadas;',
      '- si estabas en medio de una compra, vas a tener que empezarla de nuevo;',
      '- si bloqueás a Mercado Pago, no vas a poder pagar con tarjeta.',
    ].join('\n'),

    '## Si un día sumamos otras cookies',
    'Si en el futuro queremos usar cookies que no sean necesarias, como las de analítica, te vamos a pedir permiso antes de usarlas, con la opción de rechazarlas y de cambiar tu elección cuando quieras. También vamos a actualizar esta política.',

    '## Contacto y actualización',
    'Si tenés dudas sobre esta política, escribinos a {{email}}. Cómo usamos tus datos personales lo explica la [Política de privacidad](/privacidad). La fecha de la última actualización está arriba.',
  ].join('\n\n'),
}
