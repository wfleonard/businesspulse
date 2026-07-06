import { requireOrg } from '@/lib/org'
import { AskBox } from '@/components/ask/AskBox'
import { aiConfigured } from '@/lib/ai/model'
import { Card } from '@/components/ui/Card'

export const metadata = { title: 'Ask — BusinessPulse' }

export default async function AskPage() {
  await requireOrg()
  const configured = aiConfigured()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark">Ask</h1>
        <p className="mt-1 text-text-secondary">
          Plain-English answers grounded in your metrics — every answer links back to the
          numbers behind it.
        </p>
      </div>

      {!configured && (
        <Card className="border-primary/30 bg-primary/5">
          <p className="text-sm text-dark">
            The AI assistant isn’t configured yet. Set <code>ANTHROPIC_API_KEY</code> in your
            environment to enable grounded answers.
          </p>
        </Card>
      )}

      <AskBox />
    </div>
  )
}
