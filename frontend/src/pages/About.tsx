import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const types = [
  {
    name: 'G-Counter',
    route: '/gcounter',
    summary: 'A grow-only distributed counter.',
    explanation:
      'Each node owns one slot in a vector. A node can only increment its own slot — never another node\'s. The total counter value is the sum of all slots. Merging two replicas takes the element-wise maximum of their vectors, so increments from any node are always preserved and never overwritten.',
  },
  {
    name: 'G-Set',
    route: '/gset',
    summary: 'A grow-only set that never loses elements.',
    explanation:
      'Any node can add elements to its local copy, but elements can never be removed. Merging two replicas is simply set union — trivially commutative, associative, and idempotent. Because you can only ever add, there is nothing to conflict on. G-Set is a core building block: more complex CRDTs (like 2P-Set and OR-Set) build on it.',
  },
  {
    name: 'RGA Text Editor',
    route: '/rga',
    summary: 'A sequence CRDT for collaborative text editing.',
    explanation:
      'Every character is stamped with a unique ID (node ID + sequence number) and a Lamport clock value. When two nodes insert characters at the same position concurrently, the Lamport clock breaks the tie deterministically so both nodes agree on the final order. Deletions leave invisible tombstone markers so remote references to those characters remain valid during merge.',
  },
]

export default function About() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" onClick={() => navigate('/')}>← Back</Button>
        <h1 className="text-2xl font-bold">What is a CRDT?</h1>
        <div className="w-16" />
      </div>

      <div className="flex flex-col gap-5 text-sm leading-relaxed text-left w-full">

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">The problem</h2>
          <p className="text-muted-foreground">
            In a distributed system, multiple nodes often need to write to shared data at the
            same time — without waiting for a central coordinator. If you let every node modify
            its local copy freely and then try to merge later, you risk conflicts: two nodes
            deleted the same item, incremented the same counter by different amounts, or inserted
            text at the same spot.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">What a CRDT is</h2>
          <p className="text-muted-foreground">
            A <span className="font-medium text-foreground">Conflict-free Replicated Data Type (CRDT)</span> is
            a data structure designed so that any two replicas can always be merged into the same
            result, regardless of the order updates arrived or how long the nodes were out of sync.
            No locking, no consensus round, no manual conflict resolution required.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">How merging stays conflict-free</h2>
          <p className="text-muted-foreground">
            The merge function must satisfy three mathematical properties:
          </p>
          <ul className="flex flex-col gap-1 text-muted-foreground pl-4">
            <li><span className="font-medium text-foreground">Commutative</span> — merge(A, B) = merge(B, A). It doesn't matter which replica you start from.</li>
            <li><span className="font-medium text-foreground">Associative</span> — merge(merge(A, B), C) = merge(A, merge(B, C)). Grouping doesn't matter.</li>
            <li><span className="font-medium text-foreground">Idempotent</span> — merge(A, A) = A. Applying the same update twice is harmless.</li>
          </ul>
          <p className="text-muted-foreground">
            Together these guarantee that once every node has seen every update — no matter what
            order they arrived — all replicas hold exactly the same state.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">Real-world uses</h2>
          <p className="text-muted-foreground">
            CRDTs are used in collaborative editors (like Google Docs and Figma), distributed
            databases (Riak, Redis, Cassandra), offline-first mobile apps, and peer-to-peer
            systems. Any time you need multiple parties to write concurrently and converge later,
            CRDTs are a natural fit.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold text-foreground">Types in this demo</h2>
          <div className="flex flex-col gap-3">
            {types.map(({ name, route, summary, explanation }) => (
              <Card key={name}>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{name}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => navigate(route)}>
                      Try it →
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{summary}</p>
                </CardHeader>
                <CardContent className="pb-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
