const { SlashCommandBuilder } = require('discord.js');
const [searchInternet, analyzeWithDiff] = require('../../functions/scrape/scaper');
global.searchInternet = searchInternet;
global.analyzeWithDiff = analyzeWithDiff;
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });
const [createThread, createAssistant, createMessage] = require('../../helpers/threadedGPTHelper');

const SLASH_COMMAND_NAME = process.env.GPT_LOCAL
  ? 'localchatgptthread2'
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
      const assistant = await createAssistant(openai, version);
      console.log('Assistant created:', assistant);

      // Step 2: Create a Thread
      const thread = await createThread(openai);
      console.log('Thread created:', thread);

      const messageCreated = await createMessage(openai, thread.id, message);
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
    let isAvailable = true;
    while (runStatus.status !== 'completed') {
      runStatus = await openai.beta.threads.runs.retrieve(
        thread.id,
        run.id,
      );
      if (runStatus.status === 'requires_action') {

        if (isAvailable) {
          isAvailable = false;
          useTool(runStatus, thread, run);
          continue;
        }
      }

      // Check for failed, cancelled, or expired status
      if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
        console.log(
          `Run status is '${runStatus.status}'. Unable to complete request.`,
        );
        break;
      }
      console.log('runStatus:', runStatus.status);
      // Timer for 2 second
      await new Promise((resolve) => setTimeout(resolve, 2000));
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