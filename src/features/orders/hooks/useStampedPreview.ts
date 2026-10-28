import { useEffect, useState } from 'react';
import type { Attachment, RequestStatus } from '../../../shared/types';
import { stampedPreview, type StampedPreview } from '../drawingStamp';

type State = { status: RequestStatus; preview: StampedPreview | null };

const IDLE: State = { status: 'idle', preview: null };

/**
 * The drawing stamped with the order QR, drawn as page images, while `doc`
 * is set. `failed` when the file can't be stamped (DWG, STEP, download
 * error): it prints as a details sheet instead.
 */
export function useStampedPreview(
  doc: Attachment | undefined,
  qrValue: string,
  company: string,
): State {
  const [state, setState] = useState<State>(IDLE);
  useEffect(() => {
    if (!doc) {
      setState(IDLE);
      return;
    }
    let current = true;
    setState({ status: 'loading', preview: null });
    stampedPreview(doc, qrValue, company)
      .catch(() => null)
      .then(
        preview =>
          current &&
          setState({ status: preview ? 'succeeded' : 'failed', preview }),
      );
    return () => {
      current = false;
    };
  }, [doc, qrValue, company]);
  return state;
}
