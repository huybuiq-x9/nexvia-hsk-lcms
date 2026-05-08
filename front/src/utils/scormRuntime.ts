export interface ScormRuntimeEvent {
  method: string;
  arguments: unknown[];
  result: unknown;
  data: Record<string, string>;
  timestamp: string;
}

export interface ScormRuntimeSnapshot {
  initialized: boolean;
  data: Record<string, string>;
  events: ScormRuntimeEvent[];
}

interface RawScormRuntimeMessage {
  source?: string;
  method?: string;
  arguments?: unknown[];
  result?: unknown;
  data?: Record<string, string>;
}

const emptySnapshot = (): ScormRuntimeSnapshot => ({
  initialized: false,
  data: {},
  events: [],
});

export function createScormPreviewRuntime(
  onChange?: (snapshot: ScormRuntimeSnapshot) => void,
) {
  let snapshot = emptySnapshot();

  const emit = () => {
    onChange?.({
      initialized: snapshot.initialized,
      data: { ...snapshot.data },
      events: [...snapshot.events],
    });
  };

  const onMessage = (event: MessageEvent<RawScormRuntimeMessage>) => {
    const message = event.data;
    if (!message || message.source !== 'nexedu-scorm-preview' || !message.method) {
      return;
    }

    const runtimeEvent: ScormRuntimeEvent = {
      method: message.method,
      arguments: Array.from(message.arguments ?? []),
      result: message.result,
      data: message.data ?? {},
      timestamp: new Date().toISOString(),
    };

    snapshot = {
      initialized: message.method === 'Initialize'
        ? true
        : message.method === 'Terminate'
          ? false
          : snapshot.initialized,
      data: message.data ?? snapshot.data,
      events: [...snapshot.events.slice(-49), runtimeEvent],
    };
    emit();
  };

  window.addEventListener('message', onMessage);

  return {
    reset() {
      snapshot = emptySnapshot();
      emit();
    },
    getSnapshot() {
      return snapshot;
    },
    dispose() {
      window.removeEventListener('message', onMessage);
    },
  };
}
