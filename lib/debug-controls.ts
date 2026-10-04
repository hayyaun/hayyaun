/** Leva calls onChange during initialization and programmatic synchronization too. */
export function onPanelChange<T>(update: (value: T) => void) {
  return (value: T, _path: string, context: { fromPanel: boolean }) => {
    if (context.fromPanel) update(value);
  };
}
