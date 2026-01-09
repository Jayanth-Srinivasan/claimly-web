'use server'

import {
  getQuestionnaires,
  createQuestionnaire,
  updateQuestionnaire,
  deleteQuestionnaire,
  toggleQuestionnaireActive,
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '@/lib/supabase/questionnaires'
import type {
  QuestionnaireInsert,
  QuestionnaireUpdate,
  QuestionInsert,
  QuestionUpdate,
} from '@/types/policies'
import { revalidatePath } from 'next/cache'

// ========== Questionnaire Actions ==========

export async function fetchQuestionnaires() {
  return await getQuestionnaires()
}

export async function addQuestionnaire(questionnaire: QuestionnaireInsert) {
  const newQuestionnaire = await createQuestionnaire(questionnaire)
  revalidatePath('/admin/rules')
  return newQuestionnaire
}

export async function editQuestionnaire(id: string, updates: QuestionnaireUpdate) {
  const updated = await updateQuestionnaire(id, updates)
  revalidatePath('/admin/rules')
  return updated
}

export async function removeQuestionnaire(id: string) {
  await deleteQuestionnaire(id)
  revalidatePath('/admin/rules')
}

export async function toggleQuestionnaire(id: string, isActive: boolean) {
  const updated = await toggleQuestionnaireActive(id, isActive)
  revalidatePath('/admin/rules')
  return updated
}

// ========== Question Actions ==========

export async function fetchQuestions(questionnaireId: string) {
  return await getQuestions(questionnaireId)
}

export async function addQuestion(question: QuestionInsert) {
  const newQuestion = await createQuestion(question)
  revalidatePath('/admin/rules')
  return newQuestion
}

export async function editQuestion(id: string, updates: QuestionUpdate) {
  const updated = await updateQuestion(id, updates)
  revalidatePath('/admin/rules')
  return updated
}

export async function removeQuestion(id: string) {
  await deleteQuestion(id)
  revalidatePath('/admin/rules')
}

export async function updateQuestionOrder(questions: { id: string; order_index: number }[]) {
  await reorderQuestions(questions)
  revalidatePath('/admin/rules')
}
