import { FastifyReply, FastifyRequest } from 'fastify';
import { qrCodeService } from './qrcode.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';
import { UnauthorizedError } from '../../utils/errors.js';

export class QrCodeController {
  async getSaloonQr(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId } = request.params as { saloonId: string };
    const result = await qrCodeService.getSaloonQr(saloonId, request.user.id);
    return sendSuccess(reply, result);
  }

  async downloadSaloonQr(request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) throw new UnauthorizedError();
    const { saloonId } = request.params as { saloonId: string };
    const buffer = await qrCodeService.getSaloonQrBuffer(saloonId, request.user.id);

    reply.header('Content-Type', 'image/png');
    reply.header(
      'Content-Disposition',
      `attachment; filename="saloon-${saloonId}-qr.png"`
    );
    return reply.send(buffer);
  }
}

export const qrCodeController = new QrCodeController();
