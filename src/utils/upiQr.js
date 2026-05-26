import QRCode from 'qrcode';

export const buildUpiUri = ({ upiId, amount, payeeName, note }) => {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName || 'Kalyani Shooting Academy',
    am: String(amount),
    cu: 'INR',
  });
  if (note) params.set('tn', note);
  return `upi://pay?${params.toString()}`;
};

export const generateUpiQrDataUrl = async (options) => {
  const uri = buildUpiUri(options);
  const dataUrl = await QRCode.toDataURL(uri, {
    width: 320,
    margin: 2,
    color: { dark: '#111111', light: '#FFFFFF' },
  });
  return { uri, dataUrl };
};
