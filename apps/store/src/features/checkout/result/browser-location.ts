/**
 * Navega con una carga completa de la página, como la vuelta desde Mercado Pago (aparte para
 * poder reemplazarla en los tests).
 *
 * @param url - Ruta de la tienda.
 */
export function assignLocation(url: string): void {
  window.location.assign(url)
}
