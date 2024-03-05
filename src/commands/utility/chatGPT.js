const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const { fileURLToPath } = require("url");
const discordFunctions = require(path.join(__dirname, "../../helpers/discordFunctions"));
const dF = new discordFunctions

let SLASH_COMMAND_NAME = process.env.GPT_LOCAL ? "localchatgpt" : "chatgpt";

console.log(
  `${
    process.env.GPT_LOCAL ? "Local development" : "Production"
  } mode. Setting the command name to ${SLASH_COMMAND_NAME}.`
);

let chatGPTCommand = new SlashCommandBuilder()
  .setName(`${SLASH_COMMAND_NAME}`)
  .setDescription("Sends back ChatGPT response.")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The input to ChatGPT.")
      .setRequired(true)
  );

module.exports = {
  data: chatGPTCommand,
  async execute(interaction, client) {
    try {
      let message = interaction.options.getString("input");
      // regexp if message starts with -v get the number
      // and remove it from the message

      // Read the profile JSON file and parse the data
      const filePath = path.join(__dirname, "../gpt/system/version1.json");
      const botSystemVersion = await dF.botSystemProfile(filePath)

      let version;
      if (message.startsWith("-v")) {
        version = message.match(/^-v(\w+)\s/)[1];
        message = message.replace(/^-v\w+\s/, "");
      }
      console.log(message, version);

      const systemMessageContent = botSystemVersion

      // Get the version of the system message
      const systemMessage = systemMessageContent.systemMessage;
      let systemMessageVersion = version
        ? systemMessage[version]
        : systemMessage.v1;

      const ChatGPTAPIKey = process.env.CHATGPT_API_KEY;

      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
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
                content: systemMessageVersion,
              },
              {
                role: "assistant",
                content: "Super short answers only! ALWAYS GIVE AN ANSWER BETWEEN 0 and 100",
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
        }
      );

      if (!response.ok) {
        // Ensure no attempt to reply twice to the same interaction
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply(
            "There was an error processing your request."
          );
        } else {
          await interaction.followUp(
            "There was an error processing your request."
          );
        }
        return;
      }

      const data = await response.json();
      const newMessage = data.choices[0].message.content.trim();

      // Use splitMessage to handle long messages
      const messageParts = dF.splitMessage(newMessage);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply();
        for (const part of messageParts) {
          await interaction.followUp(part);
        }
      } else {
        for (const part of messageParts) {
          await interaction.followUp(part);
        }
      }
    } catch (error) {
      console.error("Error executing command:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply("Failed to execute the command.");
      } else {
        await interaction.followUp("Failed to execute the command.");
      }
    }
  },
};
