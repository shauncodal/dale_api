import { Request, Response } from 'express';
import { adminHasPermission, type AdminAuthPayload } from '../middleware/rbac';
import * as tenantService from '../services/tenantService';
import * as invoiceRepo from '../repositories/invoiceRepository';
import {
  createTenantBodySchema,
  createTenantInvoiceBodySchema,
  patchTenantBodySchema,
  patchUserBodySchema,
  tenantUsersQuerySchema,
  tenantsListQuerySchema,
} from '../lib/schemas';

/** Hide unused minutes only for true tenant-scoped admins (linked to one tenant, cannot list all). */
function shouldOmitUnusedMinutes(auth: AdminAuthPayload | undefined): boolean {
  if (!auth?.tenantId) return false;
  if (adminHasPermission(auth.permissions, 'tenants:list')) return false;
  return true;
}

function omitUnusedMinutesForTenantScoped<T extends { unusedMinutes?: number }>(
  row: T,
  auth: AdminAuthPayload | undefined
): Omit<T, 'unusedMinutes'> | T {
  if (!shouldOmitUnusedMinutes(auth)) return row;
  const { unusedMinutes: _unused, ...rest } = row;
  return rest;
}

export async function resendTenantInvite(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const tenant = await tenantService.getTenantById(id);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  const result = await tenantService.resendTenantInvite(id);
  const adminEmail = (req as Request & { auth?: { email?: string } }).auth?.email;
  console.log('[invite] Resend request:', { type: 'tenant_invite', tenantId: id, adminEmail, sent: result.sent, error: result.error });
  res.json({ sent: result.sent, error: result.error });
}

export async function listTenants(req: Request, res: Response): Promise<void> {
  const parsed = tenantsListQuerySchema.safeParse(req.query);
  const search = parsed.success ? parsed.data.search : '';
  const plan = parsed.success ? parsed.data.plan : undefined;
  const auth = (req as Request & { auth?: AdminAuthPayload }).auth;
  const data = await tenantService.listTenants(search, plan);
  res.json(data.map((t) => omitUnusedMinutesForTenantScoped(t, auth)));
}

export async function getTenant(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const auth = (req as Request & { auth?: AdminAuthPayload }).auth;
  const data = await tenantService.getTenantById(id);
  if (!data) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  res.json(omitUnusedMinutesForTenantScoped(data, auth));
}

export async function createTenant(req: Request, res: Response): Promise<void> {
  const parsed = createTenantBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const result = await tenantService.createTenant({
    name: parsed.data.name,
    domain: parsed.data.domain,
    contactEmail: parsed.data.contactEmail,
    plan: parsed.data.plan,
    status: parsed.data.status,
    minutesPerUserPerMonth: parsed.data.minutesPerUserPerMonth,
    pricePerUserPerMonthDollars: parsed.data.pricePerUserPerMonthDollars ?? undefined,
    pricePer30MinDollars: parsed.data.pricePer30MinDollars ?? undefined,
    minutesPurchased: parsed.data.minutesPurchased ?? 0,
  });
  if (!result.tenant) {
    res.status(500).json({ error: 'Failed to create tenant' });
    return;
  }
  const auth = (req as Request & { auth?: AdminAuthPayload }).auth;
  const body: Record<string, unknown> = { ...omitUnusedMinutesForTenantScoped(result.tenant, auth) };
  if (result.inviteEmailSent !== undefined) body.inviteEmailSent = result.inviteEmailSent;
  if (result.inviteError !== undefined) body.inviteError = result.inviteError;
  res.status(201).json(body);
}

export async function patchTenant(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const parsed = patchTenantBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const existing = await tenantService.getTenantById(id);
  if (!existing) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  const updateData: Parameters<typeof tenantService.updateTenant>[1] = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.domain !== undefined) updateData.domain = parsed.data.domain;
  if (parsed.data.contactEmail !== undefined) updateData.contactEmail = parsed.data.contactEmail;
  if (parsed.data.plan !== undefined) updateData.plan = parsed.data.plan;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.minutesPerUserPerMonth !== undefined) updateData.minutesPerUserPerMonth = parsed.data.minutesPerUserPerMonth;
  if (parsed.data.pricePerUserPerMonthDollars !== undefined) updateData.pricePerUserPerMonthDollars = parsed.data.pricePerUserPerMonthDollars;
  if (parsed.data.pricePer30MinDollars !== undefined) updateData.pricePer30MinDollars = parsed.data.pricePer30MinDollars;
  if (parsed.data.minutesPurchased !== undefined) updateData.minutesPurchased = parsed.data.minutesPurchased;
  if (parsed.data.addMinutes !== undefined && parsed.data.addMinutes > 0) updateData.addMinutes = parsed.data.addMinutes;
  const auth = (req as Request & { auth?: AdminAuthPayload }).auth;
  const tenant = await tenantService.updateTenant(id, updateData);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  res.json(omitUnusedMinutesForTenantScoped(tenant, auth));
}

export async function getTenantUsers(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.id;
  const parsed = tenantUsersQuerySchema.safeParse(req.query);
  const statusFilter = parsed.success ? parsed.data.status : 'all';
  const data = await tenantService.getTenantUsers(tenantId, statusFilter);
  res.json(data);
}

export async function listTenantInvoices(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.id;
  const tenant = await tenantService.getTenantById(tenantId);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  const data = await invoiceRepo.listInvoicesByTenant(tenantId);
  res.json(data);
}

export async function createTenantInvoice(req: Request, res: Response): Promise<void> {
  const tenantId = req.params.id;
  const parsed = createTenantInvoiceBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const tenant = await tenantService.getTenantById(tenantId);
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return;
  }
  const invoice = await invoiceRepo.createInvoice(tenantId, parsed.data);
  res.status(201).json(invoice);
}

function assertUserTenantScope(req: Request, userTenantId: string): void {
  const auth = (req as Request & { auth?: { tenantId?: string } }).auth;
  if (auth?.tenantId && userTenantId !== auth.tenantId) {
    throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  }
}

export async function patchUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const parsed = patchUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }
  const existing = await tenantService.getUserById(id);
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  try {
    assertUserTenantScope(req, existing.tenantId);
  } catch (e) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const user = await tenantService.updateUser(id, parsed.data);
  res.json(user);
}

export async function resendInvite(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const existing = await tenantService.getUserById(id);
  if (!existing) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  try {
    assertUserTenantScope(req, existing.tenantId);
  } catch {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const result = await tenantService.resendInvite(id);
  const adminEmail = (req as Request & { auth?: { email?: string } }).auth?.email;
  console.log('[invite] Resend request:', { type: 'user_invite', userId: id, adminEmail, sent: result.sent, error: result.error });
  if (result.error === 'User not found') {
    res.status(404).json({ error: result.error });
    return;
  }
  res.json({ sent: result.sent, error: result.error });
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  const user = await tenantService.getUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  try {
    assertUserTenantScope(req, user.tenantId);
  } catch {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  res.json(user);
}

export async function getUserSessions(req: Request, res: Response): Promise<void> {
  const userId = req.params.id;
  const user = await tenantService.getUserById(userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  try {
    assertUserTenantScope(req, user.tenantId);
  } catch {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const data = await tenantService.getUserSessions(userId);
  res.json(data);
}
