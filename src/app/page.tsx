import 'server-only'
import HomeContainer from '../components/Home'
import { init } from '@jamsocket/javascript/server'

const WHITEBOARD_NAME = 'openai-assistant-demo/default'
const OPENAI_API_KEY = '[YOUR OPENAI_API_KEY HERE]'

const spawnBackend = init({
  account: 'felicia',
  service: 'openai-assistant-demo',
  // NOTE: we want to keep the Jamsocket token secret, so we can only do this in a server component
  // We'll leave this blank for now, since we don't need it when developing with the dev CLI
  token: '',
  apiUrl: 'http://localhost:8080',
})

export default async function Page() {
  const spawnResult = await spawnBackend({
    lock: WHITEBOARD_NAME,
    env: { OPENAI_API_KEY },
  })
  return <HomeContainer spawnResult={spawnResult} />
}
