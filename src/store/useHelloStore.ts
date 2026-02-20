import { create } from 'zustand'

type HelloState = {
  visits: number
  increment: () => void
  reset: () => void
}

export const useHelloStore = create<HelloState>((set) => ({
  visits: 0,
  increment: () => set((state) => ({ visits: state.visits + 1 })),
  reset: () => set({ visits: 0 }),
}))
