import { memo } from 'react';
import { Pressable, View } from 'react-native';
import {
  N1Button,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
} from '../../../shared/components';
import {
  DETAIL_COLUMNS,
  DRAWING_THUMB,
  ORDER_QR_SIZE,
} from '../../../shared/constants';
import { ORDER_STRINGS } from '../constants';
import { DrawingPreview } from './DrawingPreview';
import { QrCode } from './QrCode';

const D = ORDER_STRINGS.details;

const makeStyles = createN1Styles(t => ({
  // Drawing (thumbnail, number, buttons), then Order QR; on phones they stack.
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xl },
  // Wide screens: the Order QR takes the last detail column's width (set
  // inline), so it starts in line with that column below.
  wideRow: { flexWrap: 'nowrap', gap: 0 },
  section: { gap: t.spacing.md },
  // Heading and code start on the column's left edge; the code sits level
  // with the middle of the drawing thumbnail.
  qrColumn: { alignItems: 'flex-start' },
  qrSection: { flex: 1, gap: t.spacing.md, alignItems: 'flex-start' },
  qrBody: { flex: 1, justifyContent: 'center' },
  drawingBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: t.spacing.lg,
  },
  thumb: { ...DRAWING_THUMB },
  // Phones: the drawing spans the screen's width, keeping its 5:3 shape.
  compactThumbButton: { width: '100%' },
  compactThumb: {
    width: '100%',
    height: undefined,
    aspectRatio: DRAWING_THUMB.width / DRAWING_THUMB.height,
  },
  info: { flexShrink: 1, gap: t.spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  pressed: { opacity: t.opacity.pressed },
}));

type Props = {
  drawingNumber: string;
  /** False: a note stands in for the drawing; the QR still shows. */
  hasDrawing?: boolean;
  /** What the order QR holds; the app's scanner imports the order from it. */
  qrValue: string;
  onViewDrawing: () => void;
  onPrintDrawing: () => void;
  /** Columns of the detail grid below, so the QR lines up with the last. */
  columns?: number;
  /** Prefix for test IDs: `order` → order-drawing, order-qr… */
  testID: string;
};

/**
 * An order's drawing (thumbnail, number, View and Print) with its Order QR
 * beside it, as on the order and job card screens.
 */
export const DrawingQrSection = memo(function DrawingQrSectionComponent({
  drawingNumber,
  hasDrawing = true,
  qrValue,
  onViewDrawing,
  onPrintDrawing,
  columns = DETAIL_COLUMNS,
  testID,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const percent = (n: number) =>
    `${((100 * n) / columns).toFixed(4)}%` as const;
  const heading = (text: string) => (
    <N1Text variant="title" weight="bold">
      {text}
    </N1Text>
  );
  return (
    <View style={[styles.row, !isCompact && styles.wideRow]}>
      <View
        style={[styles.section, !isCompact && { width: percent(columns - 1) }]}
      >
        {heading(D.drawing)}
        {hasDrawing ? (
          <View style={styles.drawingBody}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={D.viewDrawingOf(drawingNumber)}
              onPress={onViewDrawing}
              style={({ pressed }) => [
                isCompact && styles.compactThumbButton,
                pressed && styles.pressed,
              ]}
              testID={`${testID}-drawing`}
            >
              <DrawingPreview
                drawingNumber={drawingNumber}
                style={isCompact ? styles.compactThumb : styles.thumb}
              />
            </Pressable>
            <View style={styles.info}>
              <View>
                <N1Text variant="caption" color="secondary">
                  {D.drawingNo}
                </N1Text>
                <N1Text weight="bold">{drawingNumber}</N1Text>
              </View>
              <View style={styles.actions}>
                <N1Button
                  title={D.viewDrawing}
                  leftIcon="eye"
                  variant="secondary"
                  size="sm"
                  onPress={onViewDrawing}
                  testID={`${testID}-view-drawing`}
                />
                <N1Button
                  title={D.printDrawing}
                  leftIcon="printer"
                  variant="secondary"
                  size="sm"
                  onPress={onPrintDrawing}
                />
              </View>
            </View>
          </View>
        ) : (
          <N1Text color="secondary">{D.noDrawing}</N1Text>
        )}
      </View>
      <View
        style={[styles.qrColumn, !isCompact && { width: percent(1) }]}
        testID={`${testID}-qr`}
      >
        <View style={styles.qrSection}>
          {heading(D.orderQr)}
          <View style={styles.qrBody}>
            <QrCode
              value={qrValue}
              size={ORDER_QR_SIZE}
              // The first line is the WO number; details follow under it.
              accessibilityLabel={D.orderQrA11y(qrValue.split('\n')[0])}
              flushLeft
              testID={`${testID}-qr-code`}
            />
          </View>
        </View>
      </View>
    </View>
  );
});
