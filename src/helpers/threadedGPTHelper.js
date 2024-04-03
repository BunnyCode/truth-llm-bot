/**
 * Creates a new assistant with the given instruction.
 *
 * @param {class} openai
 * @param {string} instruction
 * @returns
 */
async function createAssistant(openai, instruction) {
  const assistant = await openai.beta.assistants.create({
    instructions: instruction,
    model: 'gpt-4',
    tools: [{
      type: 'function',
      function: {
        name: 'getArticle',
        description: 'Get the article from the list of URLs.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'URL from list to corresponding article' },
          },
          required: ['url'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'searchInternet',
        description: 'Search the internet for the query.',
        parameters: {
          type: 'object',
          properties: {
            searchstring: { type: 'string', description: 'Keywords you want to search for' },
          },
          required: ['searchstring'],
        },
      },
    },
    ],
  });

  return assistant;
}

/**
 * Creates a new thread.
 *
 * @param {class} openai
 * @returns
 */
async function createThread(openai) {
  const thread = await openai.beta.threads.create();

  return thread;
}

/**
 * Creates a new message in the given thread.
 *
 * @param {class} openai
 * @param {string} threadId
 * @param {string} message
 * @returns
 */
async function createMessage(openai, threadId, message) {
  const message2 = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  });

  return message2;
}

module.exports = [createThread, createAssistant, createMessage];