const { SlashCommandBuilder } = require('discord.js');
const searchInternet = require('../../functions/scrape/scaper');
global.searchInternet = searchInternet;
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });

const SLASH_COMMAND_NAME = process.env.GPT_LOCAL
  ? 'localchatgptthread'
  : 'chatgptthread';

console.log(
  `${process.env.GPT_LOCAL ? 'Local development' : 'Production'
  } mode. Setting the command name to ${SLASH_COMMAND_NAME}.`,
);

const chatGPTCommand = new SlashCommandBuilder()
  .setName(`${SLASH_COMMAND_NAME}`)
  .setDescription('Sends back ChatGPT response.')
  .addStringOption((option) =>
    option
      .setName('input')
      .setDescription('The input to ChatGPT.')
      .setRequired(true),
  );

module.exports = {
  data: chatGPTCommand,
  async execute(interaction) {
    try {
      let message = interaction.options.getString('input');
      // regexp if message starts with -v get the number
      // and remove it from the message

      let version;
      if (message.startsWith('-v')) {
        version = message.match(/^-v(\w+)\s/)[1];
        message = message.replace(/^-v\w+\s/, '');
      }
      console.log(message, version);

      // Step 1: Create an Assistant
      const assistant = await createAssistant(version);
      console.log('Assistant created:', assistant);

      // Step 2: Create a Thread
      const thread = await createThread();
      console.log('Thread created:', thread);

      const messageCreated = await createMessage(thread.id, message);
      console.log('Message created:', messageCreated);

      const instruction = 'Provide a score from 0 to 100. Every response to assessments will be structured with a "Score: " followed by the numerical value, and "Keywords: " (FORMAT HERE IS VERY IMPORTANT!!) followed by a concise list of keywords relevant to the content\'s claim accuracy for users to use as references for further validation.';

      waitForGPT(thread, assistant, instruction, interaction);
    }
    catch (error) {
      console.error('Error executing command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply('Failed to execute the command.');
      }
      else {
        await interaction.followUp('Failed to execute the command.');
      }
    }
  },
};
async function createAssistant(instruction) {
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

async function createThread() {
  const thread = await openai.beta.threads.create();

  return thread;
}

async function createMessage(threadId, message) {
  const message2 = await openai.beta.threads.messages.create(threadId, {
    role: 'user',
    content: message,
  });

  return message2;
}

async function waitForGPT(thread, assistant, instruction, interaction) {
  try {
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      instructions: instruction,
    });

    let runStatus = await openai.beta.threads.runs.retrieve(
      thread.id,
      run.id,
    );

    // Polling mechanism to see if runStatus is completed
    while (runStatus.status !== 'completed') {
      let isRunning = false;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!isRunning) {
        runStatus = await openai.beta.threads.runs.retrieve(
          thread.id,
          run.id,
        );
        console.log('runStatus:', runStatus.status);
        if (runStatus.status === 'requires_action') {
          //   console.log(
          //     runStatus.required_action.submit_tool_outputs.tool_calls
          //   );
          isRunning = true;
          useTool(runStatus, thread, run);
          continue;
        }
      }

      // Check for failed, cancelled, or expired status
      if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
        console.log(
          `Run status is '${runStatus.status}'. Unable to complete the request.`,
        );
        break;
      }
    }
  }
  catch (error) {
    console.error('Error in waitForGPT:', error);
    await interaction.followUp('An error occurred while processing your request.');
  }
}

async function useTool(runStatus, thread, run) {
  const toolCalls =
    runStatus.required_action.submit_tool_outputs.tool_calls;
  const toolOutputs = [];

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;

    console.log(
      `This question requires us to call a function: ${functionName}`,
    );

    const args = JSON.parse(toolCall.function.arguments);

    // const argsArray = Object.keys(args).map((key) => args[key]);

    // Dynamically call the function with arguments
    const output = await global[functionName].apply(null, [args]);
    console.log('output:', output);
    toolOutputs.push({
      tool_call_id: toolCall.id,
      output: output,
    });
  }
  // Submit tool outputs
  await openai.beta.threads.runs.submitToolOutputs(
    thread.id,
    run.id,
    { tool_outputs: toolOutputs },
  );
}