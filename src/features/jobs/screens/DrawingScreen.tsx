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
  useN1Styles,
} from '../../../shared/components';
import { printOrNotify } from '../../../services/print';
import { openStoredFile } from '../../../services/files/fileStorage';
import { notifyUnavailable } from '../../../shared/utils';
import { useJobCardForOrder } from '../../jobCards';
import { DrawingPreview, ORDER_STRINGS, orderHeading } from '../../orders';
import { VIEW } from '../../orders/components/DrawingPreview';
import { drawingPrintHtml } from '../../orders/printing';
import type { JobsScreenProps } from '../types';
import { jobViewOf } from '../utils';

const D = ORDER_STRINGS.details;

const makeStyles = createN1Styles(t => ({
  heading: { gap: t.spacing.xxs },
  // As wide as the screen, in the drawing's own proportions.
  drawing: { height: undefined, width: '100%', aspectRatio: VIEW.w / VIEW.h },
}));

/**
 * A work order's drawing, full screen (opened from the job's or order's
 * drawing), with Print drawing with QR and the stored design file. Read
 * through the order's job card, which every shop-floor role may open.
 */
export function DrawingScreen({
  route,
  navigation,
}: JobsScreenProps<'Drawing'>) {
  const styles = useN1Styles(makeStyles);
  const { orderId } = route.params;
  const { jobCard, status, error, reload } = useJobCardForOrder(orderId);
  const order = jobCard && jobViewOf(jobCard);
  const drawingNumber = order?.drawingNumber || D.noDrawing;
  const designFile = jobCard?.designFile;
  const openFile = useCallback(() => {
    if (designFile) {
      openStoredFile(designFile)
        .then(opened => opened || notifyUnavailable(D.downloadAction))
        .catch(() => notifyUnavailable(D.downloadAction));
    }
  }, [designFile]);

  const print = useCallback(() => {
    if (order) {
      printOrNotify(
        drawingPrintHtml(order, drawingNumber),
        ORDER_STRINGS.print.drawingJob(orderHeading(order)),
        D.printDrawing,
      );
    }
  }, [order, drawingNumber]);

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
      footer={[
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
      ]}
      testID="drawing-screen"
    >
      <View style={styles.heading}>
        <N1Text variant="h2">{drawingNumber}</N1Text>
        <N1Text color="secondary">{orderHeading(order)}</N1Text>
      </View>
      <DrawingPreview drawingNumber={drawingNumber} style={styles.drawing} />
    </UserScreen>
  );
}
