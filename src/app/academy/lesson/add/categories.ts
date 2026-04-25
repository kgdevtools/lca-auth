'use server'

import { getAllCategories } from '@/repositories/lesson/lessonRepository'

export async function fetchCategories() {
  return getAllCategories()
}
