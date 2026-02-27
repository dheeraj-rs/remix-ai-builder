import { useChatStore } from '../../stores/zustand';

export function ChatDescription() {
  return useChatStore((state) => state.description);
}
