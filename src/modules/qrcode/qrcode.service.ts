import QRCode from 'qrcode';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { saloonService } from '../saloon/saloon.service.js';
import { NotFoundError } from '../../utils/errors.js';

export class QrCodeService {
  async getSaloonQr(saloonId: string, ownerId: string) {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const saloon = await prisma.saloon.findUnique({ where: { id: saloonId } });
    if (!saloon) throw new NotFoundError('Saloon not found');

    const bookingUrl = `${env.FRONTEND_URL}/saloon/${saloon.slug}`;

    const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });

    // Cache QR code in saloon record
    if (saloon.qrCodeUrl !== qrDataUrl) {
      await prisma.saloon.update({
        where: { id: saloonId },
        data: { qrCodeUrl: qrDataUrl },
      });
    }

    return {
      saloonId: saloon.id,
      name: saloon.name,
      slug: saloon.slug,
      bookingUrl,
      qrDataUrl,
    };
  }

  async getSaloonQrBuffer(saloonId: string, ownerId: string): Promise<Buffer> {
    await saloonService.verifyOwnership(saloonId, ownerId);
    const saloon = await prisma.saloon.findUnique({ where: { id: saloonId } });
    if (!saloon) throw new NotFoundError('Saloon not found');

    const bookingUrl = `${env.FRONTEND_URL}/saloon/${saloon.slug}`;

    return QRCode.toBuffer(bookingUrl, {
      width: 1024,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  }
}

export const qrCodeService = new QrCodeService();
