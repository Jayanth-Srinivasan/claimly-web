import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { QuestioningState } from '@/types/adaptive-questions'

interface QuestioningStore {
  // State for each claim (keyed by claim_id)
  claimStates: Record<string, QuestioningState>

  // Actions
  initializeState: (claimId: string, coverageTypeIds: string[]) => void
  updateState: (claimId: string, state: Partial<QuestioningState>) => void
  addAskedQuestion: (claimId: string, questionId: string) => void
  addConversationTurn: (claimId: string, role: 'user' | 'assistant', content: string) => void
  getState: (claimId: string) => QuestioningState | undefined
  clearState: (claimId: string) => void
}

export const useQuestioningStore = create<QuestioningStore>()(
  persist(
    (set, get) => ({
      claimStates: {},

      initializeState: (claimId: string, coverageTypeIds: string[]) => {
        const existing = get().claimStates[claimId]
        if (existing) {
          // Already initialized, don't overwrite
          return
        }

        set((state) => ({
          claimStates: {
            ...state.claimStates,
            [claimId]: {
              claim_id: claimId,
              coverage_type_ids: coverageTypeIds,
              extracted_info: [],
              missing_required_fields: [],
              conversation_history: [],
              database_questions_asked: [],
            },
          },
        }))
      },

      updateState: (claimId: string, updates: Partial<QuestioningState>) => {
        set((state) => ({
          claimStates: {
            ...state.claimStates,
            [claimId]: {
              ...state.claimStates[claimId],
              ...updates,
            },
          },
        }))
      },

      addAskedQuestion: (claimId: string, questionId: string) => {
        set((state) => {
          const claimState = state.claimStates[claimId]
          if (!claimState) return state

          return {
            claimStates: {
              ...state.claimStates,
              [claimId]: {
                ...claimState,
                database_questions_asked: [
                  ...claimState.database_questions_asked,
                  questionId,
                ],
              },
            },
          }
        })
      },

      addConversationTurn: (claimId: string, role: 'user' | 'assistant', content: string) => {
        set((state) => {
          const claimState = state.claimStates[claimId]
          if (!claimState) return state

          return {
            claimStates: {
              ...state.claimStates,
              [claimId]: {
                ...claimState,
                conversation_history: [
                  ...claimState.conversation_history,
                  {
                    role,
                    content,
                    timestamp: new Date().toISOString(),
                  },
                ],
              },
            },
          }
        })
      },

      getState: (claimId: string) => {
        return get().claimStates[claimId]
      },

      clearState: (claimId: string) => {
        set((state) => {
          const newStates = { ...state.claimStates }
          delete newStates[claimId]
          return { claimStates: newStates }
        })
      },
    }),
    {
      name: 'questioning-storage', // sessionStorage key
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name)
          return str ? JSON.parse(str) : null
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => {
          sessionStorage.removeItem(name)
        },
      },
    }
  )
)
