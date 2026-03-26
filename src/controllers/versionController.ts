import { readFileSync } from 'fs';
import { join } from 'path';
import { Request, Response } from 'express';
import { config } from '../lib/config';

function readPackageVersion(): string {
  try {
    const pkgPath = join(process.cwd(), 'package.json');
    const raw = readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function getVersion(_req: Request, res: Response): void {
  const apiVersion = config.apiVersion || readPackageVersion();
  res.status(200).json({
    apiVersion,
    consentDocumentVersion: config.consentDocumentVersion,
    gitSha: config.gitSha || null,
    gitBranch: config.gitBranch || null,
    commitMessage: config.gitCommitMessage || null,
    buildDescription: config.buildDescription || null,
  });
}
