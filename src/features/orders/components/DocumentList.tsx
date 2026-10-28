import { memo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  N1IconButton,
  N1Icon,
  N1Text,
  createN1Styles,
  useN1Styles,
} from '../../../shared/components';
import type { Attachment } from '../../../shared/types';
import { formatFileSize } from '../../../shared/utils';
import { ORDER_STRINGS } from '../constants';

type Props = {
  documents: readonly Attachment[];
  /** Without it, rows have no Download button. */
  onDownload?: (doc: Attachment) => void;
  /** Pressing a row views it too. */
  onView?: (doc: Attachment) => void;
  onPrint?: (doc: Attachment) => void;
  /** The print button's label for a file; by default "Print <name>". */
  printLabel?: (doc: Attachment) => string;
};

const makeStyles = createN1Styles(t => ({
  list: { gap: t.spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: t.borderWidth.hairline,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  icon: {
    padding: t.spacing.sm,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.tone.info.background,
  },
  text: { flex: 1, gap: t.spacing.xxs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  hovered: { backgroundColor: t.colors.background },
}));

export const DocumentList = memo(function DocumentListComponent({
  documents,
  onDownload,
  onView,
  onPrint,
  printLabel = doc => ORDER_STRINGS.details.printFile(doc.name),
}: Props) {
  const styles = useN1Styles(makeStyles);
  const [hovered, setHovered] = useState<string | null>(null);
  if (documents.length === 0) {
    return (
      <N1Text variant="small" color="secondary">
        {ORDER_STRINGS.details.noDocuments}
      </N1Text>
    );
  }
  return (
    <View style={styles.list}>
      {documents.map(doc => (
        <Pressable
          key={doc.id}
          // A row of buttons isn't a button itself; View is in the row.
          disabled={!onView}
          onPress={() => onView?.(doc)}
          onHoverIn={() => setHovered(doc.id)}
          onHoverOut={() => setHovered(null)}
          style={[styles.row, onView && hovered === doc.id && styles.hovered]}
          testID={`document-${doc.id}`}
        >
          <View style={styles.icon}>
            <N1Icon name="file" size="md" color="textPrimary" />
          </View>
          <View style={styles.text}>
            <N1Text variant="label" numberOfLines={1}>
              {doc.name}
            </N1Text>
            <N1Text variant="caption" color="secondary">
              {[doc.kind, doc.sizeBytes > 0 && formatFileSize(doc.sizeBytes)]
                .filter(Boolean)
                .join(' · ')}
            </N1Text>
          </View>
          <View style={styles.actions}>
            {onView && (
              <N1IconButton
                icon="eye"
                size="sm"
                variant="soft"
                accessibilityLabel={ORDER_STRINGS.details.view(doc.name)}
                onPress={() => onView(doc)}
              />
            )}
            {onPrint && (
              <N1IconButton
                icon="printer"
                size="sm"
                variant="soft"
                accessibilityLabel={printLabel(doc)}
                onPress={() => onPrint(doc)}
              />
            )}
            {onDownload && (
              <N1IconButton
                icon="download"
                size="sm"
                variant="soft"
                accessibilityLabel={ORDER_STRINGS.details.download(doc.name)}
                onPress={() => onDownload(doc)}
              />
            )}
          </View>
        </Pressable>
      ))}
    </View>
  );
});
