import localFont from 'next/font/local'

/**
 * Inter, la tipografía del diseño. Sale de los archivos de `@fontsource-variable/inter` (con
 * `next/font/local`), así el build no depende de la red. Expone la variable `--font-inter`, que
 * usa `--font-sans` en los tokens de diseño.
 */
export const inter = localFont({
  src: [
    {
      path: '../../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
      style: 'normal',
    },
    {
      path: '../../../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-italic.woff2',
      style: 'italic',
    },
  ],
  weight: '100 900',
  variable: '--font-inter',
  display: 'swap',
})
