import type { LegalContent } from '../../../generated/schema'

/**
 * Cambios, devoluciones y arrepentimiento: texto de fábrica de la tienda (esquema b.4 del informe
 * de leyes), con los tres caminos separados.
 * Cuerpo en el formato de los documentos legales (secciones con `## `, listas con `- ` y enlaces
 * `[texto](destino)`) y con los datos del vendedor como marcadores `{{clave}}` que resuelve la tienda.
 */
export const LEGAL_RETURNS: LegalContent = {
  title: 'Cambios, devoluciones y arrepentimiento',
  updatedAt: '2026-11-09',
  body: [
    'Acá te contamos qué podés hacer si te arrepentís de una compra, si un producto tiene una falla o si lo querés cambiar.',

    '## Tres caminos distintos',
    [
      '- Arrepentimiento: por ley, podés deshacer la compra sin dar explicaciones.',
      '- Garantía legal: por ley, si un producto tiene un defecto.',
      '- Cambios: los ofrecemos nosotros, además de lo que manda la ley.',
    ].join('\n'),
    'Son independientes: usar uno no te quita los otros, y nuestra política de cambios no limita la garantía legal ni tu derecho de arrepentimiento.',

    '## Arrepentimiento',
    [
      '- Plazo: 10 días corridos desde que recibís el producto. Si el último día es inhábil, el plazo pasa al día hábil siguiente.',
      '- Cómo: con el [Botón de arrepentimiento](/arrepentimiento) o por mail a {{email}}. No hace falta tener una cuenta: alcanza con tu nombre y el email que usaste en la compra, para que podamos confirmar que la compra es tuya.',
      '- Código del trámite: apenas mandás la solicitud con el botón, te mostramos un código que identifica tu trámite, y también te lo mandamos por mail.',
      '- Devolución del producto: te escribimos para coordinar cómo nos lo hacés llegar. Es sin costo: el envío de vuelta lo pagamos nosotros.',
      '- Estado del producto: devolvelo en el estado en que lo recibiste.',
      '- Excepciones: solo las que fija la ley, por ejemplo un paquete de yerba que ya abriste.',
      '- Reembolso: te devolvemos todo lo que pagaste, envío incluido, por el mismo medio de pago y sin demoras.',
    ].join('\n'),

    '## Garantía legal',
    'Los mates y las bombillas nuevos tienen 6 meses de garantía legal por defectos, desde que los recibís (Ley 24.240).',
    [
      '- Si aparece una falla, escribinos a {{email}} con tu número de pedido y una foto o una descripción del problema.',
      '- Lo reparamos; si la reparación no queda bien, podés elegir el cambio por otro igual, la devolución de lo que pagaste o una rebaja del precio.',
      '- El traslado del producto corre por nuestra cuenta.',
    ].join('\n'),
    'Si un producto llega dañado, avisanos apenas lo recibas, con fotos del producto y del embalaje, así lo resolvemos rápido. Si nos avisás más tarde, la garantía legal sigue valiendo igual.',
    'Si la yerba llega abierta, vencida o en mal estado, te la cambiamos o te devolvemos lo que pagaste.',

    '## Cambios',
    'Podés cambiar un producto dentro de los 30 días corridos de recibido, sin uso y en su estado original. Te respetamos el precio que pagaste. Escribinos a {{email}} con tu número de pedido y coordinamos.',

    '## Contacto y reclamos',
    'Para cualquiera de estos trámites escribinos a {{email}} o usá el [formulario de contacto](/contacto). Te atiende {{area_atencion}}, {{horario_atencion}}. Si no quedás conforme, podés reclamar ante Defensa del Consumidor con los enlaces que están al pie de esta página. Las condiciones generales de compra están en los [Términos y condiciones](/terminos).',
  ].join('\n\n'),
}
