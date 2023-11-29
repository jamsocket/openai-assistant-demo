import { Server, type Socket } from 'socket.io'
import type { Shape } from '../types'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: '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' })

const assistant = await openai.beta.assistants.create({
  instructions:
    'You are a bot that draws rectangles on a whiteboard. You will receive instructions for where to draw the rectangle and how large a rectangle to draw. Use the function createShape to draw a rectangle on the whiteboard. Note that [0, 0] is in the middle of the screen.',
  model: 'gpt-4-1106-preview',
  tools: [
    {
      type: 'function',
      function: {
        name: 'createShape',
        description: 'Create a rectangle in a whiteboard',
        parameters: {
          type: 'object',
          properties: {
            x: { type: 'number', description: 'x position' },
            y: { type: 'number', description: 'y position' },
            w: { type: 'number', description: 'width of rectangle' },
            h: { type: 'number', description: 'height of rectangle' },
            color: {
              type: 'string',
              description: "hsl(_, _%, _%) if a color isn't specified, just use black.",
            },
          },
          required: ['x', 'y', 'w', 'h'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'editExistingShape',
        description:
          'Updates the properties for a shape given its id. For example, if the shape array looks like this [{id: 1234, x: 0, y: 0, color: `hsl(0, 0%, 0%)`}] and my user request is to move this shape to the left, I should return {id: 1234, x: -10}',
        parameters: {
          type: 'object',
          properties: {
            id: { type: 'number', description: 'the id of the existing shape to edit' },
            x: { type: 'number', description: 'x position' },
            y: { type: 'number', description: 'y position' },
            w: { type: 'number', description: 'width of rectangle' },
            h: { type: 'number', description: 'height of rectangle' },
            color: {
              type: 'string',
              description: "hsl(_, _%, _%) if a color isn't specified, just use black.",
            },
          },
          required: ['id'],
        },
      },
    },
  ],
})

// Return the id for a shape whose parameters need to edited

// updates the properties for a shape given its id

const thread = await openai.beta.threads.create()

async function pollRun(runid: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('in poll run')
    let runResult: OpenAI.Beta.Threads.Runs.Run | undefined

    const functions: Record<string, (toolOutput: any) => void> = {
      createShape(toolOutput: any) {
        const id = Math.floor(Math.random() * 100000)
        if (!Number.isFinite(toolOutput?.x) || !Number.isFinite(toolOutput?.y) || !Number.isFinite(toolOutput?.w) || !Number.isFinite(toolOutput?.h)) {
          throw new Error('required params were not given')
        }
        const generatedShape: Shape = {
          x: toolOutput.x,
          y: toolOutput.y,
          w: toolOutput.w,
          h: toolOutput.h,
          color: toolOutput?.color ?? `hsl(0, 0%, 0%)`,
          id: id,
        }
        console.log('generatedShape', generatedShape)
        shapes.push(generatedShape)

        console.log('shapes', shapes)
      },
      editExistingShape(toolOutput: any) {
        console.log('in existing shape')
        console.log(toolOutput)

        let editShape = shapes.find((shape) => shape.id === toolOutput.id)
        if (!editShape) {
          throw new Error('could not find shape')
        }
        editShape.x = toolOutput?.x ?? editShape.x
        editShape.y = toolOutput?.y ?? editShape.y
        editShape.w = toolOutput?.w ?? editShape.w
        editShape.h = toolOutput?.h ?? editShape.h
        editShape.color = toolOutput?.color ?? editShape.color
      },
    }

    async function getRun() {
      try {
        runResult = await openai.beta.threads.runs.retrieve(thread.id, runid)
        // console.log('STATUS', runResult.status)
        const acceptedStatus = ['in_progress', 'queued', 'requires_action']
        while (acceptedStatus.includes(runResult?.status)) {
          if (runResult?.status === 'in_progress' || runResult?.status === 'queued') {
            console.log('in progress')
            await sleep(1000)
            runResult = await openai.beta.threads.runs.retrieve(thread.id, runid)
            continue
          }

          console.log('in required action')
          // console.log('output', runResult?.required_action?.submit_tool_outputs.tool_calls.length)
          // console.log('first output', runResult?.required_action?.submit_tool_outputs.tool_calls[0])

          let toolOutputs: OpenAI.Beta.Threads.Runs.RunSubmitToolOutputsParams.ToolOutput[] = []
          runResult?.required_action?.submit_tool_outputs.tool_calls.forEach((call) => {
            const jsonObject = JSON.parse(call.function.arguments)
            const fn = functions[call.function.name]
            if (!fn) {
              console.error('couldnt find function')
              console.log("output that was sent to openai: error: couldnt find function")
              console.log("function that open ai told us to call:", call.function.name)
              console.log("arguments", jsonObject)
              toolOutputs.push({
                tool_call_id: call.id ?? '',
                output: 'error: couldnt find function',
              })
              return
            }

            let output = 'success'
            try {
              fn(jsonObject)
            } catch (err) {
              if (err instanceof Error) {
                output = err.toString()
              } else {
                output = 'unknown error occured'
              }
            }
            console.log("output that was sent to openai", output)
            console.log("function that open ai told us to call:", call.function.name)
            console.log("arguments", jsonObject)
            toolOutputs.push({
              tool_call_id: call.id ?? '',
              output: `${output}`,
            })
          })

          runResult = await openai.beta.threads.runs.submitToolOutputs(thread.id, runid, {
            tool_outputs: toolOutputs,
          })
          // console.log('changed run result after submitting tool function')
          // console.log(runResult)
        }
        console.log('run completed')
        // console.log(runResult) // Log the result if not in progress
        resolve()
      } catch (error) {
        console.error('Error retrieving the run:', error)
        reject()
      }
    }

    getRun() // Initial call to start the polling process
  })
}

const io = new Server(8080, { cors: { origin: '*' } })

let shapes: Shape[] = []
console.log(shapes)
const users: Set<{ id: string; socket: Socket }> = new Set()
io.on('connection', async (socket: Socket) => {
  console.log('New user connected:', socket.id)
  socket.emit('snapshot', shapes)
  const newUser = { id: socket.id, socket }
  users.add(newUser)

  // send all existing users a 'user-entered' event for the new user
  socket.broadcast.emit('user-entered', newUser.id)

  // send the new user a 'user-entered' event for each existing user
  for (const user of users) {
    newUser.socket.emit('user-entered', user.id)
  }

  socket.on('cursor-position', ({ x, y }) => {
    socket.volatile.broadcast.emit('cursor-position', { id: socket.id, cursorX: x, cursorY: y })
  })

  socket.on('create-message', async (message) => {
    let messageWithContext = ''
    messageWithContext += 'This is the user request: '
    messageWithContext += message
    messageWithContext += ' '
    messageWithContext += 'Here are the existing shapes in the whiteboard: '
    messageWithContext += JSON.stringify(shapes)
    messageWithContext += ' The y axis goes from negative (top) to positive (bottom). The x axis goes from negative (left) to positive (right).'
    console.log('messageWithContext', messageWithContext)
    const messageAttempt = await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
    })
    console.log(messageAttempt)
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
    })

    await pollRun(run.id)
    console.log('after poll run', shapes)
    socket.emit('snapshot', shapes)
  })

  socket.on('create-shape', async (shape) => {
    shapes.push(shape)
    socket.broadcast.emit('snapshot', shapes)
  })

  socket.on('update-shape', (updatedShape) => {
    const shape = shapes.find((s) => s.id === updatedShape.id)
    if (!shape) return
    shape.x = updatedShape.x
    shape.y = updatedShape.y
    shape.w = updatedShape.w
    shape.h = updatedShape.h
    socket.broadcast.emit('update-shape', shape)
  })

  socket.on('disconnect', () => {
    users.delete(newUser)
    socket.broadcast.emit('user-exited', newUser.id)
  })
})

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms)
  })
}
