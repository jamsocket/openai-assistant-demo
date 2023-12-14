'use client'
import { useEffect, useState } from 'react'
import { useSend } from '@jamsocket/javascript/react'

interface ChatProps {
  canAcceptMessages: boolean
}
export default function Chat(props: ChatProps) {
  const { canAcceptMessages } = props
  const [message, setMessage] = useState('')
  const [placeholder, setPlaceholder] = useState('Write a message...')
  const sendEvent = useSend()

  useEffect(() => {
    if (canAcceptMessages) {
      setPlaceholder('Write a message...')
    }
  }, [canAcceptMessages])

  return (
    <div className="my-4 w-1/2">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          sendEvent('handle-user-prompt', message)
          setPlaceholder(message)
          setMessage('')
        }}
      >
        <input
          type="text"
          placeholder={placeholder}
          className={`${
            canAcceptMessages ? 'cursor-default' : 'cursor-not-allowed'
          } w-full px-4 py-2 bg-gray-600 text-white caret-neutral-200 text-sm rounded-lg`}
          value={message}
          disabled={!canAcceptMessages}
          onChange={(e) => {
            setMessage(e.target.value)
          }}
        />
      </form>
    </div>
  )
}
