import { Button } from '@/components/ui/button'
import type { ConnectionHandle, ConnectionStatus } from '@/lib/room'

const DOT: Record<ConnectionStatus, string> = {
  offline:     'bg-gray-400',
  connecting:  'bg-yellow-400 animate-pulse',
  connected:   'bg-green-500',
  partitioned: 'bg-amber-500',
}

const LABEL: Record<ConnectionStatus, string> = {
  offline:     'No server',
  connecting:  'Connecting…',
  connected:   'Connected',
  partitioned: 'Partitioned',
}

interface Props { connection: ConnectionHandle }

export function ConnectionBar({ connection }: Props) {
  const { status, disconnect, reconnect } = connection

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm w-full max-w-2xl">
      <span className={`inline-block h-2 w-2 rounded-full ${DOT[status]}`} />
      <span className={status === 'partitioned' ? 'text-amber-500' : 'text-muted-foreground'}>
        {LABEL[status]}
      </span>
      <div className="ml-auto">
        {status === 'connected' && (
          <Button size="sm" variant="outline" onClick={disconnect} className="h-7 px-3 text-xs">
            Disconnect
          </Button>
        )}
        {status === 'partitioned' && (
          <Button size="sm" variant="outline" onClick={reconnect}
            className="h-7 px-3 text-xs border-amber-500 text-amber-500 hover:bg-amber-500/10">
            Reconnect
          </Button>
        )}
      </div>
    </div>
  )
}
