import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/** Whether the Connectors panel is open.
 *
 *  It used to be local to the composer, which owned the only way in. The analysis
 *  conditions form now has one too — its Data type field lists connected connectors, so
 *  it offers a way back to manage them — and the form renders in the thread, nowhere
 *  near the composer.
 */
interface ConnectorsPanelState {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

export const useConnectorsPanelStore = create<ConnectorsPanelState>()(
  devtools(
    (set) => ({
      isOpen: false,
      open: () => set({ isOpen: true }, false, 'open'),
      close: () => set({ isOpen: false }, false, 'close'),
    }),
    { name: 'ConnectorsPanel' }
  )
);
