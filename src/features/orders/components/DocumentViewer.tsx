import { Image, View } from 'react-native';
import {
  N1Button,
  N1Icon,
  N1Modal,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import {
  DRAWING_PREVIEW_HEIGHT,
  ORDER_QR_SIZE,
} from '../../../shared/constants';
import { useHeldWhileVisible } from '../../../shared/hooks';
import type { Attachment } from '../../../shared/types';
import { formatFileSize } from '../../../shared/utils';
import { ORDER_STRINGS } from '../constants';
import { DrawingPreview } from './DrawingPreview';
import { QrCode } from './QrCode';

const D = ORDER_STRINGS.details;

/** The viewer is roomier than the inline drawing preview. */
const VIEWER_HEIGHT = DRAWING_PREVIEW_HEIGHT * 2;

const makeStyles = createN1Styles(t => ({
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: t.spacing.sm,
  },
}));

/** What the viewer shows: a document, the order's drawing, or its QR. */
export type ViewerTarget =
  | { type: 'document'; doc: Attachment }
  | { type: 'drawing'; drawingNumber: string }
  | { type: 'qr'; doc: Attachment; value: string };

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
  const visible = targetProp !== null;
  // Kept while the dialog fades out.
  const target = useHeldWhileVisible(visible, targetProp);
  const doc = target && target.type !== 'drawing' ? target.doc : null;

  const body = () => {
    if (!target) {
      return null;
    }
    if (target.type === 'drawing') {
      return <DrawingPreview drawingNumber={target.drawingNumber} />;
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
      title={
        target?.type === 'drawing'
          ? D.drawingTitle(target.drawingNumber)
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
              onPress={() => onDownload(doc)}
              testID="document-viewer-download"
            />
          )}
          <N1Button
            title={target?.type === 'drawing' ? D.printDrawing : D.print}
            leftIcon="printer"
            onPress={() => target && onPrint(target)}
            testID="document-viewer-print"
          />
        </View>
      }
      testID="document-viewer"
    >
      {body()}
    </N1Modal>
  );
}
