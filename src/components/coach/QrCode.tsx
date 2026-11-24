import QRCode from 'qrcode';
import React, { useMemo } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** QR kód z textu (odkaz pro připojení k trenérovi). */
export function QrCode({
  value,
  size = 200,
  color = '#000',
  bg = '#FFF',
}: {
  value: string;
  size?: number;
  color?: string;
  bg?: string;
}) {
  const { d, n } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    let path = '';
    for (let y = 0; y < count; y++) for (let x = 0; x < count; x++) if (qr.modules.get(y, x)) path += `M${x} ${y}h1v1h-1z`;
    return { d: path, n: count };
  }, [value]);
  const pad = 2;
  return (
    <Svg width={size} height={size} viewBox={`${-pad} ${-pad} ${n + pad * 2} ${n + pad * 2}`}>
      <Rect x={-pad} y={-pad} width={n + pad * 2} height={n + pad * 2} fill={bg} />
      <Path d={d} fill={color} />
    </Svg>
  );
}
