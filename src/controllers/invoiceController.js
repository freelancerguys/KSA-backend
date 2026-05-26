import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { Invoice } from '../models/Invoice.js';
import { regenerateInvoicePdf } from '../services/invoiceService.js';

export const downloadInvoiceById = asyncHandler(async (req, res) => {
  const invoiceId = req.params.invoiceId || req.params.id;
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw new ApiError(404, 'Invoice not found');

  if (req.user.role === 'student') {
    if (String(invoice.student) !== String(req.student._id)) {
      throw new ApiError(403, 'Not authorized');
    }
  }

  const regenerated = await regenerateInvoicePdf(invoice._id);
  if (!regenerated?.filepath) {
    throw new ApiError(404, 'Invoice file not found');
  }

  const downloadName =
    regenerated.downloadFilename ||
    invoice.downloadFilename ||
    `${invoice.invoiceNumber}.pdf`;

  res.download(regenerated.filepath, downloadName);
});
