import { Image, ScrollView, View } from 'react-native';
import {
  AsyncContent,
  N1Button,
  N1Icon,
  N1Modal,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
} from '../../../shared/components';
import {
  DRAWING_PREVIEW_HEIGHT,
  ORDER_QR_SIZE,
} from '../../../shared/constants';
import { useHeldWhileVisible } from '../../../shared/hooks';
import type { Attachment } from '../../../shared/types';
import { formatFileSize } from '../../../shared/utils';
import { DRAWING_QR, ORDER_STRINGS } from '../constants';
import type { DrawingQr } from '../drawingStamp';
import {
  downloadDrawingWithQr,
  notifyDrawingNotOpened,
  openMaskedDrawing,
} from '../drawings';
import { useDrawingThumbnail } from '../hooks/useDrawingThumbnail';
import { useStampedPreview } from '../hooks/useStampedPreview';
import { DrawingPreview } from './DrawingPreview';
import { QrCode } from './QrCode';

const D = ORDER_STRINGS.details;

/** The viewer is roomier than the inline drawing preview. */
const VIEWER_HEIGHT = DRAWING_PREVIEW_HEIGHT * 2;

const makeStyles = createN1Styles(t => ({
  // An uploaded drawing's page shows as large as an image; on phones (full
  // screen) it takes the whole screen to zoom into.
  drawing: { height: VIEWER_HEIGHT },
  drawingFill: { height: undefined, flex: 1 },
  image: {
    width: '100%',
    height: VIEWER_HEIGHT,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.background,
  },
  placeholder: {
    height: VIEWER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.sm,
    padding: t.spacing.xl,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderStyle: 'dashed',
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  qr: {
    height: VIEWER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The stamped pages scroll one under another, each at its own shape: in
  // a window of the dialog, or down the whole screen on phones.
  stampedPages: { maxHeight: VIEWER_HEIGHT },
  stampedPagesContent: { gap: t.spacing.md },
  stampedPage: {
    width: '100%',
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: t.spacing.sm,
  },
}));

/** What the viewer shows: a document, the order's drawing, or its QR. */
export type ViewerTarget =
  | { type: 'document'; doc: Attachment }
  /**
   * `doc`: the uploaded drawing file, shown with the customer's (`company`)
   * details blanked, as when printing; given `qr`, every page with the order
   * QR on it (as 'drawingQr'), and it downloads that way too.
   */
  | {
      type: 'drawing';
      drawingNumber: string;
      doc?: Attachment;
      company: string;
      qr?: DrawingQr;
    }
  /** The drawing file as it prints: the order QR on every page. */
  | {
      type: 'drawingQr';
      drawingNumber: string;
      doc: Attachment;
      qrValue: string;
      /** The customer, whose details are blanked as when printing. */
      company: string;
      /** Above the QR, e.g. "WO #13"; blank for none. */
      label: string;
    }
  | { type: 'qr'; doc: Attachment; value: string };

const isDrawing = (target: ViewerTarget | null) =>
  target?.type === 'drawing' || target?.type === 'drawingQr';

/** The drawing to show with the order QR on every page, if any. */
const stampedOf = (target: ViewerTarget | null) =>
  target?.type === 'drawingQr'
    ? target
    : target?.type === 'drawing' && target.doc && target.qr
    ? {
        doc: target.doc,
        qrValue: target.qr.value,
        company: target.company,
        label: target.qr.label,
      }
    : null;

type Props = {
  target: ViewerTarget | null;
  onClose: () => void;
  onPrint: (target: ViewerTarget) => void;
  onDownload: (doc: Attachment) => void;
  /** Opens the file in a new tab; null when it can't be opened. */
  onOpen: ((doc: Attachment) => void) | null;
};

/**
 * Shows a document or the drawing, with Print (and Download for files).
 * Images show as they are; other files show their details until the files
 * themselves can be fetched.
 */
export function DocumentViewer({
  target: targetProp,
  onClose,
  onPrint,
  onDownload,
  onOpen,
}: Props) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const visible = targetProp !== null;
  // Kept while the dialog fades out.
  const target = useHeldWhileVisible(visible, targetProp);
  const doc = target?.doc ?? null;
  // The opened drawing is drawn large, so its small text stays sharp.
  const withQr = stampedOf(target);
  const thumbnail = useDrawingThumbnail(
    target?.type === 'drawing' && !withQr ? target.doc : undefined,
    target?.type === 'drawing' ? target.company : '',
    DRAWING_QR.fullViewPixels,
  );
  // A drawing downloads as it prints (QR on every page) when it has one,
  // else masked; other documents as stored. A drawing never falls back to
  // the stored file, which shows the customer: if it can't be prepared (or
  // on a phone, which can't yet) the user is told instead.
  const download = (file: Attachment) => {
    if (!isDrawing(target)) {
      onDownload(file);
      return;
    }
    const opening = withQr
      ? downloadDrawingWithQr(
          file,
          { value: withQr.qrValue, label: withQr.label },
          withQr.company,
        )
      : openMaskedDrawing(
          file,
          target?.type === 'drawing' ? target.company : '',
        );
    opening
      .then(opened => opened || notifyDrawingNotOpened())
      .catch(notifyDrawingNotOpened);
  };
  const stamped = useStampedPreview(
    withQr?.doc,
    withQr?.qrValue ?? '',
    withQr?.company ?? '',
    withQr?.label ?? '',
  );

  // Phones: the opened drawing fills the screen (see styles.drawingFill).
  const fillsScreen =
    isCompact && target?.type === 'drawing' && !withQr && Boolean(thumbnail);

  const body = () => {
    if (!target) {
      return null;
    }
    if (withQr) {
      const crowded = stamped.preview?.crowdedPages ?? [];
      return (
        <AsyncContent
          status={stamped.status}
          error={D.previewQrUnavailable}
          testID="document-viewer-stamped-status"
        >
          <ScrollView
            style={isCompact ? undefined : styles.stampedPages}
            contentContainerStyle={styles.stampedPagesContent}
            testID="document-viewer-stamped"
          >
            {crowded.length > 0 && (
              <N1Text variant="small" color="secondary">
                {D.previewQrCrowded(crowded.join(', '))}
              </N1Text>
            )}
            {stamped.preview?.pages.map((page, i) => (
              <Image
                key={page.uri}
                source={{ uri: page.uri }}
                resizeMode="contain"
                style={[styles.stampedPage, { aspectRatio: page.aspectRatio }]}
                accessibilityLabel={D.previewQrPage(i + 1)}
              />
            ))}
          </ScrollView>
        </AsyncContent>
      );
    }
    if (target.type === 'drawing') {
      return (
        <DrawingPreview
          drawingNumber={target.drawingNumber}
          uri={thumbnail}
          style={
            thumbnail
              ? isCompact
                ? styles.drawingFill
                : styles.drawing
              : undefined
          }
          zoomable
        />
      );
    }
    if (target.type === 'qr') {
      return (
        <View style={styles.qr} testID="document-viewer-qr">
          <QrCode
            value={target.value}
            size={ORDER_QR_SIZE * 2}
            accessibilityLabel={target.doc.name}
          />
        </View>
      );
    }
    if (doc?.uri?.startsWith('data:image')) {
      return (
        <Image
          source={{ uri: doc.uri }}
          resizeMode="contain"
          style={styles.image}
          accessibilityLabel={doc.name}
          testID="document-viewer-image"
        />
      );
    }
    return (
      <View style={styles.placeholder} testID="document-viewer-placeholder">
        <N1Icon name="file" size="lg" color="textSecondary" />
        <N1Text weight="semiBold" align="center">
          {doc?.name}
        </N1Text>
        <N1Text variant="small" color="secondary" align="center">
          {doc && onOpen ? D.viewerOpenHelp : D.viewerUnavailable}
        </N1Text>
        {doc && onOpen && (
          <N1Button
            title={D.openInNewTab}
            leftIcon="arrow-right"
            variant="secondary"
            size="sm"
            onPress={() => onOpen(doc)}
          />
        )}
      </View>
    );
  };

  return (
    <N1Modal
      visible={visible}
      onClose={onClose}
      size="lg"
      fill={fillsScreen}
      title={
        target?.type === 'drawing'
          ? D.drawingTitle(target.drawingNumber)
          : target?.type === 'drawingQr'
          ? D.previewQrTitle(target.drawingNumber)
          : doc?.name
      }
      subtitle={
        doc
          ? [doc.kind, doc.sizeBytes > 0 && formatFileSize(doc.sizeBytes)]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      footer={
        <View style={styles.footer}>
          {doc && (
            <N1Button
              title={D.downloadDocument}
              leftIcon="download"
              variant="secondary"
              onPress={() => download(doc)}
              testID="document-viewer-download"
            />
          )}
          {/* Phones: Download only, no Print. */}
          {!isCompact && (
            <N1Button
              title={isDrawing(target) ? D.printDrawing : D.print}
              leftIcon="printer"
              onPress={() => target && onPrint(target)}
              testID="document-viewer-print"
            />
          )}
        </View>
      }
      testID="document-viewer"
    >
      {body()}
    </N1Modal>
  );
}
