'use client'

import { useActionState, useMemo, useState } from 'react'
import { saveTemplateAction, sendFollowUpAction, type MailFormState } from '@/app/dashboard/email/actions'
import { merge, renderMail, unknownFields, MERGE_FIELDS, type Fields } from '@/lib/aeo/mail-format'

const inputClass =
  'w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/30'
const primaryButton =
  'rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50'
const secondaryButton =
  'rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-dark hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'

function Status({ state }: { state: MailFormState }) {
  if (state.message) return <p className="rounded-md bg-success/10 px-3 py-2 text-sm text-success">{state.message}</p>
  if (state.error) return <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>
  return null
}

type TemplateOption = { id: string; name: string; description: string; subject: string; body: string }

/** Pick a template, edit it for this lead, preview it, then send a test or the real thing. */
export function Composer({
  requestId,
  email,
  fields,
  templates,
}: {
  requestId: string
  email: string
  fields: Fields
  templates: TemplateOption[]
}) {
  const [state, action, pending] = useActionState<MailFormState, FormData>(sendFollowUpAction, {})
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? '')
  const start = templates.find((t) => t.id === templateId)
  const [subject, setSubject] = useState(start?.subject ?? '')
  const [body, setBody] = useState(start?.body ?? '')

  const merged = useMemo(() => {
    const s = merge(subject, fields)
    const b = merge(body, fields)
    const { html } = renderMail(b.text, { unsubscribeUrl: 'https://businesspulse.app/check/unsubscribe' })
    return { subject: s.text, html, missing: [...new Set([...s.missing, ...b.missing])] }
  }, [subject, body, fields])

  function pick(id: string) {
    const t = templates.find((x) => x.id === id)
    setTemplateId(id)
    setSubject(t?.subject ?? '')
    setBody(t?.body ?? '')
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="templateId" value={templateId} />

      <div>
        <label htmlFor="template" className="mb-1 block text-sm font-medium text-dark">
          Template
        </label>
        <select id="template" value={templateId} onChange={(e) => pick(e.target.value)} className={inputClass}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.description ? `: ${t.description}` : ''}
            </option>
          ))}
          <option value="">Blank email</option>
        </select>
        <p className="mt-1 text-xs text-text-secondary">
          Edits here apply to this email only. Change the template itself under Templates.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <label htmlFor="subject" className="mb-1 block text-sm font-medium text-dark">
              Subject
            </label>
            <input id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="body" className="mb-1 block text-sm font-medium text-dark">
              Body
            </label>
            <textarea
              id="body"
              name="body"
              rows={16}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${inputClass} font-mono text-[13px]`}
            />
            <p className="mt-1 text-xs text-text-secondary">
              Blank lines make paragraphs. **bold**, [link text](https://...), and lists starting with &quot;- &quot; work.
              The unsubscribe footer is added for you.
            </p>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-dark">Preview</p>
          <div className="rounded-md border border-border">
            <p className="border-b border-border bg-gray-50 px-3 py-2 text-sm text-dark">
              <span className="text-text-secondary">To:</span> {email}
              <br />
              <span className="text-text-secondary">Subject:</span> {merged.subject}
            </p>
            <iframe title="Email preview" srcDoc={merged.html} sandbox="" className="h-[420px] w-full bg-white" />
          </div>
        </div>
      </div>

      {merged.missing.length > 0 && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          No value for {merged.missing.map((m) => `@${m}`).join(', ')}. Fill it in by hand or remove it before sending.
        </p>
      )}
      <Status state={state} />

      <div className="flex flex-wrap gap-2">
        <button type="submit" name="mode" value="test" disabled={pending} className={secondaryButton}>
          Send me a test
        </button>
        <button
          type="submit"
          name="mode"
          value="send"
          disabled={pending || merged.missing.length > 0}
          className={primaryButton}
          onClick={(event) => {
            if (!window.confirm(`Send this email to ${email}?`)) event.preventDefault()
          }}
        >
          {pending ? 'Sending…' : `Send to ${email}`}
        </button>
      </div>
    </form>
  )
}

/** Create or edit a follow-up template. */
export function TemplateForm({
  template,
}: {
  template: { id: string; name: string; description: string; subject: string; body: string; isActive: boolean } | null
}) {
  const [state, action, pending] = useActionState<MailFormState, FormData>(saveTemplateAction, {})
  const [subject, setSubject] = useState(template?.subject ?? '')
  const [body, setBody] = useState(template?.body ?? '')
  const unknown = unknownFields(`${subject}\n${body}`)

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <input type="hidden" name="id" value={template?.id ?? ''} />
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium text-dark">
            Name
          </label>
          <input id="name" name="name" required maxLength={100} defaultValue={template?.name} className={inputClass} />
        </div>
        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-dark">
            When to send it <span className="font-normal text-text-secondary">(optional)</span>
          </label>
          <input id="description" name="description" maxLength={300} defaultValue={template?.description} className={inputClass} />
        </div>
        <div>
          <label htmlFor="subject" className="mb-1 block text-sm font-medium text-dark">
            Subject
          </label>
          <input id="subject" name="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="body" className="mb-1 block text-sm font-medium text-dark">
            Body
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={18}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${inputClass} font-mono text-[13px]`}
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-dark">
          <input type="checkbox" name="isActive" defaultChecked={template?.isActive ?? true} />
          Show in the template picker
        </label>
        {unknown.length > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No lead can fill {unknown.map((f) => `@${f}`).join(', ')}.
          </p>
        )}
        <Status state={state} />
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? 'Saving…' : 'Save template'}
        </button>
      </div>
      <aside className="text-sm">
        <p className="font-medium text-dark">Merge fields</p>
        <ul className="mt-2 space-y-1.5">
          {MERGE_FIELDS.map((f) => (
            <li key={f.name}>
              <code className="text-primary">@{f.name}</code>
              <span className="text-text-secondary"> {f.description}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-text-secondary">
          Use a link field as <code>[view your report](@report_url)</code>. There is no first name: the form doesn&apos;t
          ask for one, so open with &quot;Hi,&quot;.
        </p>
      </aside>
    </form>
  )
}
