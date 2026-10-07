import { Injectable, NotFoundException } from '@nestjs/common';
import type { Report, ReportStatus } from '@qrguard/types';
import { AlertsService } from '../alerts/alerts.service';
import type { AuthUser } from '../auth/auth.types';
import type { Report as ReportRow } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RiskService } from '../risk/risk.service';
import { ShopsService } from '../shops/shops.service';
import { CreateReportDto } from './dto/report.dto';

export function toReport(row: ReportRow & { shop?: { name: string } | null }): Report {
  return {
    id: row.id,
    shopId: row.shopId,
    shopName: row.shop?.name ?? null,
    scanId: row.scanId,
    merchantId: row.merchantId,
    description: row.description,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shops: ShopsService,
    private readonly alerts: AlertsService,
    private readonly risk: RiskService,
  ) {}

  /** A customer reports a suspicious QR code. The shop owner and admins get an alert. */
  async create(dto: CreateReportDto, user?: AuthUser): Promise<Report> {
    // A report from the scan result screen is linked to that scan (and its shop).
    const scan = dto.scanId
      ? await this.prisma.scanCheck.findUnique({ where: { id: dto.scanId } })
      : null;
    if (dto.scanId && !scan) throw new NotFoundException('Scan not found');
    const shopId = dto.shopId ?? scan?.shopId ?? null;
    if (shopId) await this.shops.findById(shopId);
    const reporter = user
      ? await this.prisma.user.findUnique({ where: { id: user.id }, select: { id: true } })
      : null;

    const row = await this.prisma.report.create({
      data: {
        shopId,
        scanId: scan?.id ?? null,
        merchantId: scan?.merchantId ?? null,
        reporterId: reporter?.id ?? null,
        description: dto.description,
      },
      include: { shop: { select: { name: true } } },
    });

    if (shopId) {
      // Creating the alert also updates the shop's risk score.
      await this.alerts.create({
        shopId,
        type: 'CUSTOMER_REPORT',
        severity: 'medium',
        message: `A customer reported a problem: "${dto.description}"`,
        data: { reportId: row.id, merchantId: row.merchantId },
      });
    }
    return toReport(row);
  }

  async list(opts: { status?: ReportStatus; limit: number }): Promise<Report[]> {
    const rows = await this.prisma.report.findMany({
      where: opts.status ? { status: opts.status } : {},
      include: { shop: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: opts.limit,
    });
    return rows.map(toReport);
  }

  /** Bank team updates a report. Closed reports stop counting towards the shop's risk. */
  async setStatus(id: string, status: ReportStatus): Promise<Report> {
    const exists = await this.prisma.report.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Report not found');
    const row = await this.prisma.report.update({
      where: { id },
      data: { status },
      include: { shop: { select: { name: true } } },
    });
    if (row.shopId) await this.risk.recompute(row.shopId);
    return toReport(row);
  }
}
