import type { Attachment } from '../../../shared/types';
import {
  formValuesToOrderInput,
  orderToFormValues,
} from '../components/orderForm';
import { DRAWING_KIND } from '../constants';
import {
  drawingsToOrderFiles,
  orderDrawings,
  orderOtherDocuments,
} from '../drawings';
import { MOCK_ORDERS } from '../api/mockData';

const file = (id: string, kind?: string): Attachment => ({
  id,
  name: `${id}.pdf`,
  kind,
  sizeBytes: 1024,
});

const po = file('po', 'Purchase order');
const notes = file('notes', 'Project notes');

test('the design file comes first, then drawings kept among the documents', () => {
  const order = {
    designFile: file('main', DRAWING_KIND),
    documents: [po, file('sheet-2', DRAWING_KIND), notes],
  };
  expect(orderDrawings(order).map(d => d.id)).toEqual(['main', 'sheet-2']);
  expect(orderOtherDocuments(order)).toEqual([po, notes]);
});

test('no design file: no drawings', () => {
  expect(orderDrawings({ designFile: null, documents: [po] })).toEqual([]);
});

test('drawings go back as the design file plus marked documents', () => {
  expect(drawingsToOrderFiles([file('a'), file('b'), file('c')], [po])).toEqual(
    {
      designFile: file('a'),
      documents: [po, file('b', DRAWING_KIND), file('c', DRAWING_KIND)],
    },
  );
  expect(drawingsToOrderFiles([], [po])).toEqual({
    designFile: null,
    documents: [po],
  });
});

test('the form edits every drawing and keeps the other documents', () => {
  const [seed] = MOCK_ORDERS;
  const order = {
    ...seed,
    documents: [po, file('sheet-2', DRAWING_KIND), notes],
  };
  const values = orderToFormValues(order);
  expect(values.designFiles.map(d => d.id)).toEqual([
    seed.designFile?.id,
    'sheet-2',
  ]);
  expect(values.purchaseOrder).toEqual(po);

  // Add a third drawing, drop the first.
  const input = formValuesToOrderInput(
    {
      ...values,
      designFiles: [...values.designFiles.slice(1), file('sheet-3')],
    },
    order,
  );
  expect(input.designFile?.id).toBe('sheet-2');
  expect(input.documents).toEqual([po, notes, file('sheet-3', DRAWING_KIND)]);
});
