import { Circle, Group, Text, Line, RegularPolygon, Ring } from 'react-konva';

interface MarkerProps {
  x: number;
  y: number;
  isSelected?: boolean;
  isHovered?: boolean;
  isDimmed?: boolean;
  isUnassigned?: boolean;
  label?: string;
  lastName?: string;
  shirtNumber?: number | string;
  draggable?: boolean;
  lightPitch?: boolean;
  onDragEnd?: (pos: { x: number; y: number }) => void;
  onClick?: () => void;
  onTap?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const R = 16;

export function TeamPlayerMarker({
  x, y, isSelected, isHovered, isDimmed, isUnassigned, label, lastName, shirtNumber, lightPitch,
  draggable, onDragEnd, onClick, onTap, onMouseEnter, onMouseLeave,
}: MarkerProps) {
  const fill = lightPitch ? '#059669' : '#0d3320';
  const borderDefault = lightPitch ? '#047857' : '#166534';
  const borderHover = lightPitch ? '#10b981' : '#34d399';
  const borderSelected = '#10b981';
  const labelColor = lightPitch ? '#065f46' : '#ffffff';
  const shadowColor = lightPitch ? 'rgba(0,0,0,0.25)' : '#000';
  const unassignedOpacity = isUnassigned ? 0.65 : 1;
  const dimOpacity = isDimmed ? 0.35 : unassignedOpacity;

  const unassignedFill = lightPitch ? '#6b7280' : '#1f2937';
  const unassignedBorder = lightPitch ? '#9ca3af' : '#4b5563';

  const effectiveFill = isUnassigned ? unassignedFill : fill;
  const effectiveBorderDefault = isUnassigned ? unassignedBorder : borderDefault;

  return (
    <Group
      x={x} y={y} draggable={draggable}
      opacity={dimOpacity}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <Ring innerRadius={R + 2} outerRadius={R + 8} fill={borderSelected} opacity={0.6} />
      )}
      {isSelected && (
        <Circle radius={R + 12} stroke={borderSelected} strokeWidth={1.5} opacity={0.3} dash={[4, 3]} />
      )}

      <Circle
        radius={R}
        fill={effectiveFill}
        stroke={isSelected ? borderSelected : isHovered ? borderHover : effectiveBorderDefault}
        strokeWidth={isSelected ? 2.5 : 2}
        shadowColor={isSelected ? borderSelected : shadowColor}
        shadowBlur={isSelected ? 16 : 6}
        shadowOpacity={isSelected ? 0.7 : 0.3}
        dash={isUnassigned ? [4, 3] : undefined}
      />

      {!isUnassigned && (
        <Circle radius={R - 3} fill="transparent" stroke={borderSelected} strokeWidth={0.8} opacity={0.4} />
      )}

      {!isUnassigned && (
        <Circle radius={4} y={-R + 5} fill={borderSelected} opacity={0.6} />
      )}

      {isUnassigned ? (
        <Text
          text="?"
          fontSize={15}
          fontFamily="Inter, sans-serif"
          fontStyle="bold"
          fill={lightPitch ? '#9ca3af' : '#6b7280'}
          align="center"
          verticalAlign="middle"
          width={R * 2}
          height={R * 2}
          x={-R}
          y={-R}
        />
      ) : (
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
      )}

      {lastName ? (
        <Group y={R + 3}>
          <Text
            text={lastName}
            fontSize={9}
            fontFamily="Inter, sans-serif"
            fontStyle="bold"
            fill={labelColor}
            opacity={0.95}
            align="center"
            width={80}
            x={-40}
            y={0}
          />
          {label && (
            <Text
              text={label}
              fontSize={8}
              fontFamily="Inter, sans-serif"
              fontStyle="600"
              fill={labelColor}
              opacity={0.6}
              align="center"
              width={70}
              x={-35}
              y={12}
            />
          )}
        </Group>
      ) : isUnassigned ? (
        <Group y={R + 3}>
          <Text
            text="Unassigned"
            fontSize={8}
            fontFamily="Inter, sans-serif"
            fontStyle="italic"
            fill={lightPitch ? '#9ca3af' : '#6b7280'}
            opacity={0.8}
            align="center"
            width={70}
            x={-35}
            y={0}
          />
          {label && (
            <Text
              text={label}
              fontSize={8}
              fontFamily="Inter, sans-serif"
              fontStyle="600"
              fill={labelColor}
              opacity={0.5}
              align="center"
              width={70}
              x={-35}
              y={11}
            />
          )}
        </Group>
      ) : label ? (
        <Text
          text={label}
          fontSize={9}
          fontFamily="Inter, sans-serif"
          fontStyle="600"
          fill={labelColor}
          opacity={0.85}
          align="center"
          width={70}
          x={-35}
          y={R + 5}
        />
      ) : null}
    </Group>
  );
}

export function OpponentMarker({
  x, y, isSelected, isHovered, isDimmed, label, shirtNumber, lightPitch,
  draggable, onDragEnd, onClick, onTap, onMouseEnter, onMouseLeave,
}: MarkerProps) {
  const fill = lightPitch ? '#dc2626' : '#3b1010';
  const borderDefault = lightPitch ? '#b91c1c' : '#991b1b';
  const borderHover = lightPitch ? '#ef4444' : '#f87171';
  const borderSelected = '#ef4444';
  const labelColor = lightPitch ? '#991b1b' : '#fca5a5';
  const shadowColor = lightPitch ? 'rgba(0,0,0,0.25)' : '#000';
  const dimOpacity = isDimmed ? 0.35 : 1;

  return (
    <Group
      x={x} y={y} draggable={draggable}
      opacity={dimOpacity}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <Ring innerRadius={R + 2} outerRadius={R + 6} fill={borderSelected} opacity={0.5} />
      )}

      <Circle
        radius={R}
        fill={fill}
        stroke={isSelected ? borderSelected : isHovered ? borderHover : borderDefault}
        strokeWidth={isSelected ? 2.5 : 2}
        shadowColor={isSelected ? borderSelected : shadowColor}
        shadowBlur={isSelected ? 14 : 6}
        shadowOpacity={isSelected ? 0.6 : 0.3}
      />

      <Circle radius={R - 3} fill="transparent" stroke={borderSelected} strokeWidth={0.8} opacity={0.4} />

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
          fill={labelColor}
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
  x, y, isSelected, isHovered, isDimmed, label, shirtNumber, lightPitch,
  draggable, onDragEnd, onClick, onTap, onMouseEnter, onMouseLeave,
}: MarkerProps) {
  const fill = lightPitch ? '#d97706' : '#422006';
  const borderDefault = lightPitch ? '#b45309' : '#92400e';
  const borderHover = lightPitch ? '#f59e0b' : '#fbbf24';
  const borderSelected = '#f59e0b';
  const textColor = lightPitch ? '#ffffff' : '#fde68a';
  const labelColor = lightPitch ? '#92400e' : '#fde68a';
  const shadowColor = lightPitch ? 'rgba(0,0,0,0.25)' : '#000';
  const dimOpacity = isDimmed ? 0.35 : 1;

  return (
    <Group
      x={x} y={y} draggable={draggable}
      opacity={dimOpacity}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {isSelected && (
        <Ring innerRadius={R + 2} outerRadius={R + 6} fill={borderSelected} opacity={0.5} />
      )}

      <RegularPolygon
        sides={6}
        radius={R + 2}
        fill={fill}
        stroke={isSelected ? borderSelected : isHovered ? borderHover : borderDefault}
        strokeWidth={isSelected ? 2.5 : 2}
        shadowColor={isSelected ? borderSelected : shadowColor}
        shadowBlur={isSelected ? 14 : 6}
        shadowOpacity={isSelected ? 0.6 : 0.3}
        rotation={90}
      />

      <Text
        text={String(shirtNumber ?? '1')}
        fontSize={13}
        fontFamily="Inter, sans-serif"
        fontStyle="bold"
        fill={textColor}
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
          fill={labelColor}
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
  x, y, isSelected, isDimmed, lightPitch, draggable, onDragEnd, onClick, onTap,
}: Omit<MarkerProps, 'shirtNumber' | 'label' | 'isHovered' | 'isUnassigned' | 'lastName'> & { isSelected?: boolean }) {
  const br = 10;
  const ringColor = lightPitch ? '#333' : '#ffffff';
  const dimOpacity = isDimmed ? 0.35 : 1;
  return (
    <Group
      x={x} y={y} draggable={draggable}
      opacity={dimOpacity}
      onDragEnd={onDragEnd ? (e) => onDragEnd({ x: e.target.x(), y: e.target.y() }) : undefined}
      onClick={(e) => { e.cancelBubble = true; onClick?.(); }}
      onTap={(e) => { e.cancelBubble = true; onTap?.(); }}
    >
      {isSelected && (
        <Circle radius={br + 6} stroke={ringColor} strokeWidth={1.5} opacity={0.5} dash={[3, 3]} />
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

      <RegularPolygon sides={5} radius={4.5} fill="#333" stroke="#333" strokeWidth={0.5} />

      <Line points={[-3, -br + 3, 0, -5.5, 3, -br + 3]} stroke="#555" strokeWidth={0.8} closed fill="#444" />
      <Line points={[-br + 2, 2, -5.5, 0, -br + 3, -3]} stroke="#555" strokeWidth={0.8} closed fill="#444" />
      <Line points={[br - 2, 2, 5.5, 0, br - 3, -3]} stroke="#555" strokeWidth={0.8} closed fill="#444" />
      <Line points={[-4, br - 3, 0, 5.5, 4, br - 3]} stroke="#555" strokeWidth={0.8} closed fill="#444" />
      <Line points={[br - 2, -br + 4, 5.5, -3, br - 1, 0]} stroke="#555" strokeWidth={0.8} closed fill="#444" />
    </Group>
  );
}
