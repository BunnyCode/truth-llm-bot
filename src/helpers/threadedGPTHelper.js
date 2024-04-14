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
    model: 'gpt-4-turbo-preview',
    tools: [
      {
        type: 'function',
        function: {
          name: 'searchInternet',
          description: 'Search the internet for the query.',
          parameters: {
            type: 'object',
            properties: {
              searchstring: { type: 'string', description: 'Keywords you want to search for, will give url collection back to run with analyzeArticleByUrl function' },
            },
            required: ['searchstring'],
          },
        },
      }, {
        type: 'function',
        function: {
          name: 'analyzeArticleByUrl',
          description: 'Get the article from the list of URLs.',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to get article from, for further analyzis, Requires previous call to internet search function' },
            },
            required: ['url'],
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

/**
 * Get Latest Message from the thread
 *
 * @param {class} openai
 * @param {string} threadId
 * @returns
 */
async function getLatestMessage(openai, threadId) {
  const messages = await openai.beta.threads.messages.list(threadId);
  console.log('DEBUG INFO:', messages.data[0]);
  return messages.data[0];
}

module.exports = [createThread, createAssistant, createMessage, getLatestMessage];