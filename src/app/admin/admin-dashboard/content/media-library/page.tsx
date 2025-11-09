import { getAllMedia } from '@/services/blogEnhancementService'
import MediaLibraryClient from '@/components/admin/MediaLibraryClient'

export default async function MediaLibraryPage() {
  const media = await getAllMedia()

  return <MediaLibraryClient initialMedia={media} />
}
