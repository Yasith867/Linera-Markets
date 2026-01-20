import { z } from 'zod';
import { insertMarketSchema, insertPositionSchema, markets, marketOptions, positions, users } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    connect: {
      method: 'POST' as const,
      path: '/api/auth/connect',
      input: z.object({ address: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      }
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me/:address',
      responses: {
        200: z.custom<typeof users.$inferSelect | null>(),
      }
    }
  },
  markets: {
    list: {
      method: 'GET' as const,
      path: '/api/markets',
      responses: {
        200: z.array(z.any()), // Array of MarketWithDetail
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/markets/:id',
      responses: {
        200: z.any(), // MarketWithDetail
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/markets/create',
      input: insertMarketSchema,
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    resolve: {
      method: 'POST' as const,
      path: '/api/markets/:id/resolve',
      input: z.object({ winningOptionId: z.number() }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
        400: errorSchemas.validation,
      },
    }
  },
  positions: {
    create: {
      method: 'POST' as const,
      path: '/api/positions',
      input: insertPositionSchema,
      responses: {
        201: z.custom<typeof positions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/positions/my/:address',
      responses: {
        200: z.array(z.any()),
      }
    },
    claim: {
      method: 'POST' as const,
      path: '/api/positions/:id/claim',
      responses: {
        200: z.object({ payout: z.string() }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
