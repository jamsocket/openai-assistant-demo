import 'server-only'
import HomeContainer from '../components/Home'
import { init } from '@jamsocket/javascript/server'

const WHITEBOARD_NAME = 'openai-assistant-demo/default'
const OPENAI_API_KEY = '[YOUR OPENAI_API_KEY HERE]'

const spawnBackend = init({ dev: true })

export default async function Page() {
  const spawnResult = await spawnBackend({
    lock: WHITEBOARD_NAME,
    env: { OPENAI_API_KEY },
  })
  return <HomeContainer spawnResult={spawnResult} />
}
