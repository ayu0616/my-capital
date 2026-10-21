import { createServerFn } from '@tanstack/react-start'
import {
  fetchAssetsData,
  fetchDashboardData,
  fetchGearData,
  fetchSelfInvestmentData,
  fetchSettingsData,
  fetchStockGoalsData,
} from './db.server'
import { isAuthRequired } from './auth.server'

/**
 * Client-safe server function definitions. Keeping this module free of
 * module-level database imports ensures TanStack Start can strip the
 * handlers — and their server-only imports — from the client bundle.
 */

export const getDashboardData = createServerFn({ method: 'GET' }).handler(
  async () => fetchDashboardData(),
)

export const getAssetsData = createServerFn({ method: 'GET' }).handler(
  async () => fetchAssetsData(),
)

export const getGearData = createServerFn({ method: 'GET' }).handler(async () =>
  fetchGearData(),
)

export const getSelfInvestmentData = createServerFn({ method: 'GET' }).handler(
  async () => fetchSelfInvestmentData(),
)

export const getStockGoalsData = createServerFn({ method: 'GET' }).handler(
  async () => fetchStockGoalsData(),
)

export const getSettingsData = createServerFn({ method: 'GET' }).handler(
  async () => ({
    ...(await fetchSettingsData()),
    authRequired: isAuthRequired(),
  }),
)
