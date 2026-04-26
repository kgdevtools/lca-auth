import { Suspense } from 'react'
import LessonBuilderClient from './LessonBuilderClient'

export const metadata = { title: 'Create Lesson - LCA Academy' }

export default function AddLessonPage() {
  return (
    <Suspense>
      <LessonBuilderClient mode="create" />
    </Suspense>
  )
}
