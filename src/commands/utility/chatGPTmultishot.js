const { SlashCommandBuilder } = require('discord.js');
const MultiCallGPT = require('../../helpers/MultiCallGPT.js');
// const fs = require('fs').promises;
const path = require('path');
// const { fileURLToPath } = require('url');
const discordFunctions = require(path.join(
  __dirname,
  '../../helpers/discordFunctions',
));
const dF = new discordFunctions();
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });

const SLASH_COMMAND_NAME = process.env.GPT_LOCAL
  ? 'localchatgptmulti'
  : 'chatgptmulti';

console.log(
  `${
    process.env.GPT_LOCAL ? 'Local development' : 'Production'
  } mode. Setting the command name to ${SLASH_COMMAND_NAME}.`,
);

const chatGPTCommand = new SlashCommandBuilder()
  .setName(`${SLASH_COMMAND_NAME}`)
  .setDescription('Sends back multishot ChatGPT response.')
  .addStringOption((option) =>
    option
      .setName('input')
      .setDescription('The input to ChatGPT.')
      .setRequired(true),
  );

module.exports = {
  data: chatGPTCommand,
  async execute(interaction) {
    const MultiGPT = new MultiCallGPT(openai, true);
    const gptMultiAnswe = await MultiGPT.multiExecution(interaction);
    dF.feedbackToDiscord(interaction, gptMultiAnswe);
  },
};
