const GptAssistantThreads = require('./helpers/GptAssistantThreads.js');
const MultiCallGPT = require('./helpers/MultiCallGPT.js');
const minimist = require('minimist');
const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.CHATGPT_API_KEY });
const fs = require('fs');
const path = require('path');
const args = minimist(process.argv.slice(2));

console.log('Starting TruGPT in List developer mode...');
const outputFile = path.join(__dirname, 'listout.txt');
async function listItemCheck(interaction, itemNumber) {
  try {
    // const interaction = 'WASHINGTON (Reuters) - U.S. President-elect Donald Trump, after a meeting with the Senate Republican leader on Thursday, said his top three priorities are immigration, healthcare and jobs. Trump spoke to reporters after his meeting with Senate Majority Leader Mitch McConnell. Earlier Thursday, Trump held meetings with House of Representatives Speaker Paul Ryan and President Barack Obama. ';
    // Call AoC
    const gAT = new GptAssistantThreads(openai, false);
    const instruction = 'accuracy_of_claims';
    const gptThreadAssessment = await gAT.threadExecution(interaction, instruction);
    const output = `Article ${itemNumber}\n\n${gptThreadAssessment}\n\n`;
    fs.writeFile(outputFile, output, { flag: 'a+' }, err => {});
    // Call multi function
    // const multiCall = new MultiCallGPT(openai, false);
    // const multiCallAssessment = await multiCall.multiExecution(interaction);
    // // Feedback to Discord
    // console.log(multiCallAssessment);
    // fs.writeFile(outputFile, multiCallAssessment, { flag: 'a+' }, err => {});

  }
  catch (error) {
    console.error('Error executing command:', error);
  }
}


async function main() {
  try {
    const articlesPath = path.join(__dirname, '..', 'articles2.json');
    const articlesData = fs.readFileSync(articlesPath, 'utf8');
    const articlesJson = JSON.parse(articlesData);
    const formattedArticles = articlesJson.articles;
    const articleNum = args.article;
    console.log('articleNum:', articleNum);
    await listItemCheck(formattedArticles[articleNum - 1], articleNum);

  }
  catch (error) {
    console.error('Error executing command:', error);
  }
}

main();