import type { LegalContent } from '../../../generated/schema'

/**
 * Términos y condiciones de fábrica de la tienda (esquema b.2 del informe de leyes, sin ninguna
 * cláusula de la lista de la Disp. 377/2026).
 * Cuerpo en el formato de los documentos legales (secciones con `## `, listas con `- ` y enlaces
 * `[texto](destino)`) y con los datos del vendedor como marcadores `{{clave}}` que resuelve la tienda.
 */
export const LEGAL_TERMS: LegalContent = {
  title: 'Términos y condiciones',
  updatedAt: '2026-11-09',
  body: [
    'Estos términos explican cómo funcionan las compras en Galpón Mates: quién te vende, cómo se arma el pedido, los precios, el pago, el envío y tus derechos.',

    '## Quién te vende',
    [
      '- Nombre comercial: Galpón Mates.',
      '- Razón social: {{razon_social}}.',
      '- CUIT: {{cuit}}.',
      '- Condición frente al IVA: {{condicion_iva}}.',
      '- Domicilio: {{domicilio}}.',
      '- Email: {{email}}.',
      '- Atención: {{area_atencion}}, {{horario_atencion}}.',
    ].join('\n'),
    'Al pie de cada página están los enlaces a Defensa del Consumidor y, cuando está disponible, el acceso a Data Fiscal de ARCA.',

    '## Cuándo se aplican estos términos',
    'Mirar la tienda no te obliga a nada. Estos términos se aplican a tu compra cuando confirmás el pedido con el botón "Pagar". Antes de pagar podés leerlos en esta página y guardarlos o imprimirlos con el botón "Imprimir o guardar como PDF".',
    'Para comprar tenés que ser mayor de 18 años.',

    '## Cómo se compra',
    [
      '- Elegís los productos y los sumás al carrito. Podés comprar sin crear una cuenta.',
      '- En el checkout cargás tus datos de contacto, elegís el método de envío y, después, el medio de pago.',
      '- Antes de pagar ves el detalle del pedido con los productos, el costo del envío y el total. Si algo está mal, volvé al paso anterior o al carrito y corregilo.',
      '- Al tocar "Pagar" confirmás el pedido. Te reservamos los productos por 30 minutos para que completes el pago.',
    ].join('\n'),
    'Comprar por internet tiene algunos riesgos propios del medio, como una conexión que se corta en medio del pago. Si pasa, revisá el estado de tu pedido antes de volver a pagar o escribinos.',

    '## Los productos',
    'Mostramos cada producto con fotos y una descripción. Muchas piezas son de calabaza y cuero: los tonos, las vetas y las terminaciones pueden variar un poco de una pieza a otra. Las imágenes de ambientación del inicio están hechas con inteligencia artificial y, como el mate en 3D, son ilustrativas: no muestran un producto puntual.',
    'La yerba se vende en su paquete cerrado de fábrica, con los datos de su rótulo.',

    '## Precios y ofertas',
    'Los precios están en pesos argentinos y son finales. También mostramos el "Precio sin impuestos nacionales". El costo del envío es fijo según el método que elijas y lo ves antes de pagar. El descuento del kit se aplica sobre el total del kit y también lo ves antes de pagar.',
    'Las ofertas valen mientras están publicadas y hasta agotar el stock disponible.',

    '## Pagos y cuotas',
    'Los pagos se hacen con Mercado Pago. Los medios y las cuotas disponibles, con su costo financiero total, te los muestra Mercado Pago al momento de pagar. Una cuota es "sin interés" solo si no pagás ningún interés por ella.',

    '## Cuándo queda hecha la compra',
    'La compra queda hecha cuando confirmás el pedido y Mercado Pago aprueba el pago. Te mandamos la confirmación por mail. No hace falta ninguna aprobación nuestra después de tu pago.',
    'Si después de pagar nos falta stock de algún producto, te avisamos y te devolvemos el total que pagaste, por el mismo medio de pago.',

    '## Envíos y retiro',
    'Podés elegir envío a domicilio, envío a sucursal o retiro en persona sin costo. El costo de cada método lo ves en el checkout, antes de pagar. Cuando despachamos el pedido, cargamos el número de seguimiento y lo ves en tu pedido. Si elegís retiro en persona, te escribimos para coordinar el día, el horario y el lugar.',
    'Si el pedido llega dañado o no llega, escribinos y lo resolvemos nosotros: el riesgo del transporte no corre por tu cuenta.',

    '## Derecho de arrepentimiento',
    'Tenés 10 días corridos desde que recibís el producto para arrepentirte de la compra, sin dar explicaciones y sin costo. Lo pedís con el [Botón de arrepentimiento](/arrepentimiento), sin necesidad de tener una cuenta, o por mail a {{email}}. Te devolvemos todo lo que pagaste, por el mismo medio de pago. El detalle está en [Cambios, devoluciones y arrepentimiento](/devoluciones).',

    '## Garantía legal',
    'Los mates y las bombillas nuevos tienen 6 meses de garantía legal por defectos desde que los recibís (Ley 24.240). Si aparece una falla, lo reparamos; si la reparación no queda bien, podés elegir el cambio por otro igual, la devolución de lo que pagaste o una rebaja del precio. El traslado corre por nuestra cuenta. Si la yerba llega abierta, vencida o en mal estado, te la cambiamos o te devolvemos lo que pagaste.',

    '## Cambios',
    'Además de lo que manda la ley, podés cambiar un producto dentro de los 30 días corridos de recibido, sin uso y en su estado original, al precio que pagaste. Los cambios no limitan ni reemplazan la garantía legal ni tu derecho de arrepentimiento. El detalle está en [Cambios, devoluciones y arrepentimiento](/devoluciones).',

    '## Reseñas',
    'Podés dejar una reseña de cualquier producto. Antes de publicarla la revisamos: no publicamos insultos, datos personales de otras personas ni contenido que no tenga que ver con el producto. Nunca rechazamos, ocultamos ni sancionamos una reseña por ser negativa. Si querés que borremos una reseña tuya, escribinos a {{email}}.',

    '## Propiedad intelectual',
    'Los textos, las fotos, el diseño y la marca Galpón Mates son de sus titulares y no se pueden usar sin permiso. Las marcas de terceros que nombramos, como Canarias, Mercado Pago, Visa, Mastercard y American Express, son de sus respectivos dueños.',

    '## Responsabilidad',
    'Respondemos por los productos que vendemos y por los daños que te cause su compra, en los términos de la Ley 24.240 y del Código Civil y Comercial. Nada de lo que dicen estos términos limita esa responsabilidad ni tus derechos como consumidor.',

    '## Datos personales',
    'Cómo usamos tus datos lo explica la [Política de privacidad](/privacidad), y lo que guarda la tienda en tu navegador, la [Política de cookies](/cookies).',

    '## Consultas y reclamos',
    'Para cualquier consulta o reclamo escribinos a {{email}} o usá el [formulario de contacto](/contacto). También podés reclamar ante Defensa del Consumidor de la Ciudad de Buenos Aires, ante la Ventanilla Federal Única de la Nación (los dos enlaces están al pie de esta página) o ante la autoridad de defensa del consumidor de tu domicilio.',

    '## Ley aplicable y jurisdicción',
    'Estos términos se rigen por las leyes de la República Argentina. Si tenés un reclamo, podés hacerlo ante los tribunales de tu domicilio o del lugar donde recibiste el producto.',

    '## Cambios en estos términos',
    'Si cambiamos estos términos, publicamos la versión nueva en esta página con su fecha de actualización, que ves arriba. Los cambios valen solo para las compras que se hagan desde esa fecha: cada compra se rige por los términos vigentes cuando la confirmaste.',
  ].join('\n\n'),
}
