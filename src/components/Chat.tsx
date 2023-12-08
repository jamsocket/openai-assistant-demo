'use client'
import { useState } from 'react'
import { useSend } from '@jamsocket/javascript/react'
export default function Chat() {
  const [message, setMessage] = useState('')
  const sendEvent = useSend()
  return (
    <div className="m-4 w-1/2">
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
          className="w-full px-4 py-2 bg-gray-600 caret-neutral-200 text-white text-sm rounded-lg"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
          }}
        />
      </form>
    </div>
  )
}
