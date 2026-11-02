/** Textos de la subida de fotos del dashboard (validación, errores y ayuda). */
export const MEDIA_COPY = {
  /** El archivo no es JPG, PNG ni WebP. */
  type: 'Formato no admitido: usá JPG, PNG o WebP.',
  /** El archivo pasa de 10 MB. */
  size: 'La foto pesa más de 10 MB.',
  /** El lado menor no llega a 800 px. */
  dimensions: (width: number, height: number): string =>
    `La foto tiene que medir al menos 800 px del lado menor (esta mide ${String(width)} × ${String(height)} px).`,
  /** El navegador no pudo abrir la foto. */
  unreadable: 'No pudimos leer la foto.',
  /** La subida se cortó sin respuesta. */
  network: 'No se pudo subir la foto: revisá la conexión.',
  /** El servicio de fotos respondió con un error. */
  rejected: (status: number): string =>
    `El servicio de fotos rechazó la subida (${String(status)}).`,
  /** La subida pasó el tiempo máximo. */
  timeout: 'La subida tardó demasiado.',
  /** Primer intento de un archivo `error-*` en el modo de prueba. */
  simulated: 'Falló la subida simulada (el archivo empieza con error-). Reintentá.',
  /** Venció la sesión mientras se subía. */
  sessionExpired: 'Tu sesión venció: ingresá de nuevo y reintentá.',
  /** Ya no queda cupo para otra foto. */
  quota: (max: number): string => `Ya hay ${String(max)} fotos: quitá una para agregar otra.`,
  /** Ayuda que acompaña al área para elegir fotos. */
  hint: 'JPG, PNG o WebP, hasta 10 MB y al menos 800 px del lado menor.',
  /** Un archivo que no se agregó, con el motivo. */
  rejectedFile: (fileName: string, message: string): string => `${fileName}: ${message}`,
} as const
