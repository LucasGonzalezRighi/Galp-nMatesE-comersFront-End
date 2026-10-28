# `components/ui` — kit de interfaz del admin

Componentes compartidos del dashboard. El admin no tiene un diseño exportado: las reglas de
interfaz del plan de P4 (tema oscuro de `@galpon/design-tokens`, medidas, tipografía, estados
obligatorios) **son** el diseño, y estos componentes las aplican. Las features no arman campos,
botones ni estados propios: usan los de acá (y `src/components/media` para subir fotos).

## Reglas de uso

- **Solo tokens.** Ni hex ni `rgb()` en los componentes: `accent` (cobre) para la acción
  principal, el foco y lo en curso; `accent-2` (verde yerba) para lo que está bien; `danger`
  para errores y acciones destructivas; `neutral-400` para textos secundarios.
- **`className` solo suma disposición** (ancho, márgenes, columnas). `cx` no resuelve conflictos
  entre utilidades de Tailwind: no se pisan colores ni medidas desde afuera.
- **Textos en `*.copy.ts`**: `ui.copy.ts` (este kit) y `overlay.copy.ts` (kit B). Las features
  pasan sus propios textos por props.
- **Formularios con React Hook Form**: `TextInput`, `Textarea`, `Select` y `Checkbox` reciben
  `register` (entregan el ref al elemento nativo); `MoneyInput`, `NumberInput` y `Switch` van con
  un `Controller`. Todo campo con label externo va dentro de `Field`.
- **Estados obligatorios** de cada tabla y formulario: cargando = `Skeleton` con la forma del
  contenido; vacío = `EmptyState` con una acción; error = `ErrorState` con el mensaje de la
  feature y "Reintentar"; guardando = botón deshabilitado con `Spinner` y "Guardando…"; cambios
  sin guardar = `FormActions` + `UnsavedChangesGuard`.
- **Validación**: los componentes lanzan `RangeError` en español ante props imposibles (label o
  título vacío, opciones repetidas, un monto con decimales).
- **`react-refresh`**: cada `.tsx` exporta solo componentes (y sus tipos); las funciones y
  constantes van en un `.ts` aparte (`button-class.ts`, `input-class.ts`, `numeric-text.ts`,
  `toast.ts`, `image-accept.ts`).

## Base (pre-wire)

- `cx(...clases)` (`cx.ts`): une clases descartando las vacías.
- `buttonClass(variant, size)` (`button-class.ts`): clases de un botón (`primary`, `secondary`,
  `ghost`, `danger`, `icon`; `md` de 36 px o `sm` de 32 px), para dar estilo de botón a un `Link`.
- `Button`: botón con `variant`, `size` e `isLoading` (spinner, deshabilitado y `aria-busy`);
  `type="button"` por defecto. Los de ícono necesitan `aria-label`.
- `Spinner`: indicador circular que hereda el color; con `label` se anuncia (`role="status"`),
  sin `label` es decorativo. No gira con `motion-reduce`.

## Kit A — formularios, estados y estructura de pantalla

| Componente         | Para qué                                                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Field`            | Label de 12 px al 70 %, ayuda (`neutral-400`) y error (`text-danger`, id `{id}-error`). Entrega al control `{ id, aria-invalid, aria-describedby, aria-required }`; `required` agrega " *" oculto. |
| `TextInput`        | `<input>` de texto con las medidas de `.input` (alto mínimo 36, fondo `surface`, borde `divider`, foco `accent`, `aria-invalid` en `danger-border`).                                               |
| `Textarea`         | Texto de varias líneas (alto mínimo 90). Con `maxLength`, contador "{n} / {max}" que se anuncia solo desde el 90 %.                                                                                |
| `Select`           | `<select>` nativo con `options`; `placeholder` es la primera opción, deshabilitada.                                                                                                                |
| `Checkbox`         | Casilla nativa con su label; tocar el texto la marca.                                                                                                                                              |
| `Switch`           | Interruptor de Radix (`role="switch"`) con label que se puede tocar.                                                                                                                               |
| `SegmentedControl` | Pocas opciones excluyentes (`.seg`, 13 px): grupo de radios dentro de un `fieldset`.                                                                                                               |
| `MoneyInput`       | Monto en pesos enteros (`value: number \| null`): acepta "39999", "39.999" y "$39.999"; al salir muestra `formatPesos`; vacío → `null`.                                                            |
| `NumberInput`      | Entero, o con `allowDecimal` coma decimal ("10,5" → 10.5); vacío → `null`.                                                                                                                         |
| `Badge`            | Tag de estado de 11 px y radio 6 px: `accent`, `success` (`accent-2`), `neutral`, `danger` u `outline` (terminado sin éxito).                                                                      |
| `Skeleton`         | Bloque `neutral-900` que late mientras carga (sin pulso con `motion-reduce`); decorativo.                                                                                                          |
| `EmptyState`       | Vacío de una tabla o lista: título, descripción y una acción.                                                                                                                                      |
| `ErrorState`       | Error con `role="alert"`, el mensaje de la feature y "Reintentar".                                                                                                                                 |
| `PageHeader`       | `h1` (`text-h3`, `tabIndex={-1}`), descripción, acciones (a la derecha desde 640 px) y `back` con `CaretLeft`; pone `document.title` = "{título} · Galpón Admin".                                  |
| `Section`          | Tarjeta `surface` con título `h2` (`text-h4`), descripción y acciones; es una región con nombre.                                                                                                   |
| `DescriptionList`  | `dl` de término y detalle, en dos columnas desde 640 px.                                                                                                                                           |
| `FormActions`      | Barra pegada abajo del formulario: "Cambios sin guardar", "Descartar" y el botón que envía ("Guardando…" con spinner).                                                                             |

```tsx
<form onSubmit={handleSubmit(save)}>
  <Section title="Datos">
    <Field label="Nombre" error={errors.name?.message} required>
      {(control) => <TextInput {...control} {...register('name')} />}
    </Field>
    <Controller
      control={formControl}
      name="priceArs"
      render={({ field }) => (
        <Field label="Precio" error={errors.priceArs?.message}>
          {(control) => <MoneyInput {...control} {...field} />}
        </Field>
      )}
    />
  </Section>
  <FormActions isDirty={isDirty} isSubmitting={mutation.isPending} onDiscard={() => reset()} />
</form>
```

## Kit B — tablas, diálogos, avisos, orden e imágenes (Task 5)

- `Dialog`: diálogo de Radix con título, descripción, cuerpo con scroll y pie; ancho `sm`, `md` o `lg`. "Cerrar" se ve arriba a la derecha pero va último en el DOM, así el foco inicial cae en el primer campo del cuerpo.
- `ConfirmDialog`: confirmación antes de una acción irreversible; el foco arranca en "Cancelar" y `isPending` deshabilita los dos botones.
- `ActionsMenu`: menú de acciones de Radix detrás de un botón ícono (`DotsThree`).
- `Tabs`: pestañas controladas de Radix, con un contador opcional por pestaña; el panel siempre está (vacío sin `children`), porque `aria-controls` lo nombra.
- `DataTable`: tabla de TanStack Table con orden manual, `caption` oculta, columnas que se esconden por ancho y estados de carga, error y vacío. El contenedor con scroll horizontal es una región con el nombre de `caption` que toma el foco (para desplazarla con el teclado).
- `Pagination`: "Mostrando {desde}–{hasta} de {total}" con "Anterior" y "Siguiente"; no aparece con una sola página.
- `Toaster` y `toast` (`toast.ts`): avisos de éxito (5 s) y de error (8 s, `role="alert"`), que se pueden lanzar fuera de React. El visor lleva `pointer-events-auto` para que los avisos se puedan cerrar con un `Dialog` modal abierto.
- `UnsavedChangesGuard`: frena la navegación con cambios sin guardar y pregunta "¿Salir sin guardar?".
- `SortableList`: lista reordenable con arrastre (`motion`) o con botones, anunciada por `aria-live`. El orden nuevo se sigue mostrando hasta que cambien las claves de `items`, así el padre puede actualizarlas de forma asíncrona (`onMutate` de React Query) sin que la lista vuelva un cuadro al orden viejo.
- `ImageDropzone`: área para soltar o elegir fotos (JPEG, PNG o WebP, `IMAGE_ACCEPT` de `image-accept.ts`). El `input type="file"` queda oculto para el lector; el control con nombre es el botón "Elegir archivos".
- `ImageTile`: miniatura 4:5 de una foto subiendo, con error o lista, con sus acciones. En una lista de varias fotos, pasá `removeLabel` para que cada botón de quitar tenga su nombre ("Quitar la foto 3"); por omisión es "Quitar foto".
- `SingleImageField`: campo de una sola foto (`ImageTile` + "Cambiar foto", o `ImageDropzone`). `upload` es un `SingleImageUploadState` (vista previa, estado, progreso y error, sacados de `UploadItem`); no confundir con `SingleImageUpload`, lo que devuelve `useSingleImageUpload` de `components/media`.
