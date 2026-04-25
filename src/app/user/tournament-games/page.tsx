import { redirect } from 'next/navigation'

// Tournament games have been merged into /user/tournaments
export default function TournamentGamesRedirect() {
  redirect('/user/tournaments')
}
