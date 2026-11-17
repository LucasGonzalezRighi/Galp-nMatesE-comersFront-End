import type { LegalContent } from '../../../generated/schema'

/**
 * Política de privacidad de fábrica de la tienda (esquema b.1 del informe de leyes, sin el punto 13:
 * el número de inscripción en el Registro Nacional de Bases de Datos lo completa el dueño).
 * Cuerpo en el formato de los documentos legales (secciones con `## `, listas con `- ` y enlaces
 * `[texto](destino)`) y con los datos del vendedor como marcadores `{{clave}}` que resuelve la tienda.
 */
export const LEGAL_PRIVACY: LegalContent = {
  title: 'Política de privacidad',
  updatedAt: '2026-11-09',
  body: [
    'Esta política te cuenta qué datos personales usa Galpón Mates, para qué, con quién los compartimos, cuánto tiempo los guardamos y cómo ejercés tus derechos. Es independiente de los [Términos y condiciones](/terminos).',

    '## Quién es el responsable de tus datos',
    'El responsable es {{razon_social}}, CUIT {{cuit}}, con domicilio en {{domicilio}}. Para cualquier tema de datos personales, escribinos a {{email}}.',

    '## Qué datos pedimos y en qué formulario',
    'Solo te pedimos lo que hace falta para cada cosa. Los datos opcionales los podés dejar en blanco.',
    [
      '- Crear una cuenta: nombre, apellido, email y contraseña. La contraseña no se guarda tal cual: guardamos una versión transformada que no permite leerla.',
      '- Datos de tu cuenta: nombre, apellido, teléfono (opcional) y las direcciones que guardes.',
      '- Comprar: email, nombre, apellido, teléfono (opcional) y la dirección de envío o los datos de la sucursal, según el método que elijas. Si elegís retiro en persona, no te pedimos dirección.',
      '- Pagar con tarjeta: el número, el vencimiento y el código de seguridad los cargás en campos de Mercado Pago y no pasan por nuestra tienda. Mercado Pago también te pide el titular y el tipo y número de documento. De la tarjeta solo guardamos la marca, los últimos 4 dígitos y el banco emisor.',
      '- Escribirnos por el formulario de contacto: nombre, email, motivo, mensaje y número de pedido (opcional).',
      '- Pedir el arrepentimiento de una compra: nombre, el email que usaste en la compra, número de pedido (opcional) y comentario (opcional). No hace falta tener una cuenta.',
      '- Dejar una reseña: la puntuación, el texto y el nombre que quieras mostrar (opcional; puede ser tu nombre de pila o tus iniciales). No te pedimos el email.',
    ].join('\n'),
    'Además, cuando usás la tienda se generan algunos datos técnicos:',
    [
      '- una cookie de sesión, que te mantiene dentro de tu cuenta y protege los formularios (más en la [Política de cookies](/cookies));',
      '- un identificador del dispositivo que toma Mercado Pago cuando pagás con tarjeta, para prevenir fraudes;',
      '- la dirección IP y el navegador desde los que entrás, que quedan en los registros del servidor por seguridad.',
    ].join('\n'),

    '## Para qué los usamos',
    [
      '- Tomar, cobrar, preparar y entregar tus pedidos.',
      '- Manejar tu cuenta.',
      '- Responder tus consultas y reclamos.',
      '- Tramitar arrepentimientos, cambios y garantías.',
      '- Publicar las reseñas que nos mandás.',
      '- Proteger la tienda y prevenir fraudes.',
      '- Cumplir nuestras obligaciones legales y fiscales.',
    ].join('\n'),
    'No usamos tus datos para publicidad.',

    '## Por qué podemos usarlos',
    'Los datos que necesitamos para venderte y entregarte lo que compraste se usan porque hacen falta para cumplir esa compra (Ley 25.326, art. 5). Publicar una reseña es voluntario: la publicamos porque nos la mandaste, y podés pedir que la borremos cuando quieras.',

    '## Qué pasa si no nos das tus datos',
    'Sin tu email, tu nombre y, si pedís envío, la dirección o los datos de la sucursal, no podemos tomar ni entregar tu pedido. Sin tu nombre y el email de la compra no podemos ubicar una solicitud de arrepentimiento. Los datos opcionales no cambian nada de tu compra.',

    '## Con quién los compartimos',
    'Compartimos tus datos solo con quienes nos ayudan a hacer funcionar la tienda, y solo lo que cada uno necesita:',
    [
      '- Mercado Pago, que procesa los pagos: recibe tu email, tu nombre y, si pagás con tarjeta, los datos de la tarjeta y del documento.',
      '- La empresa de transporte que lleva tu pedido: tu nombre, tu teléfono si lo diste y la dirección o la sucursal.',
      '- Los proveedores que alojan la tienda y su base de datos.',
      '- El proveedor de correo electrónico con el que te mandamos los mails de tu pedido y te respondemos.',
    ].join('\n'),
    'Algunos de estos proveedores pueden guardar o procesar los datos fuera de la Argentina. También podemos tener que entregar datos a una autoridad que los pida según la ley. No vendemos tus datos.',

    '## Cuánto tiempo los guardamos',
    [
      '- Tu cuenta: hasta que la elimines.',
      '- Pedidos y solicitudes de arrepentimiento: 10 años, porque la ley nos obliga a conservar esos registros.',
      '- Mensajes del formulario de contacto: 24 meses.',
      '- Registros técnicos de los pagos: 90 días.',
      '- Enlaces para cambiar la contraseña: los borramos 7 días después de que vencen.',
      '- Datos técnicos que usamos para no duplicar un pedido o un pago: 48 horas.',
    ].join('\n'),
    'Pasados esos plazos, los borramos.',

    '## Tus derechos y cómo ejercerlos',
    'Podés pedirnos en cualquier momento:',
    [
      '- Acceso: saber qué datos tuyos tenemos. Te respondemos dentro de los 10 días corridos y es gratis cada 6 meses.',
      '- Rectificación y actualización: corregir datos que estén mal o desactualizados.',
      '- Supresión: que borremos tus datos, salvo los que la ley nos obliga a conservar.',
      '- Revocar tu consentimiento: por ejemplo, pedir que saquemos una reseña tuya.',
    ].join('\n'),
    'Para la rectificación, la actualización y la supresión tenemos 5 días hábiles. Escribinos a {{email}}, mejor desde el email de tu cuenta o el de tu compra: solo te pedimos lo necesario para confirmar que sos vos.',
    'Además, podés eliminar tu cuenta desde la tienda: entrá a [tu cuenta](/cuenta), elegí "Eliminar mi cuenta" y confirmá con tu contraseña. Al eliminarla borramos tus direcciones, cerramos todas tus sesiones y quitamos tus datos personales de la cuenta. Tus pedidos dejan de estar unidos a la cuenta y de cada uno conservamos solo los datos mínimos del comprobante, por el plazo de 10 años que pide la ley.',

    '## Agencia de Acceso a la Información Pública',
    'LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.',
    'Encontrás cómo contactarla en el [sitio de la Agencia](https://www.argentina.gob.ar/aaip).',

    '## Cómo cuidamos tus datos',
    'Usamos medidas técnicas y de organización razonables para proteger tus datos: la tienda funciona con conexión cifrada, las contraseñas no se guardan tal cual y los datos de la tarjeta no pasan por nuestros servidores. Ningún sistema es infalible, así que no podemos prometer una seguridad absoluta.',

    '## Cookies y almacenamiento en tu navegador',
    'La tienda usa una cookie de sesión y guarda en tu navegador el carrito y la compra en curso. No usamos cookies de analítica ni de publicidad. El detalle está en la [Política de cookies](/cookies).',

    '## Menores de edad',
    'Para comprar y para crear una cuenta tenés que ser mayor de 18 años.',

    '## Cambios en esta política',
    'Si cambiamos esta política, publicamos la versión nueva en esta página con su fecha de actualización, que ves arriba. Los cambios valen desde esa fecha.',
  ].join('\n\n'),
}
