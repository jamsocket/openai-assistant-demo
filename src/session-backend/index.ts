import { Server, type Socket } from 'socket.io'
import type { Shape } from '../types'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: "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"})

const assistant = await openai.beta.assistants.create({
  instructions: "You are a bot that draws rectangles on a whiteboard. You will receive instructions for where to draw the rectangle and how large a rectangle to draw. Use the function createShape to draw a rectangle on the whiteboard. Note that [0, 0] is in the middle of the screen.",
  model: "gpt-4-1106-preview",
  tools: [{
    "type": "function",
    "function": {
      "name": "createShape",
      "description": "Create a rectangle in a whiteboard",
      "parameters": {
        "type": "object",
        "properties": {
          "x": {"type": "number", "description": "x position"},
          "y": {"type": "number", "description": "y position"},
          "w": {"type": "number", "description": "width of rectangle"},
          "h": {"type": "number", "description": "height of rectangle"},
          "color": {"type": "string", "description": "hsl(_, _%, _%) if a color isn't specified, just use black."}
        },
        "required": ["x", "y", "w", "h"]
      }
    }
  }]
});

// i guess you can give it updates in the message as the prompt - and you can ask it to return an array
// message: ie move squares to left
// give it knowledge of the canvas - canvas size, shapes etc
// output: array of shapes

// update shape function
// find shape function

const thread = await openai.beta.threads.create();

const run = await openai.beta.threads.runs.create(
thread.id,
{
  assistant_id: assistant.id,
}
)

async function pollRun() {
  console.log('in poll run')
  let runResult: OpenAI.Beta.Threads.Runs.Run | undefined;

  async function getRun() {
    console.log('in get run')
    try {
      runResult = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      console.log("STATUS", runResult.status)
      if(runResult?.status === 'in_progress') {
        console.log('in progress')
        setTimeout(getRun, 3000); // Poll again if in progress
      } else if (runResult?.status === 'requires_action') {
        console.log("in required action")
        const toolOutput = JSON.parse(runResult?.required_action?.submit_tool_outputs.tool_calls[0].function.arguments ?? '')
        const id = Math.floor(Math.random() * 100000)
        const HUE_OFFSET = Math.random() * 360 | 0
        function randomColor() {
          const h = (Math.random() * 60 + HUE_OFFSET) % 360 | 0
          const s = (Math.random() * 10 + 30) | 0
          const l = (Math.random() * 20 + 30) | 0
          return `hsl(${0}, ${0}%, ${0}%)`
        }
        const generatedShape: Shape = {
          x: toolOutput?.x,
          y: toolOutput?.y,
          w: toolOutput?.w,
          h: toolOutput?.h,
          color: randomColor(),
          id: id
        }
        console.log("generatedShape", generatedShape)
        shapes.push(generatedShape)

        console.log("shapes", shapes)
      } else {
        console.log(runResult); // Log the result if not in progress
        const getAllMessages = await openai.beta.threads.messages.list(
          thread.id
        );
        console.log("get all messages", getAllMessages)
      }
    } catch (error) {
      console.error('Error retrieving the run:', error);
    }
  }

  await getRun(); // Initial call to start the polling process
}



const io = new Server(8080, { cors: { origin: '*' } })

const shapes: Shape[] = []
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
    console.log(message)
    await openai.beta.threads.messages.create(
      thread.id,
      {
        role: "user",
        content: message
      }
    )
    pollRun();
    socket.broadcast.emit('snapshot', shapes)
  })

  socket.on('create-shape', async (shape) => {
    shapes.push(shape)
    socket.broadcast.emit('snapshot', shapes)
  })

  socket.on('update-shape', (updatedShape) => {
    const shape = shapes.find(s => s.id === updatedShape.id)
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
