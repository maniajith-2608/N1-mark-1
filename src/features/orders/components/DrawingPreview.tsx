import { memo } from 'react';
import { Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import {
  createN1Styles,
  useN1Styles,
  useN1Theme,
} from '../../../shared/components';
import { DRAWING_PREVIEW_HEIGHT } from '../../../shared/constants';
import { ORDER_STRINGS } from '../constants';

// Placeholder part outline in a 200×120 viewBox, until real drawing thumbnails
// exist. Exported so the printed drawing (printing.ts) draws the same part.
export const VIEW = { w: 200, h: 120 } as const;
export const PART = { x: 58, y: 22, w: 84, h: 62, hole: 13 } as const;
export const DIM_FONT = 7;
export const DIM_LABELS = {
  hole: '⌀28',
  width: '80 mm',
  height: '60',
} as const;

const makeStyles = createN1Styles(t => ({
  box: {
    height: DRAWING_PREVIEW_HEIGHT,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
}));

/**
 * Technical-drawing thumbnail for the order screen: the drawing's first page
 * when `uri` has it, else a simple placeholder part.
 */
export const DrawingPreview = memo(function DrawingPreviewComponent({
  drawingNumber,
  uri,
  style,
}: {
  drawingNumber: string;
  /** The first page as an image; null or absent shows the placeholder. */
  uri?: string | null;
  /** e.g. a smaller box for a thumbnail. */
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useN1Styles(makeStyles);
  const { colors } = useN1Theme();
  const stroke = colors.textPrimary;
  const muted = colors.textSecondary;
  const cx = PART.x + PART.w / 2;
  const cy = PART.y + PART.h / 2;
  const dimY = PART.y + PART.h + 14;
  const dimX = PART.x + PART.w + 12;
  const label = ORDER_STRINGS.details.drawingA11y(drawingNumber);
  if (uri) {
    return (
      <View style={[styles.box, style]}>
        <Image
          source={{ uri }}
          resizeMode="contain"
          style={styles.image}
          accessibilityLabel={label}
          testID="drawing-preview-image"
        />
      </View>
    );
  }
  return (
    <View
      style={[styles.box, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
    >
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}>
        <Rect
          x={PART.x}
          y={PART.y}
          width={PART.w}
          height={PART.h}
          stroke={stroke}
          strokeWidth={1.2}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={PART.hole}
          stroke={stroke}
          strokeWidth={1}
          fill="none"
        />
        <SvgText
          x={cx}
          y={cy + DIM_FONT / 3}
          fontSize={DIM_FONT - 2}
          fill={muted}
          textAnchor="middle"
        >
          {DIM_LABELS.hole}
        </SvgText>
        <Line
          x1={PART.x}
          y1={dimY}
          x2={PART.x + PART.w}
          y2={dimY}
          stroke={muted}
          strokeWidth={0.8}
        />
        <SvgText
          x={cx}
          y={dimY + DIM_FONT + 2}
          fontSize={DIM_FONT - 1}
          fill={muted}
          textAnchor="middle"
        >
          {DIM_LABELS.width}
        </SvgText>
        <Line
          x1={dimX}
          y1={PART.y}
          x2={dimX}
          y2={PART.y + PART.h}
          stroke={muted}
          strokeWidth={0.8}
        />
        <SvgText x={dimX + 5} y={cy} fontSize={DIM_FONT - 1} fill={muted}>
          {DIM_LABELS.height}
        </SvgText>
      </Svg>
    </View>
  );
});
