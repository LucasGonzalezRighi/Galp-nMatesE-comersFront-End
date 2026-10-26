import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { FeaturedReview, HomeContent, ProductSummary } from '@galpon/api-client'
import { getHomeContent, listAllProducts, listFeaturedReviews } from '@galpon/api-client'
import type { HomeData } from './home-data'
import { getServerApi } from '../../lib/api.server'
import { getCategories } from '../../lib/data/catalog'
import { getPublicSettings } from '../../lib/data/settings'
import { buildHomeData } from './home-data'

/**
 * Textos editables del inicio. Cacheada por horas y con la etiqueta `content:home`, que el
 * backend regenera con `POST /api/revalidate`.
 */
async function readHomeContent(): Promise<HomeContent> {
  'use cache'
  cacheLife('hours')
  cacheTag('content:home')
  return await getHomeContent(getServerApi())
}

/**
 * Todos los productos publicados, en el orden del listado. Cacheada por horas y con la etiqueta
 * `products`.
 */
async function readPublishedProducts(): Promise<ProductSummary[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('products')
  return await listAllProducts(getServerApi())
}

/**
 * Reseñas destacadas para el inicio. Cacheada por horas y con la etiqueta `reviews:featured`.
 */
async function readFeaturedReviews(): Promise<FeaturedReview[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('reviews:featured')
  return await listFeaturedReviews(getServerApi())
}

/**
 * Lee del servidor (con caché) todo lo que necesita el inicio y lo deja resuelto para las
 * secciones: líneas, destacados, reseñas, productos de la historia, cifras y descuento del kit.
 *
 * @throws {ApiError} Si la API falla.
 */
export async function getHomeData(): Promise<HomeData> {
  const [content, products, categories, settings, reviews] = await Promise.all([
    readHomeContent(),
    readPublishedProducts(),
    getCategories(),
    getPublicSettings(),
    readFeaturedReviews(),
  ])
  return buildHomeData({ content, products, categories, settings, reviews })
}
