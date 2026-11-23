import { useCallback } from 'react';
import { View } from 'react-native';
import {
  AsyncContent,
  ComingSoon,
  N1Button,
  N1Header,
  N1Text,
  UserScreen,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
} from '../../../shared/components';
import { printOrNotify } from '../../../services/print';
import { useAppSelector } from '../../../app/store/hooks';
import { useJobCardForOrder } from '../../jobCards';
import { DrawingPreview, ORDER_STRINGS, orderHeading } from '../../orders';
import { DRAWING_QR } from '../../orders/constants';
import { orderDrawingQr } from '../../orders/utils';
import { VIEW } from '../../orders/components/DrawingPreview';
import { useDrawingThumbnail } from '../../orders/hooks/useDrawingThumbnail';
import { selectOrderById } from '../../orders/store/selectors';
import {
  notifyDrawingNotOpened,
  openDrawingWithQr,
} from '../../orders/drawings';
import { drawingPrintHtml, printDrawingWithQr } from '../../orders/printing';
import type { JobsScreenProps } from '../types';
import { jobViewOf } from '../utils';

const D = ORDER_STRINGS.details;

const makeStyles = createN1Styles(t => ({
  heading: { gap: t.spacing.xxs },
  // The placeholder: as wide as the screen, in its own proportions.
  drawing: { height: undefined, width: '100%', aspectRatio: VIEW.w / VIEW.h },
  // The real drawing: all the room left under the heading, to zoom into.
  drawingFill: { height: undefined, flex: 1 },
}));

/**
 * A work order's drawing, full screen (opened from the job's or order's
 * drawing), with Print drawing with QR and the stored design file. Read
 * through the order's job card, which every shop-floor role may open; an
 * order without a card yet (a supervisor importing it) from the order
 * already loaded.
 */
export function DrawingScreen({
  route,
  navigation,
}: JobsScreenProps<'Drawing'>) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const { orderId } = route.params;
  const { jobCard, status, error, reload } = useJobCardForOrder(orderId);
  const loadedOrder = useAppSelector(state => selectOrderById(state, orderId));
  const order = jobCard ? jobViewOf(jobCard) : loadedOrder;
  const drawingNumber = order?.drawingNumber || D.noDrawing;
  const designFile = order?.designFile ?? undefined;
  const company = order?.customerName ?? '';
  // Drawn large, so small dimensions stay readable when zoomed in, and as
  // it prints: the order QR on it.
  const thumbnail = useDrawingThumbnail(
    designFile,
    company,
    DRAWING_QR.fullViewPixels,
    order ? orderDrawingQr(order) : undefined,
  );
  // As it prints: the order's QR stamped on, no customer name, address or
  // logo.
  const openFile = useCallback(() => {
    if (designFile && order) {
      openDrawingWithQr(designFile, order)
        .then(opened => opened || notifyDrawingNotOpened())
        .catch(notifyDrawingNotOpened);
    }
  }, [designFile, order]);

  // The stored drawing prints with the order's QR stamped on it, as on the
  // admin's job card; only an order without a file prints the placeholder.
  const print = useCallback(() => {
    if (!order) {
      return;
    }
    if (designFile) {
      printDrawingWithQr(order, designFile);
      return;
    }
    printOrNotify(
      drawingPrintHtml(order, drawingNumber),
      ORDER_STRINGS.print.drawingJob(orderHeading(order)),
      D.printDrawing,
    );
  }, [order, designFile, drawingNumber]);

  const header = (
    <N1Header
      title={D.drawing}
      leftIcon="close"
      onLeftPress={() => navigation.goBack()}
    />
  );

  if (!order) {
    return (
      <UserScreen header={header} testID="drawing-screen">
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="file" title={D.drawing} message={D.notFound} />
        </AsyncContent>
      </UserScreen>
    );
  }

  return (
    <UserScreen
      header={header}
      fill
      // Phones: just the drawing, without Open in new tab or Print.
      footer={
        isCompact
          ? undefined
          : [
              ...(designFile
                ? [
                    <N1Button
                      key="open"
                      title={D.openInNewTab}
                      leftIcon="file"
                      variant="secondary"
                      size="lg"
                      fullWidth
                      onPress={openFile}
                      testID="drawing-open"
                    />,
                  ]
                : []),
              <N1Button
                key="print"
                title={D.printDrawing}
                leftIcon="printer"
                variant="secondary"
                size="lg"
                fullWidth
                onPress={print}
                testID="drawing-print"
              />,
            ]
      }
      testID="drawing-screen"
    >
      <View style={styles.heading}>
        <N1Text variant="h2">{drawingNumber}</N1Text>
        <N1Text color="secondary">{orderHeading(order)}</N1Text>
      </View>
      <DrawingPreview
        drawingNumber={drawingNumber}
        uri={thumbnail}
        style={thumbnail ? styles.drawingFill : styles.drawing}
        zoomable
      />
    </UserScreen>
  );
}
