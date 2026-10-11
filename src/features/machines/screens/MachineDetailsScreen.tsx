import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  KeyboardScrollView,
  AdminScreen,
  AdminScreenBackground,
  AsyncContent,
  DetailHeader,
  ComingSoon,
  EditableSectionHeader,
  N1Card,
  N1Divider,
  N1Icon,
  N1IconButton,
  N1Text,
  createN1Styles,
  useN1Breakpoint,
  useN1Styles,
} from '../../../shared/components';
import { useForm, useOnSettled } from '../../../shared/hooks';
import { CurrentWork } from '../components/CurrentWork';
import { MachineStatusBadge } from '../components/MachineBadge';
import { MachineFields } from '../components/MachineFields';
import {
  MachineFormModal,
  makeMachineValidator,
  toMachineValues,
  trimMachine,
} from '../components/MachineFormModal';
import { MACHINE_STRINGS, MACHINE_TYPE_LABELS } from '../constants';
import { useMachine } from '../hooks/useMachines';
import type { MachineInput, MachinesScreenProps } from '../types';

const D = MACHINE_STRINGS.details;

const makeStyles = createN1Styles(t => ({
  card: { gap: t.spacing.xl },
  // Wide screens: the card fills the window; the heading stays put and only
  // the content below it scrolls.
  fixedCard: { flex: 1, minHeight: 0 },
  heading: { gap: t.spacing.xl },
  scroll: { flex: 1 },
  // Room below Notes so its box is never flush with the card edge.
  scrollContent: { paddingBottom: t.spacing.xl },
  content: { gap: t.spacing.xl },
  section: { gap: t.spacing.lg },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xs,
  },
  pressed: { opacity: t.opacity.pressed },
  identity: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
  },
  titles: { flex: 1, gap: t.spacing.xxs },
}));

/**
 * One machine: what it's working on, then its details — locked fields that
 * Edit unlocks in place on wide screens. Phones show it on a white page and
 * the header's Edit slides up the same Edit machine sheet as the list.
 */
export function MachineDetailsScreen({
  route,
  navigation,
}: MachinesScreenProps<'MachineDetails'>) {
  const styles = useN1Styles(makeStyles);
  const { isCompact } = useN1Breakpoint();
  const { machine, items, status, error, reload, update, saving, saveError } =
    useMachine(route.params.machineId);
  const [editing, setEditing] = useState(false);
  const startEdit = useCallback(() => setEditing(true), []);
  const stopEdit = useCallback(() => setEditing(false), []);
  const [editorOpen, setEditorOpen] = useState(false);
  const openEditor = useCallback(() => setEditorOpen(true), []);
  const closeEditor = useCallback(() => setEditorOpen(false), []);
  const goBack = useCallback(
    () => navigation.popTo('MachinesList'),
    [navigation],
  );

  const validate = useMemo(
    () => makeMachineValidator(items, machine?.id),
    [items, machine?.id],
  );
  const form = useForm<MachineInput>(toMachineValues(machine), validate);
  const { reset, values, errors, bind } = form;

  // Locked fields always show the saved machine; Cancel drops edits.
  useEffect(() => {
    if (!editing) {
      reset(toMachineValues(machine));
    }
  }, [editing, machine, reset]);

  useOnSettled(saving, saveError, stopEdit);

  const save = useCallback(
    (v: MachineInput) => {
      if (machine) {
        update(machine.id, trimMachine(v));
      }
    },
    [machine, update],
  );

  const backLink = (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={D.back}
      onPress={goBack}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
      testID="machine-details-back"
    >
      <N1Icon name="arrow-left" size="sm" color="textSecondary" />
      <N1Text variant="label" color="secondary">
        {D.back}
      </N1Text>
    </Pressable>
  );

  // Phones: a header with back and the screen's name, in place of the link.
  const header = (
    <DetailHeader
      title={D.title}
      onBack={goBack}
      // Phones: Edit sits in the header, beside the screen's name.
      compactRight={
        machine && (
          <N1IconButton
            icon="edit"
            variant="tile"
            accessibilityLabel={MACHINE_STRINGS.a11y.edit(machine.name)}
            onPress={openEditor}
            testID="edit-machine"
          />
        )
      }
    />
  );

  if (!machine) {
    return (
      <AdminScreen header={header} testID="machine-details-screen">
        {!isCompact && backLink}
        <AsyncContent status={status} error={error} onRetry={reload}>
          <ComingSoon icon="wrench" title={D.title} message={D.notFound} />
        </AsyncContent>
      </AdminScreen>
    );
  }

  const heading = (
    <View style={styles.heading} testID="machine-details-heading">
      {!isCompact && backLink}
      <View style={styles.identity}>
        <View style={styles.titles}>
          <N1Text variant="h2" accessibilityRole="header">
            {machine.name}
          </N1Text>
          <N1Text variant="small" color="secondary">
            {`${machine.code} · ${MACHINE_TYPE_LABELS[machine.type]} · ${
              machine.location
            }`}
          </N1Text>
        </View>
        <MachineStatusBadge status={machine.status} />
      </View>
      <N1Divider />
    </View>
  );

  const content = (
    <View style={styles.content}>
      {machine.currentWork && (
        <View style={styles.section} testID="machine-current-work">
          <N1Text variant="h3">{D.currentWork}</N1Text>
          <CurrentWork work={machine.currentWork} variant="panel" />
        </View>
      )}
      <View style={styles.section} testID="machine-details-form">
        <EditableSectionHeader
          title={D.section}
          editing={!isCompact && editing}
          saving={saving}
          onEdit={startEdit}
          // Phones: Edit is in the header instead.
          actionsInFooter={isCompact}
          onCancel={stopEdit}
          onSave={form.submit(save)}
          editLabel={MACHINE_STRINGS.a11y.edit(machine.name)}
          editTestID="edit-machine"
          submitTestID="machine-form-submit"
        />
        <MachineFields
          values={values}
          errors={errors}
          bind={bind}
          locked={isCompact || !editing}
        />
        {editing && saveError && (
          <N1Text variant="small" color="danger">
            {saveError}
          </N1Text>
        )}
      </View>
    </View>
  );

  // Phones: straight on a white page, like Employee and Customer details.
  if (isCompact) {
    return (
      <AdminScreenBackground.Provider value="surface">
        <AdminScreen header={header} testID="machine-details-screen">
          <View style={styles.card}>
            {heading}
            {content}
          </View>
        </AdminScreen>
        <MachineFormModal
          visible={editorOpen}
          machine={machine}
          onClose={closeEditor}
        />
      </AdminScreenBackground.Provider>
    );
  }

  return (
    <AdminScreen header={header} fixed testID="machine-details-screen">
      <N1Card radius="sm" style={[styles.card, styles.fixedCard]}>
        {heading}
        <KeyboardScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          testID="machine-details-scroll"
        >
          {content}
        </KeyboardScrollView>
      </N1Card>
    </AdminScreen>
  );
}
