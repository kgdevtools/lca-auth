import AcademyLayoutClient from './AcademyLayoutClient'

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AcademyLayoutClient>{children}</AcademyLayoutClient>
}