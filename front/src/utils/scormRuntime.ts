import * as Scorm2004Module from 'scorm-again/scorm2004';
import type Scorm2004APIDefault from 'scorm-again/scorm2004';

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

const emptySnapshot = (): ScormRuntimeSnapshot => ({
  initialized: false,
  data: {},
  events: [],
});

type ScormAgainAPI = InstanceType<typeof Scorm2004API>;

const Scorm2004API = (
  Scorm2004Module as unknown as {
    Scorm2004API: typeof Scorm2004APIDefault;
  }
).Scorm2004API;

const runtimeWindow = window as Window & {
  API?: ScormAgainAPI;
  API_1484_11?: ScormAgainAPI;
};

const toStringRecord = (data: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value == null
        ? ''
        : typeof value === 'string'
          ? value
          : JSON.stringify(value) ?? String(value),
    ]),
  );

const runtimeSettings = {
  autocommit: false,
  lmsCommitUrl: false,
  logLevel: 'ERROR' as const,
  renderCommonCommitFields: true,
};

export function createScormPreviewRuntime(
  onChange?: (snapshot: ScormRuntimeSnapshot) => void,
) {
  let snapshot = emptySnapshot();
  let api: ScormAgainAPI;
  let listeners: Array<{ eventName: string; listener: (...args: unknown[]) => void }> = [];

  const emit = () => {
    onChange?.({
      initialized: snapshot.initialized,
      data: { ...snapshot.data },
      events: [...snapshot.events],
    });
  };

  const recordEvent = (method: string, args: unknown[] = [], result?: unknown) => {
    const data = toStringRecord(api.getFlattenedCMI() as Record<string, unknown>);
    const runtimeEvent: ScormRuntimeEvent = {
      method,
      arguments: args,
      result: result ?? api.lastErrorCode,
      data,
      timestamp: new Date().toISOString(),
    };

    snapshot = {
      initialized: api.isInitialized() && !api.isTerminated(),
      data,
      events: [...snapshot.events.slice(-49), runtimeEvent],
    };
    emit();
  };

  const coreEvents = [
    'Initialize',
    'Terminate',
    'GetValue',
    'SetValue',
    'Commit',
    'GetLastError',
    'GetErrorString',
    'GetDiagnostic',
    'SequenceNext',
    'SequencePrevious',
    'SequenceChoice',
    'SequenceJump',
    'SequenceExit',
    'SequenceExitAll',
    'SequenceAbandon',
    'SequenceAbandonAll',
    'SequenceRetry',
    'SequenceRetryAll',
    'ActivityDelivered',
    'SequencingComplete',
    'SequencingError',
  ];

  const disposeRuntime = () => {
    listeners.forEach(({ eventName, listener }) => api.off(eventName, listener));
    listeners = [];
    if (runtimeWindow.API_1484_11 === api) {
      delete runtimeWindow.API_1484_11;
    }
    if (runtimeWindow.API === api) {
      delete runtimeWindow.API;
    }
  };

  const initializeRuntime = () => {
    api = new Scorm2004API(runtimeSettings);
    runtimeWindow.API_1484_11 = api;
    runtimeWindow.API = api;
    listeners = coreEvents.map((eventName) => {
      const listener = (...args: unknown[]) => recordEvent(eventName, args);
      api.on(eventName, listener);
      return { eventName, listener };
    });
  };

  initializeRuntime();
  emit();

  return {
    reset() {
      disposeRuntime();
      initializeRuntime();
      snapshot = emptySnapshot();
      emit();
    },
    getSnapshot() {
      return snapshot;
    },
    dispose() {
      disposeRuntime();
    },
  };
}
