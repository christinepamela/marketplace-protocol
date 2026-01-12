import ProviderHeader from '@/components/layout/ProviderHeader'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-warm-white">
      <ProviderHeader />
      {children}
    </div>
  )
}