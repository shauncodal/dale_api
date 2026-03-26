import { z } from 'zod';

export const loginBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(500),
});

export const tenantLoginBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(500),
  tenantDomain: z.string().min(1).max(255).optional(),
  tenantId: z.string().min(1).max(100).optional(),
}).refine((d) => d.tenantDomain ?? d.tenantId, { message: 'tenantDomain or tenantId required' });

export const liteLoginBodySchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(500),
}).strict();

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(500),
  newPassword: z.string().min(1).max(500),
  acceptedTerms: z.literal(true),
  consentVersion: z.string().min(1).max(100),
}).strict();

export const createTenantBodySchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().min(1).max(255),
  contactEmail: z.string().email().max(255),
  plan: z.enum(['Starter', 'Growth', 'Enterprise', 'Custom']),
  status: z.enum(['Trial', 'Active', 'Suspended']),
  minutesPerUserPerMonth: z.number().int().min(10).max(300),
  pricePerUserPerMonthDollars: z.number().min(0).optional().nullable(),
  pricePer30MinDollars: z.number().min(0).optional().nullable(),
  minutesPurchased: z.number().int().min(0).optional(),
});

export const createGroupBodySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  avatarIds: z.array(z.string().min(1).max(100)).optional().default([]),
}).strict();

export const patchGroupBodySchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  avatarIds: z.array(z.string().min(1).max(100)).optional(),
}).strict().partial();

export const patchTenantBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  domain: z.string().min(1).max(255).optional(),
  contactEmail: z.string().email().max(255).optional(),
  plan: z.enum(['Starter', 'Growth', 'Enterprise', 'Custom']).optional(),
  status: z.enum(['Trial', 'Active', 'Suspended']).optional(),
  minutesPerUserPerMonth: z.number().int().min(10).max(300).optional(),
  pricePerUserPerMonthDollars: z.number().min(0).optional().nullable(),
  pricePer30MinDollars: z.number().min(0).optional().nullable(),
  minutesPurchased: z.number().int().min(0).optional(),
  addMinutes: z.number().int().min(0).optional(),
}).strict().partial();

export const patchPlatformSettingsBodySchema = z.object({
  costPer30MinAvatarDollars: z.number().min(0).optional(),
  infrastructureCostDollars: z.number().min(0).optional(),
  costPerMinuteDollars: z.number().min(0).optional().nullable(),
}).strict().partial();

export const createTenantInvoiceBodySchema = z.object({
  users: z.number().int().min(1).max(10000),
  months: z.number().int().min(1).max(120),
  minutesPerMonthPerUser: z.number().int().min(1).max(9999),
  pricePerMonthPerUser: z.number().min(0),
}).strict();

export const overviewUsageTrendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).optional().default(6),
});

export const overviewMostActiveUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(5),
});

export const tenantsListQuerySchema = z.object({
  search: z.string().max(200).optional().default(''),
  plan: z.string().max(100).optional(),
});

export const tenantUsersQuerySchema = z.object({
  status: z.enum(['active', 'archived', 'all']).optional().default('all'),
});

export const patchAvatarBodySchema = z.object({
  name: z.string().max(255).optional(),
  title: z.string().max(255).optional(),
  speciality: z.string().max(255).optional(),
  description: z.string().optional(),
  style: z.string().max(100).optional(),
  rating: z.number().min(0).max(5).optional(),
  sessions: z.number().int().min(0).optional(),
  img: z.string().url().max(2000).optional().nullable(),
  tags: z.array(z.string().max(50)).optional(),
  creditRate: z.number().int().min(1).optional(),
}).strict().partial();

export const createAvatarBodySchema = z.object({
  name: z.string().min(1).max(255),
  title: z.string().min(1).max(255),
  speciality: z.string().max(255).optional(),
  description: z.string().optional(),
  style: z.string().max(100).optional(),
  rating: z.number().min(0).max(5).default(4.5),
  sessions: z.number().int().min(0).default(0),
  img: z.string().url().max(2000).optional(),
  tags: z.array(z.string().max(50)).default([]),
  creditRate: z.number().int().min(1).default(1),
  liveAvatarConfig: z.object({
    avatarId: z.string().min(1).max(100),
    contextId: z.string().max(100).optional(),
    voiceId: z.string().max(100).optional(),
  }).optional(),
}).strict();

export const patchLiveConfigBodySchema = z.object({
  avatarId: z.string().min(1).max(100),
  contextId: z.string().max(100).optional().nullable(),
  voiceId: z.string().max(100).optional().nullable(),
}).strict();

export const createUserBodySchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  role: z.string().min(1).max(100).default('User'),
  status: z.enum(['active', 'archived']).default('active'),
  minutesQuotaTotal: z.number().int().min(1).max(999).optional().nullable(),
}).strict();

export const patchUserBodySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  role: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'archived']).optional(),
  minutesQuotaTotal: z.number().int().min(1).max(999).optional().nullable(),
}).strict().partial();

export const csvUserRowSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  role: z.string().max(100).optional().default('User'),
});

export const createAdminUserBodySchema = z.object({
  email: z.string().email().max(255),
  roleId: z.string().min(1).max(100),
  tenantId: z.string().min(1).max(100).optional().nullable(),
}).strict();

export const patchAdminUserBodySchema = z.object({
  roleId: z.string().min(1).max(100).optional(),
  tenantId: z.string().min(1).max(100).optional().nullable(),
}).strict().partial();

export const createLiteSessionBodySchema = z.object({
  coachId: z.string().min(1).max(100),
  sessionName: z.string().min(1).max(255),
  durationSeconds: z.number().int().min(1).max(59940), // 1 sec to 999 min
  score: z.number().int().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
}).strict();
