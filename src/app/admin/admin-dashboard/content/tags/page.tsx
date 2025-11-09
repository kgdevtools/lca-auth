import { getAllTags } from '@/services/blogEnhancementService'
import TagsClient from '@/components/admin/TagsClient'

export default async function TagsPage() {
  const tags = await getAllTags()

  return <TagsClient initialTags={tags} />
}
