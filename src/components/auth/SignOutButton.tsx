'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth-client'
import { Button } from '@/components/ui/Button'

export function SignOutButton() {
  const router = useRouter()
  return (
    <Button
      variant="ghost"
      className="px-2 py-1"
      onClick={async () => {
        await signOut()
        router.push('/login')
        router.refresh()
      }}
    >
      Sign out
    </Button>
  )
}
