const { SlashCommandBuilder } = require('discord.js');
const path = require('path');

const discordFunctions = require(path.join(
  __dirname,
  '../../helpers/discordFunctions',
));
const dF = new discordFunctions();
const [searchInternet, searchArticle] = require('../../functions/scrape/scaper');
global.searchInternet = searchInternet;
global.searchArticle = searchArticle;
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });
const [
  createThread,
  createAssistant,
  createMessage,
  getLatestMessage,
] = require('../../helpers/threadedGPTHelper');

const SLASH_COMMAND_NAME = process.env.GPT_LOCAL
  ? `localchatgptthread${process.env.GPT_USER}`
  : 'chatgptthread';

console.log(
  `${
    process.env.GPT_LOCAL ? 'Local development' : 'Production'
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
      // Read the profile JSON file and parse the data
      const filePath = path.join(__dirname, '../gpt/system/version1.json');
      const assistants = await dF.botSystemProfile(filePath);

      // regexp if message starts with -v get the number
      // and remove it from the message
      let version, assistantProfile;
      if (message.startsWith('-v')) {
        version = message.match(/^-v(\w+)\s/)[1];
        message = message.replace(/^-v\w+\s/, '');
        // Get the version of the system message (array of strings)
        const assistantMessage = assistants.assistantVersions;
        assistantProfile = assistantMessage
          ? assistantMessage[version].join(' ')
          : assistantMessage.v1.join(' ');
      }
      console.log('\n\nPicked VERSION:', version, '\n\n');

      // Step 1: Create an Assistant
      const assistant = await createAssistant(openai, assistantProfile);
      console.log('Assistant created:', assistant);

      // Step 2: Create a Thread
      const thread = await createThread(openai);
      console.log('Thread created:', thread);

      // Step 3: Create a Message (prime the assistant with a message)
      const messageCreated = await createMessage(openai, thread.id, message);
      console.log('Message created:', messageCreated);

      const goalInstruction =
        'Provide a score from 0 to 100. Every response to assessments \
        will be structured with a "Score: " followed by the numerical value, \
        and "Keywords: " (FORMAT HERE IS VERY IMPORTANT!!) followed by a concise \
        list of keywords relevant to the content\'s claim accuracy for users to use \
        as references for further validation. Finaly add a "Summary: " 50-150 words\
        Finally Summarize (Conclustion:) the article text (50-150 words) and what lead you to the conclusion of that score, \
        no more than 1900 characters in total.\
        IT IS PARAMOUNT THE INTERNET ARTICLES HAVE HIGER VALIDITY RATING THEN YOUR TRANINGDATA';

      // Tell user to wait while processing
      feedbackToDiscord(
        interaction,
        'Please wait while I process your request...',
      );
      waitForGPT(thread, assistant, goalInstruction, interaction);
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

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    // Polling mechanism to see if runStatus is completed
    let isAvailable = true;
    let attempts = 0;
    while (runStatus.status !== 'completed' && attempts < 10) {
      feedbackToDiscord(interaction, `runStatus: ${runStatus.status}...`);
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

      // Check for requires_action status (tool call required)
      if (runStatus.status === 'requires_action') {
        if (isAvailable) {
          isAvailable = false;
          await useTool(runStatus, thread, run, interaction);
          await getLatestMessage(openai, thread.id);
          isAvailable = true;
          console.log(runStatus);
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
      await new Promise((resolve) => setTimeout(resolve, 3000));
      attempts++;
    }

    // Get the latest message
    const latestMessage = await getLatestMessage(openai, thread.id);
    console.log('Latest message:', latestMessage?.content[0].text);
    const gptReply =
      latestMessage.content[0].text.value ??
      'An error occurred while processing your request.';
    latestMessage.content[0].text.value
      ? feedbackToDiscord(interaction, 'Done!')
      : feedbackToDiscord(interaction, 'An error occurred');
    interaction.followUp(gptReply);
    // Ask bot what article url to use""
    // await createMessage(openai, thread.id, 'Please provide the article url you would like to use.');
  }
  catch (error) {
    console.error('Error in waitForGPT:', error);
    await interaction.followUp(
      'An error occurred while processing your request.',
    );
  }
}

async function useTool(runStatus, thread, run, interaction) {
  const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
  const toolOutputs = [];

  console.log(toolCalls);

  for (const toolCall of toolCalls) {
    const functionName = toolCall.function.name;

    console.log(`This question requires us to call a function: ${functionName}`);
    await feedbackToDiscord(interaction, `Using function: ${functionName}`);

    const args = JSON.parse(toolCall.function.arguments);

    // Dynamically call the function with arguments
    const output = await global[functionName].apply(null, [args]);
    toolOutputs.push({
      tool_call_id: toolCall.id,
      output: output,
    });
  }
  // Submit tool outputs
  await openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
    tool_outputs: toolOutputs,
  });
}

async function feedbackToDiscord(interaction, message) {
  try {
    await interaction.editReply(message);
  }
  catch (error) {
    console.error('Error in feedbackToDiscord:', error);
    await interaction.followUp(
      'there was an error on our end. Please try again.',
    );
  }
}
