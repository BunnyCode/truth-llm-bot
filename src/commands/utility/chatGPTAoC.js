const { SlashCommandBuilder } = require('discord.js');
const GptAssistantThreads = require('../../helpers/GptAssistantThreads.js');
const path = require('path');
const discordFunctions = require(path.join(
  __dirname,
  '../../helpers/discordFunctions',
));
const dF = new discordFunctions();

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });

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

// Make calls to the threaded GPT API
module.exports = {
  data: chatGPTCommand,
  async execute(interaction) {
    console.log(dF);
    const gAT = new GptAssistantThreads(openai, true);
    const instruction = 'accuracy_of_claims';
    const gptThreadAssessment = await gAT.threadExecution(interaction, instruction);
    dF.feedbackToDiscord(interaction, gptThreadAssessment);
  },
};

