const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const { fileURLToPath } = require("url");
const scrape = require("../../functions/scrape/scaper");
const discordFunctions = require(path.join(
  __dirname,
  "../../helpers/discordFunctions"
));
const dF = new discordFunctions();
const OpenAI = require("openai");
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });

let SLASH_COMMAND_NAME = process.env.GPT_LOCAL
  ? "localchatgptthread"
  : "chatgptthread";
const OPENAI_API_KEY = process.env.CHATGPT_API_KEY;

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
      const botSystemVersion = await dF.botSystemProfile(filePath);

      let version;
      if (message.startsWith("-v")) {
        version = message.match(/^-v(\w+)\s/)[1];
        message = message.replace(/^-v\w+\s/, "");
      }
      console.log(message, version);

      const systemMessageContent = botSystemVersion;

      // Get the version of the system message
      const systemMessage = systemMessageContent.systemMessage;
      let systemMessageVersion = version
        ? systemMessage[version]
        : systemMessage.v1;

      // Step 1: Create an Assistant
      const assistant = await createAssistant(version);
      console.log("Assistant created:", assistant);

      // Step 2: Create a Thread
      const thread = await createThread();
      console.log("Thread created:", thread);

      const messageCreated = await createMessage(thread.id, message);
      console.log("Message created:", messageCreated);

      let run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
        instructions:
          "Provide a score from 0 to 100 and identifying keywords for further validation.",
      });

      while (["queued", "in_progress", "cancelling"].includes(run.status)) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second
        run = await openai.beta.threads.runs.retrieve(run.thread_id, run.id);
      }

      if (run.status === "completed") {
        const messages = await openai.beta.threads.messages.list(run.thread_id);
        for (const message of messages.data.reverse()) {
          const messageParts = dF.splitMessage(message.content[0].text.value);
          console.log(part);
          if (part.includes("Keywords:")) {
            const keywordsPattern = /Keywords:\s*(.*)/;
            const matches = part.match(keywordsPattern);
            console.log(matches);
          }
          if (!interaction.replied && !interaction.deferred) {
            await interaction.deferReply();
            for (const part of messageParts) {
              await interaction.followUp(part);
            }
          }
        }
      } else {
        console.log(run.status);
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
async function createAssistant(instruction) {
  const assistant = await openai.beta.assistants.create({
    name: "Math Tutor",
    instructions: instruction,
    tools: [{ type: "retrieval" }],
    model: "gpt-4-turbo-preview",
  });

  return assistant;
}

async function createThread() {
  thread = await openai.beta.threads.create();

  return thread;
}

async function createMessage(threadId, message) {
  const message2 = await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: message,
  });

  return message2;
}
