import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6">
      <h1 className="text-4xl font-bold tracking-tight">CRDT Demo</h1>
      <p className="text-muted-foreground text-lg">Explore conflict-free replicated data types</p>
      <Button size="lg" onClick={() => navigate('/gcounter')}>
        G-Counter Demo
      </Button>
    </div>
  )
}
