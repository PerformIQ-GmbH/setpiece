import { useId, useState } from 'react';
import { PitchLines } from '@/components/Pitch';
import { expandCurve } from '@/components/editor/pathUtils';
import type { BoardData, Point } from '@/components/editor/types';
import { buildPitchGeometry, pitchOrientationForCategory } from '@/utils/pitchGeometry';

function isPoint(point: Partial<Point> | null | undefined): point is Point {
  return !!point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

export function SetPieceThumbnail({ boardData, category, imageUrl, roles = [] }: {
  boardData?: Partial<BoardData> | null;
  category: string;
  imageUrl?: string | null;
  roles?: { startPosition?: Partial<Point> | null }[] | null;
}) {
  const arrowId = useId();
  const [failedImage, setFailedImage] = useState<string>();
  const variants = Array.isArray(boardData?.variants) ? boardData.variants.filter(Boolean) : [];
  const variant = variants.find(item => item.id === boardData?.defaultVariantId) ?? variants[0];
  const board = variant ?? boardData;
  const annotations = (Array.isArray(board?.annotations) ? board.annotations : [])
    .filter(annotation => annotation && Array.isArray(annotation.points) && annotation.points.some(isPoint));
  const steps = Array.isArray(board?.steps)
    ? board.steps.filter(Boolean).sort((a, b) => a.sortOrder - b.sortOrder) : [];
  const step = steps[0];
  const visibleAnnotations = annotations.filter(annotation => !step || !annotation.stepId ||
    annotation.stepId === step.id || !steps.some(item => item.id === annotation.stepId));
  const entities = (Array.isArray(board?.entities) ? board.entities : []).filter(Boolean);
  const rolePositions = Object.values(board?.stepPositions?.[step?.id ?? ''] ?? {}).filter(isPoint);
  if (!rolePositions.length) rolePositions.push(...(roles ?? []).map(role => role.startPosition).filter(isPoint));
  const entityPositions = entities.flatMap(entity => {
    const position = board?.entityStepPositions?.[step?.id ?? '']?.[entity.id] ?? entity.position;
    return isPoint(position) ? [{ position, type: entity.type }] : [];
  });
  const thumbnailClass = 'h-20 w-28 shrink-0 rounded-md border border-white/10 sm:h-24 sm:w-32';

  if (!annotations.length && !rolePositions.length && !entityPositions.length) {
    return imageUrl && imageUrl !== failedImage
      ? <img alt="" src={imageUrl} loading="lazy" onError={() => setFailedImage(imageUrl)} className={`${thumbnailClass} object-cover`} />
      : null;
  }

  const geometry = buildPitchGeometry({ width: 128, height: 96, pad: 6, orientation: pitchOrientationForCategory(category) });
  const toPixel = geometry.percentToPixel;
  return (
    <svg aria-hidden="true" viewBox="0 0 128 96" className={`${thumbnailClass} bg-[#102e28]`}>
      <defs>
        <marker id={arrowId} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="4" markerHeight="4" orient="auto">
          <path d="M0 0 6 3 0 6Z" fill="context-stroke" />
        </marker>
      </defs>
      <PitchLines geometry={geometry} />
      {(visibleAnnotations.length || rolePositions.length || entityPositions.length ? visibleAnnotations : annotations)
        .map((annotation, index) => {
          const sourcePoints = annotation.points.filter(isPoint);
          const curved = annotation.type === 'curved_run' || annotation.type === 'curved_cross';
          const points = (curved ? expandCurve(sourcePoints) : sourcePoints).map(toPixel);
          const [start, end] = points;
          const color = typeof annotation.color === 'string' && annotation.color ? annotation.color : '#f1f5f9';
          const key = annotation.id ?? index;
          if (annotation.type === 'label') {
            return typeof annotation.label === 'string'
              ? <text key={key} x={start.x} y={start.y} fill={color} fontSize="6">{annotation.label}</text>
              : null;
          }
          if (annotation.type === 'zone_circle') {
            const radius = Number.isFinite(annotation.radius) ? Math.max(0, annotation.radius!) : 10;
            return <circle key={key} cx={start.x} cy={start.y} r={radius * geometry.pitchW / 100} fill={color} fillOpacity=".25" stroke={color} />;
          }
          if (!end) return null;
          if (annotation.type === 'zone_rect') {
            return <rect key={key} x={Math.min(start.x, end.x)} y={Math.min(start.y, end.y)} width={Math.abs(start.x - end.x)} height={Math.abs(start.y - end.y)} fill={color} fillOpacity=".25" stroke={color} />;
          }
          const run = annotation.type === 'run_path' || annotation.type === 'curved_run';
          const pass = annotation.type === 'pass_line' || annotation.type === 'curved_cross';
          return <polyline key={key} points={points.map(point => `${point.x},${point.y}`).join(' ')} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={run || (!pass && annotation.dashed) ? '3 2' : undefined} markerEnd={run || pass || annotation.arrowhead ? `url(#${arrowId})` : undefined} />;
        })}
      {rolePositions.map((position, index) => {
        const { x, y } = toPixel(position);
        return <circle key={index} cx={x} cy={y} r="3" fill="#5ee59d" stroke="#102e28" />;
      })}
      {entityPositions.map(({ position, type }, index) => {
        const { x, y } = toPixel(position);
        return <circle key={index} cx={x} cy={y} r={type === 'ball' ? 2 : 2.8} fill={type === 'ball' ? '#fff' : '#fca5a5'} stroke="#102e28" />;
      })}
    </svg>
  );
}
