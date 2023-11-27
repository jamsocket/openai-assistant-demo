'use client'
import { useState } from 'react'
import { useSend } from '@jamsocket/javascript/react'
export default function Chat() {
  const [message, setMessage] = useState('')
  const sendEvent = useSend()
  return (
    <div className="p-6 bg-white">
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          sendEvent('create-message', message)
          setMessage('')
        }}
      >
        <input
          type="text"
          placeholder="Type your message..."
          className="w-full p-4 bg-neutral-700 caret-neutral-200 text-white"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
          }}
        />
      </form>
    </div>
  )
}
