const { SlashCommandBuilder } = require('discord.js');
const GptAssistantThreads = require('../../helpers/GptAssistantThreads.js');
const MultiCallGPT = require('../../helpers/MultiCallGPT.js');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });
const path = require('path');


const discordFunctions = require(path.join(
  __dirname,
  '../../helpers/discordFunctions',
));
const dF = new discordFunctions();

const SLASH_COMMAND_NAME = process.env.GPT_LOCAL
  ? `localgptcombined${process.env.GPT_USER}`
  : 'gptcombined';

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
      // Call AoC
      const gAT = new GptAssistantThreads(openai, true);
      const instruction = 'accuracy_of_claims';
      const gptThreadAssessment = await gAT.threadExecution(interaction, instruction);
      // Call multi function
      dF.feedbackToDiscord(interaction, 'runStatus: Running MultiFunction...');
      const multiCall = new MultiCallGPT(openai, true);
      const multiCallAssessment = await multiCall.multiExecution(interaction);
      // Feedback to Discord
      dF.feedbackToDiscord(interaction, 'Done!');
      interaction.followUp(gptThreadAssessment);
      multiCallAssessment.split('###').map((response) => {
        interaction.followUp(response);
      });

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