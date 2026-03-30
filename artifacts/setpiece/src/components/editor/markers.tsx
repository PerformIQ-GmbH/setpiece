import { Circle, Group, Text, Line, RegularPolygon, Ring } from 'react-konva';

interface MarkerProps {
  x: number;
  y: number;
  isSelected?: boolean;
  isHovered?: boolean;
  label?: string;
  shirtNumber?: number | string;
  draggable?: boolean;
  onDragEnd?: (pos: { x: number; y: number }) => void;
  onClick?: () => void;
  onTap?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const R = 16;

export function TeamPlayerMarker({
  x, y, isSelected, isHovered, label, shirtNumber,
  draggable, onDragEnd, onClick, onTap, onMouseEnter, onMouseLeave,
}: MarkerProps) {
  return (
    <Group
      x={x} y={y} draggable={draggable}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <Ring innerRadius={R + 2} outerRadius={R + 6} fill="#10b981" opacity={0.5} />
      )}
      {isSelected && (
        <Circle radius={R + 8} stroke="#10b981" strokeWidth={1.5} opacity={0.4} dash={[4, 3]} />
      )}

      <Circle
        radius={R}
        fill="#0d3320"
        stroke={isSelected ? '#10b981' : isHovered ? '#34d399' : '#166534'}
        strokeWidth={isSelected ? 2.5 : 2}
        shadowColor={isSelected ? '#10b981' : '#000'}
        shadowBlur={isSelected ? 14 : 6}
        shadowOpacity={isSelected ? 0.6 : 0.3}
      />

      <Circle radius={R - 3} fill="transparent" stroke="#10b981" strokeWidth={0.8} opacity={0.4} />

      <Circle radius={4} y={-R + 5} fill="#10b981" opacity={0.6} />

      <Text
        text={String(shirtNumber ?? '')}
        fontSize={shirtNumber && Number(shirtNumber) > 9 ? 11 : 13}
        fontFamily="Inter, sans-serif"
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        width={R * 2}
        height={R * 2}
        x={-R}
        y={-R}
      />

      {label && (
        <Text
          text={label}
          fontSize={9}
          fontFamily="Inter, sans-serif"
          fontStyle="600"
          fill="#ffffff"
          opacity={0.85}
          align="center"
          width={70}
          x={-35}
          y={R + 5}
        />
      )}
    </Group>
  );
}

export function OpponentMarker({
  x, y, isSelected, isHovered, label, shirtNumber,
  draggable, onDragEnd, onClick, onTap, onMouseEnter, onMouseLeave,
}: MarkerProps) {
  return (
    <Group
      x={x} y={y} draggable={draggable}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <Ring innerRadius={R + 2} outerRadius={R + 6} fill="#ef4444" opacity={0.5} />
      )}

      <Circle
        radius={R}
        fill="#3b1010"
        stroke={isSelected ? '#ef4444' : isHovered ? '#f87171' : '#991b1b'}
        strokeWidth={isSelected ? 2.5 : 2}
        shadowColor={isSelected ? '#ef4444' : '#000'}
        shadowBlur={isSelected ? 14 : 6}
        shadowOpacity={isSelected ? 0.6 : 0.3}
      />

      <Circle radius={R - 3} fill="transparent" stroke="#ef4444" strokeWidth={0.8} opacity={0.4} />

      <Text
        text={String(shirtNumber ?? '')}
        fontSize={shirtNumber && Number(shirtNumber) > 9 ? 11 : 13}
        fontFamily="Inter, sans-serif"
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        width={R * 2}
        height={R * 2}
        x={-R}
        y={-R}
      />

      {label && (
        <Text
          text={label}
          fontSize={9}
          fontFamily="Inter, sans-serif"
          fontStyle="600"
          fill="#fca5a5"
          opacity={0.85}
          align="center"
          width={70}
          x={-35}
          y={R + 5}
        />
      )}
    </Group>
  );
}

export function GoalkeeperMarker({
  x, y, isSelected, isHovered, label, shirtNumber,
  draggable, onDragEnd, onClick, onTap, onMouseEnter, onMouseLeave,
}: MarkerProps) {
  return (
    <Group
      x={x} y={y} draggable={draggable}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <Ring innerRadius={R + 2} outerRadius={R + 6} fill="#f59e0b" opacity={0.5} />
      )}

      <RegularPolygon
        sides={6}
        radius={R + 2}
        fill="#422006"
        stroke={isSelected ? '#f59e0b' : isHovered ? '#fbbf24' : '#92400e'}
        strokeWidth={isSelected ? 2.5 : 2}
        shadowColor={isSelected ? '#f59e0b' : '#000'}
        shadowBlur={isSelected ? 14 : 6}
        shadowOpacity={isSelected ? 0.6 : 0.3}
        rotation={90}
      />

      <Text
        text={String(shirtNumber ?? '1')}
        fontSize={13}
        fontFamily="Inter, sans-serif"
        fontStyle="bold"
        fill="#fde68a"
        align="center"
        verticalAlign="middle"
        width={R * 2}
        height={R * 2}
        x={-R}
        y={-R}
      />

      {label && (
        <Text
          text={label || 'GK'}
          fontSize={9}
          fontFamily="Inter, sans-serif"
          fontStyle="600"
          fill="#fde68a"
          opacity={0.85}
          align="center"
          width={70}
          x={-35}
          y={R + 6}
        />
      )}
    </Group>
  );
}

export function BallMarker({
  x, y, isSelected, draggable, onDragEnd, onClick, onTap,
}: Omit<MarkerProps, 'shirtNumber' | 'label' | 'isHovered'> & { isSelected?: boolean }) {
  const br = 10;
  return (
    <Group
      x={x} y={y} draggable={draggable}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
    >
      {isSelected && (
        <Circle radius={br + 6} stroke="#ffffff" strokeWidth={1.5} opacity={0.5} dash={[3, 3]} />
      )}

      <Circle
        radius={br}
        fill="#f5f5f5"
        stroke="#333"
        strokeWidth={1.5}
        shadowColor="#000"
        shadowBlur={6}
        shadowOpacity={0.4}
      />

      <Line points={[-3, -br + 3, 0, -5, 3, -br + 3]} stroke="#333" strokeWidth={1} closed />
      <Line points={[-br + 2, 2, -5, 0, -br + 3, -3]} stroke="#333" strokeWidth={1} closed />
      <Line points={[br - 2, 2, 5, 0, br - 3, -3]} stroke="#333" strokeWidth={1} closed />
      <Line points={[-4, br - 3, 0, 5, 4, br - 3]} stroke="#333" strokeWidth={1} closed />
      <RegularPolygon sides={5} radius={4} fill="transparent" stroke="#333" strokeWidth={0.8} />
    </Group>
  );
}
