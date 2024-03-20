const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs").promises;
const path = require("path");
const { fileURLToPath } = require("url");
const discordFunctions = require(path.join(__dirname, "../../helpers/discordFunctions"));
const dF = new discordFunctions
const OpenAI = require("openai");
const openai = new OpenAI( {apiKey: process.env.CHATGPT_API_KEY} );

let SLASH_COMMAND_NAME = process.env.GPT_LOCAL ? "localchatgptthread" : "chatgptthread";
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

      // Step 1: Create an Assistant
      const assistant = await createAssistant(version);
      console.log('Assistant created:', assistant);

      // Step 2: Create a Thread
      const thread = await createThread();
      console.log('Thread created:', thread);

      const messageCreated = await createMessage(thread.id, message);
      console.log('Message created:', messageCreated);;

      let run = await openai.beta.threads.runs.create(
        thread.id,
        { 
          assistant_id: assistant.id,
          instructions: "Please address the user as Jane Doe. The user has a premium account."
        }
      );

      while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for 1 second
        run = await openai.beta.threads.runs.retrieve(
          run.thread_id,
          run.id
        );
      }

      if (run.status === 'completed') {
        const messages = await openai.beta.threads.messages.list(
          run.thread_id
        );
        for (const message of messages.data.reverse()) {
          console.log(`${message.role} > ${message.content[0].text.value}`);
        }
      } else {
        console.log(run.status);
      }

    } catch (error) {
      console.error('Error executing command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply('Failed to execute the command.');
      } else {
        await interaction.followUp('Failed to execute the command.');
      }
    }
  },
};
async function createAssistant(instruction) {
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v1'
    },
    body: JSON.stringify({
      "instructions": `${instruction}`,
      "name": "Math Tutor",
      "tools": [{"type": "code_interpreter"}],
      "model": "gpt-4"
    })
  });
  const data = await response.json();

  return data;
}

async function createThread() {
  const response = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v1'
    },
    body: '{}'
  });
  const data = await response.json();

  return data;
}

async function createMessage(threadId, message) {
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'OpenAI-Beta': 'assistants=v1'
    },
      body: JSON.stringify({
        role: "user",
        content: `${message}`
      })
    });
  const data = await response.json();

  return data;
}
