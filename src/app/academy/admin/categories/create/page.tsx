import { checkCoachRole } from '@/utils/auth/academyAuth'
import CategoryForm from '@/components/academy/admin/CategoryForm'
import { FolderTree } from 'lucide-react'

export default async function CreateCategoryPage() {
  await checkCoachRole()

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <FolderTree className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Create Category
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Create a new category to organize your lessons
        </p>
      </div>

      <CategoryForm />
    </div>
  )
}
