const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");

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

// Read the profile JSON file and parse the data
async function readJsonFile(filePath) {
  const data = await fs.readFile(filePath);
  return JSON.parse(data);
}

function splitMessage(content, maxLength = 2000) {
  if (!content) {
    // Checks if content is undefined, null, or empty
    console.warn("splitMessage was called with undefined or null content.");
    return []; // Returns an empty array or some other fallback as appropriate
  }
  if (content.length <= maxLength) return [content];
  return content.match(new RegExp(".{1," + maxLength + "}", "g"));
}

module.exports = {
  data: chatGPTCommand,
  async execute(interaction, client) {
    try {
      let message = interaction.options.getString("input");
      // regexp if message starts with -v get the number
      // and remove it from the message

      let version;
      if (message.startsWith("-v")) {
        version = message.match(/^-v(\w+)\s/)[1];
        message = message.replace(/^-v\w+\s/, "");
      }
      console.log(message, version);

      const filePath = path.join(__dirname, "../gpt/system/");
      const systemMessageContent = await readJsonFile(
        `${filePath}/version1.json`
      );

      // Get the version of the system message
      const systemMessage = systemMessageContent.systemMessage;
      let systemMessageVersion = version
        ? systemMessage[version]
        : systemMessage.v1;
      console.log(systemMessageVersion);
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
      const messageParts = splitMessage(newMessage);
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
