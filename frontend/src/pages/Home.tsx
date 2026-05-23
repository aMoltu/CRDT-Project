import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const demos = [
  { label: 'G-Counter',      local: '/gcounter',        online: '/gcounter-online' },
  { label: 'G-Set Canvas',   local: '/gset',             online: '/gset-online'     },
  { label: 'RGA Text Editor',local: '/rga',              online: '/rga-online'      },
] as const

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">CRDT Demo</h1>
        <p className="text-muted-foreground text-lg mt-2">Explore conflict-free replicated data types</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium mb-1 px-1">
          <span />
          <span className="text-center">Local</span>
          <span className="text-center">Online</span>
        </div>
        {demos.map(({ label, local, online }) => (
          <div key={label} className="grid grid-cols-3 items-center gap-2">
            <span className="text-sm font-medium">{label}</span>
            <Button variant="outline" size="sm" onClick={() => navigate(local)}>Demo</Button>
            <Button variant="outline" size="sm" onClick={() => navigate(online)}>Demo</Button>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground max-w-xs text-center">
        Online demos show your own replica. Multiplayer sync requires a WebSocket server.
      </p>
    </div>
  )
}
