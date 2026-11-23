import { DEV_ACCOUNTS, type DevAccount, devLoginEnabled } from '@/lib/devLogin'
import { DevLoginButtons } from './DevLoginButtons'

/** Under the login form, development only: one-click logins as the test accounts. */
export const DevLogin = () => {
  if (!devLoginEnabled(process.env)) return null
  const accounts = (Object.keys(DEV_ACCOUNTS) as DevAccount[]).map((who) => ({ who, label: DEV_ACCOUNTS[who].label }))
  return <DevLoginButtons accounts={accounts} />
}
