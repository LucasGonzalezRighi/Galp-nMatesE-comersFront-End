/**
 * Cuenta de cliente (spec 9.1 y 9.7): ingreso, registro y recuperación de la contraseña, el área
 * del cliente (resumen y datos, pedidos con su detalle y libreta de direcciones), el acceso del
 * encabezado y la sesión (`useSession`). Las escrituras van con el token anti-CSRF de la sesión
 * (`withCsrf`); el cliente de la API del navegador lo lee con `readCsrfToken`.
 *
 * Las páginas protegidas leen sus datos en el servidor con `getServerApiForRequest` y
 * `requireAccountData` (sin sesión → ingresar; pedido ajeno → 404).
 *
 * @packageDocumentation
 */
export type { AccountOverviewProps } from './AccountOverview'
export type { AccountLayoutProps } from './AccountShells'
export type { AddressBookProps } from './AddressBook'
export type { OrderDetailProps } from './OrderDetail'
export type { OrdersListProps } from './OrdersList'
export type { Session, SessionStatus } from './use-session'
export { requireAccountData } from './account-guard'
export { AccountButton } from './AccountButton'
export { AccountOverview } from './AccountOverview'
export {
  AccountLayout,
  AccountSkeleton,
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from './AccountShells'
export { AddressBook } from './AddressBook'
export { readCsrfToken, resetAccountState, withCsrf } from './csrf'
export { OrderDetail, OrderNotFound } from './OrderDetail'
export { OrdersList } from './OrdersList'
export { loginPath, safeReturnPath } from './return-path'
export { useSession } from './use-session'
