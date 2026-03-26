-- Backfill Tenant.minutesPurchased for tenants with invoices.
-- Previously minutesPurchased was incremented by full invoice minutesTotal (users×months×perUser);
-- it must store the monthly pool: sum over invoices of (minutesTotal / months).

UPDATE `Tenant` t
INNER JOIN (
  SELECT `tenantId`, SUM(`minutesTotal` DIV `months`) AS `monthlySum`
  FROM `TenantInvoice`
  GROUP BY `tenantId`
) inv ON inv.`tenantId` = t.`id`
SET t.`minutesPurchased` = inv.`monthlySum`;
