const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs").promises;

const chatGPTCommand = new SlashCommandBuilder()
  .setName("chatgpt")
  .setDescription("Sends back ChatGPT response.")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The input to ChatGPT.")
      .setRequired(true)
  );

async function readJsonFile(filePath) {
  const data = await fs.readFile(filePath);
  return JSON.parse(data);
}

// Exporting the command data and execute function using CommonJS syntax
module.exports = {
  data: chatGPTCommand,
  async execute(interaction, client) {
    const message = interaction.options.getString("input");
    const systemMessageContent = await readJsonFile(
      "../../gpt/system/version1.json"
    );
    const systemMessage = systemMessageContent.systemMessage;

    const ChatGPTAPIKey = process.env.CHATGPT_API_KEY;

    // Setting up the request to the OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ChatGPTAPIKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: systemMessage.v1,
          },
          {
            role: "user",
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

    if (!response.ok) {
      await interaction.reply("There was an error processing your request.");
      return;
    }

    const data = await response.json();
    const newMessage = data.choices[0].message.content.trim();

    await interaction.reply(newMessage);
  },
};