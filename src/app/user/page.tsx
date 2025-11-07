import { redirect } from 'next/navigation'

export default function UserPage() {
  // Redirect to overview page
  redirect('/user/overview')
}