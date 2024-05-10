const [searchInternet, searchArticle] = require('../functions/scrape/scraper');
global.searchInternet = searchInternet;
global.searchArticle = searchArticle;
const path = require('path');
const fs = require('fs').promises;
const discordFunctions = require(path.join(
  __dirname,
  './discordFunctions',
));

module.exports = class GptAssistantThreads {
  constructor(openai, usingDiscord = false) {
    this.openai = openai;
    if (usingDiscord) {
      this.dF = new discordFunctions();
    }
    else {
      this.dF = null;
    }
  }

  async threadExecution(interaction, version) {
    try {

      // Read the profile JSON file and parse the data
      const filePath = path.join(__dirname, '../commands/gpt/system/version1.json');
      const data = await fs.readFile(filePath);
      const assistants = JSON.parse(data);
      // regexp if message starts with -v get the number
      // and remove it from the message

      const assistantMessage = assistants.assistantVersions;
      const assistantProfile = assistantMessage
        ? assistantMessage[version].join(' ')
        : assistantMessage['v1'].join(' ');

      let message;
      if (this.dF) {
        message = interaction.options.getString('input');
      }
      else {
        message = interaction;
      }


      console.log('\n\nPicked VERSION:', version, '\n\n');

      // Step 1: Create an Assistant
      const assistant = await this.createAssistant(assistantProfile);
      console.log('Assistant created:', assistant);

      // Step 2: Create a Thread
      const thread = await this.createThread();
      console.log('Thread created:', thread);

      // Step 3: Create a Message (prime the assistant with a message)
      const messageCreated = await this.createMessage(thread.id, message);
      console.log('Message created:', messageCreated);

      const goalInstruction =
        'Provide a score from 0 to 100. Every response to assessments \
        will be structured with a "Score: " \
        followed by the numerical value, and "Keywords: " (FORMAT HERE IS VERY IMPORTANT!!) \
        followed by a concise list of keywords relevant to the content\'s claim accuracy for users to use \
        as references for further validation. \
        Also add a "Summary: " 50-150 words\
        Finally add a Differences: 50-100 word differences from the text and the found articles\
        Take the DIFFERENCES in to account when setting the score, BE VERY HARSH on inaccuracies.\
        this is a what lead you to the conclusion of that score, NO MORE THAN 1700 CARACTERS IN TOTAL.\
        IT IS PARAMOUNT THE INTERNET ARTICLES HAVE HIGER VALIDITY RATING THEN YOUR TRANINGDATA';

      // Tell user to wait while processing
      if (this.dF) {
        this.dF.feedbackToDiscord(
          interaction,
          'Please wait while I process your request...',
        );
      }
      return await this.waitForGPT(thread, assistant, goalInstruction, interaction);
      // return message to calling function

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

  /**
   * Creates a new assistant with the given instruction.
   *
   * @param {string} instruction
   * @returns
   */
  async createAssistant(assistantProfile) {
    const assistant = await this.openai.beta.assistants.create({
      instructions: assistantProfile,
      model: 'gpt-4-turbo-preview',
      tools: [
        {
          type: 'function',
          function: {
            name: 'searchInternet',
            description: 'Search the internet for the articles and texts, returns and URLs to articles',
            parameters: {
              type: 'object',
              properties: {
                searchstring: { type: 'string', description: 'Keywords you want to search on google with' },
              },
              required: ['searchstring'],
            },
          },
        }, {
          type: 'function',
          function: {
            name: 'searchArticle',
            description: 'Open URL and retrieve article content. This function is used to get the article content from the URL.',
            parameters: {
              type: 'object',
              properties: {
                url: { type: 'string', description: 'encoded URL to get article' },
              },
              required: ['url'],
            },
          },
        },
      ],
    });

    return assistant;
  }


  async waitForGPT(thread, assistant, instruction, interaction) {
    try {
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: assistant.id,
        instructions: instruction,
      });

      let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);

      // Polling mechanism to see if runStatus is completed
      let isAvailable = true;
      let attempts = 0;
      while (runStatus.status !== 'completed' && attempts < 15) {
        if (this.dF) {
          this.dF.feedbackToDiscord(interaction, `runStatus: ${runStatus.status}...`);
        }
        runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);

        // Check for requires_action status (tool call required)
        if (runStatus.status === 'requires_action') {
          if (isAvailable) {
          // Flow information
            console.log('\n\n\nCalled on attempt:', attempts, '\n\n\n', 'available:', isAvailable, '\n\n\n');
            isAvailable = false;
            await this.useTool(runStatus, thread, run, interaction);
            await this.getLatestMessage(thread.id);
            isAvailable = true;
            console.log(runStatus);
            continue;
          }
        }

        // Check for failed, cancelled, or expired status
        if (['failed', 'cancelled', 'expired'].includes(runStatus.status)) {
          console.log(
            `Run status is '${runStatus.status}'. Unable to complete request.`,
          );
          break;
        }
        console.log('runStatus:', runStatus.status);
        // Loop timer for 3 second
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;
      }

      // Get the latest message
      const latestMessage = await this.getLatestMessage(thread.id);
      console.log('Latest message:', latestMessage?.content[0]?.text ?? 'No content found');
      if (latestMessage?.content[0]?.text?.value !== undefined) {
        if (this.dF) {
          this.dF.feedbackToDiscord(interaction, 'Done!');
        }
        return latestMessage.content[0].text.value;
      }
      else {
        if (this.dF) {
          this.dF.feedbackToDiscord(interaction, 'An error occurred');
        }
        return 'An error occurred while processing your request.';
      }
    }
    catch (error) {
      console.error('Error in waitForGPT:', error);
      if (this.dF) {
        await interaction.followUp(
          'An error occurred while processing your request.',
        );
      }
    }
  }

  async useTool(runStatus, thread, run, interaction) {
    const toolCalls = runStatus.required_action.submit_tool_outputs.tool_calls;
    const toolOutputs = [];

    console.log(toolCalls);

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;


      console.log(`This question requires us to call a function: ${functionName}`);
      if (this.dF) {
        await this.dF.feedbackToDiscord(interaction, `Using function: ${functionName}`);
      }

      const args = await JSON.parse(toolCall.function.arguments);

      // Dynamically call the function with arguments
      const output = await global[functionName].apply(null, [args]);
      toolOutputs.push({
        tool_call_id: toolCall.id,
        output: output,
      });
    }
    // Submit tool outputs
    await this.openai.beta.threads.runs.submitToolOutputs(thread.id, run.id, {
      tool_outputs: toolOutputs,
    });
  }


  /**
   * Creates a new thread.
   *
   * @returns
   */
  async createThread() {
    const thread = await this.openai.beta.threads.create();

    return thread;
  }

  /**
   * Creates a new message in the given thread.
   *
   * @param {string} threadId
   * @param {string} message
   * @returns
   */
  async createMessage(threadId, message) {
    const message2 = await this.openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message,
    });

    return message2;
  }

  /**
   * Get Latest Message from the thread
   *
   * @param {string} threadId
   * @returns
   */
  async getLatestMessage(threadId) {
    const messages = await this.openai.beta.threads.messages.list(threadId);
    console.log('DEBUG INFO:', messages.data[0]);
    console.log('DEBUG TEXT', messages.data[0]?.content[0]?.text.value);

    return messages.data[0];
  }

};
