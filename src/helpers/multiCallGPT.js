const [searchInternet, searchArticle] = require('../functions/scrape/scraper');
global.searchInternet = searchInternet;
global.searchArticle = searchArticle;
const path = require('path');
const fs = require('fs').promises;
const discordFunctions = require(path.join(
  __dirname,
  './discordFunctions',
));


/**
 * Class for making multiple calls to the GPT API
 * before the response is returned.
 * @param {object} openai - OpenAI object
 * @param {boolean} usingDiscord - Boolean to check if using Discord
 */
module.exports = class MultiCallGPT {
  constructor(openai, usingDiscord) {
    this.openai = openai;
    if (usingDiscord) {
      this.dF = new discordFunctions();
    }
    else {
      this.dF = null;
    }
  }


  async multiExecution(interaction) {
    try {
      let message;
      const ChatGPTAPIKey = process.env.CHATGPT_API_KEY;
      if (this.dF) {
        message = interaction.options.getString('input');
      }
      else {
        message = interaction;
      }
      // Read the profile JSON file and parse the data
      const filePath = path.join(__dirname, '../commands/gpt/system/version1.json');
      const data = await fs.readFile(filePath);
      const assistants = JSON.parse(data);

      // Assuming askGPT function returns a promise and takes systemMessageVersion as an argument
      const keys = [
        'logical_consistency',
        'bias_and_objectivity',
      ];
      const assistantMessage = assistants.assistantVersions;

      // Ensure each promise is returned from the map function
      const promises = keys.map((key) => {
        const systemMessageVersion = assistantMessage[key].join(' ');
        // Added return statement
        return this.askGPT(ChatGPTAPIKey, message, systemMessageVersion);
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
        const combiresponses = await Promise.all(combinedResponse);

        // Now, data is an array of all the JSON combiresponses, you can concatenate or process them as needed
        // Assuming each response has the same structure
        newMessage = combiresponses
          .map((response) => response.choices[0].message.content.trim())
          .join(' ### ');

        return newMessage;
        // Continue with splitting and sending the message as before
      }
      catch (error) {
        console.error('Error processing responses:', error);
        // Handle error, for example by sending an error message to the user
      }

      if (this.dF) {
      // Use splitMessage to handle long messages
        const messageParts = this.dF.splitMessage(newMessage);
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
    }
    catch (error) {
      console.error('Error executing command:', error);
      if (this.dF) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply('Failed to execute the command.');
        }
        else {
          await interaction.followUp('Failed to execute the command.');
        }
      }
    }
  }

  async askGPT(ChatGPTAPIKey, message, systemMessageVersion) {
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
};
