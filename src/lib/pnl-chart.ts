export type PnlChartPoint = { at: string; cumulativePnlUsdc: number };

export type PnlChartGeometry = {
  coordinates: { x: number; y: number }[];
  linePath: string;
  areaPath: string;
  zeroY: number;
};

export function buildPnlChartGeometry(points: PnlChartPoint[], width: number, height: number, padding = 5): PnlChartGeometry {
  if (!points.length || width <= padding * 2 || height <= padding * 2) {
    return { coordinates: [], linePath: '', areaPath: '', zeroY: height / 2 };
  }
  const values = points.map((point) => point.cumulativePnlUsdc);
  let minimum = Math.min(0, ...values);
  let maximum = Math.max(0, ...values);
  if (minimum === maximum) {
    minimum = -1;
    maximum = 1;
  }
  const span = maximum - minimum;
  const firstTime = new Date(points[0]!.at).getTime();
  const lastTime = new Date(points.at(-1)!.at).getTime();
  const timeSpan = lastTime - firstTime;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const yFor = (value: number) => padding + ((maximum - value) / span) * innerHeight;
  const coordinates = points.map((point, index) => ({
    x: points.length === 1 || timeSpan <= 0
      ? width / 2
      : padding + ((new Date(point.at).getTime() - firstTime) / timeSpan) * innerWidth,
    y: yFor(point.cumulativePnlUsdc),
  }));
  const linePath = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const first = coordinates[0]!;
  const last = coordinates.at(-1)!;
  const zeroY = yFor(0);
  const areaPath = coordinates.length > 1 ? `${linePath} L ${last.x.toFixed(2)} ${zeroY.toFixed(2)} L ${first.x.toFixed(2)} ${zeroY.toFixed(2)} Z` : '';
  return { coordinates, linePath, areaPath, zeroY };
}

export function nearestPnlPointIndex(coordinates: PnlChartGeometry['coordinates'], x: number): number {
  if (!coordinates.length) return -1;
  let nearest = 0;
  let distance = Math.abs(coordinates[0]!.x - x);
  for (let index = 1; index < coordinates.length; index += 1) {
    const candidate = Math.abs(coordinates[index]!.x - x);
    if (candidate < distance) {
      nearest = index;
      distance = candidate;
    }
  }
  return nearest;
}
