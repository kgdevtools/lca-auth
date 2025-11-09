import { redirect } from 'next/navigation'

export default function ContentPage() {
  // Redirect to blog-posts by default
  redirect('/admin/admin-dashboard/content/blog-posts')
}
