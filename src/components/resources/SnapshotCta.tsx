import Link from 'next/link'

/** The call to action every Resource Hub page ends with. */
export function SnapshotCta() {
  return (
    <aside className="mt-12 rounded-lg border border-primary/30 bg-primary/5 p-6">
      <h2 className="text-lg font-semibold text-dark">Does AI search cite your business?</h2>
      <p className="mt-2 text-sm text-dark">
        Get a free snapshot: 20 real buyer questions for your service and area, which ones cite your website, and
        which sites get cited instead.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
      >
        Get your free snapshot
      </Link>
    </aside>
  )
}
