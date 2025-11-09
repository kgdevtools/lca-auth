import { getAllCategories } from '@/services/blogEnhancementService'
import CategoriesClient from '@/components/admin/CategoriesClient'

export default async function CategoriesPage() {
  const categories = await getAllCategories()

  return <CategoriesClient initialCategories={categories} />
}
