'use client'
import { useState } from 'react'
import { useSend } from '@jamsocket/javascript/react'

interface ChatProps {
  canAcceptMessages: boolean
}
export default function Chat(props: ChatProps) {
  const { canAcceptMessages } = props
  const [message, setMessage] = useState('')
  const sendEvent = useSend()
  return (
    <div className="my-4 w-1/2">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          sendEvent('create-message', message)
          setMessage('')
        }}
      >
        <input
          type="text"
          placeholder="Write a message..."
          className={`${canAcceptMessages ? "cursor-default" : "cursor-not-allowed"} w-full px-4 py-2 bg-gray-600 caret-neutral-200 text-white text-sm rounded-lg`}
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
