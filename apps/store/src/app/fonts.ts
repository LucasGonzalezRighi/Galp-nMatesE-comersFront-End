import localFont from 'next/font/local'

/**
 * Manrope, la tipografía del diseño. Sale de los archivos de `@fontsource-variable/manrope` (con
 * `next/font/local`), así el build no depende de la red. Expone la variable `--font-manrope`, que
 * usa `--font-sans` en los tokens de diseño. Manrope no tiene itálica: el navegador la simula.
 */
export const manrope = localFont({
  src: [
    {
      path: '../../../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
      style: 'normal',
    },
  ],
  weight: '200 800',
  variable: '--font-manrope',
  display: 'swap',
})
