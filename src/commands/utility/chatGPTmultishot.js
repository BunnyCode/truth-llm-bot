const { SlashCommandBuilder } = require('discord.js');
// const fs = require('fs').promises;
const path = require('path');
// const { fileURLToPath } = require('url');
const discordFunctions = require(path.join(
  __dirname,
  '../../helpers/discordFunctions',
));
const dF = new discordFunctions();

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
    try {
      const ChatGPTAPIKey = process.env.CHATGPT_API_KEY;
      const message = interaction.options.getString('input');
      // Read the profile JSON file and parse the data
      const filePath = path.join(__dirname, '../gpt/system/version1.json');
      const botSystemVersion = await dF.botSystemProfile(filePath);
      // regexp if message starts with -v get the number
      // and remove it from the message

      // make 4 calls to
      // accuracy_of_claims
      // reliability_of_sources
      // logical_consistency
      // bias_and_objectivity
      // and save responses

      const systemMessageContent = botSystemVersion;

      // Assuming askGPT function returns a promise and takes systemMessageVersion as an argument
      const keys = [
        'reliability_of_sources',
        'logical_consistency',
        'bias_and_objectivity',
      ];
      const systemMessage = systemMessageContent.assistantVersions;

      // Ensure each promise is returned from the map function
      const promises = keys.map((key) => {
        const systemMessageVersion = systemMessage[key].join(' ');
        // Added return statement
        return askGPT(ChatGPTAPIKey, message, systemMessageVersion);
      });

      let newMessage = '';

      // Await Promise.all to wait for all promises to resolve
      try {
        // Process each response
        const responses = await Promise.all(promises);
        const combinedResponse = responses.map((response) =>
          response.ok ? response.json() : null,
        );

        // Since responses.json() is also a promise, we need to wait for them too
        const data = await Promise.all(combinedResponse);

        // Now, data is an array of all the JSON responses, you can concatenate or process them as needed
        // Assuming each response has the same structure
        newMessage = data
          .map((d) => d.choices[0].message.content.trim())
          .join(' ### ');

        // Continue with splitting and sending the message as before
      }
      catch (error) {
        console.error('Error processing responses:', error);
        // Handle error, for example by sending an error message to the user
      }

      // TODO: Add the combined score for all parameters before splitmessage.

      // Use splitMessage to handle long messages
      const messageParts = dF.splitMessage(newMessage);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply();
        for (const part of messageParts) {
          await interaction.followUp(part);
        }
      }
      else {
        for (const part of messageParts) {
          await interaction.followUp(part);
        }
      }
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

    async function askGPT(ChatGPTAPIKey, message, systemMessageVersion) {
      return await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ChatGPTAPIKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: systemMessageVersion,
            },
            {
              role: 'assistant',
              content:
                'Answer with your \'Check\' name and short descrition and lastly, ALWAYS GIVE AN ANSWER BETWEEN 0 and 100',
            },
            {
              role: 'user',
              content: message,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });
    }
  },
};
