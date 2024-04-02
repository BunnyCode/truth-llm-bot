require("dotenv").config();
const sdk = require("api")("@diffbot-2/v1.1#9i9y4qmlr6p26mz");
const DiffbotSearch = require("./diffbotsearch");
const diffSearch = new DiffbotSearch();

const diffbotApiKey = process.env.DIFFBOT_API_KEY;

async function getChoise(topResultsUrl) {
  // return promise select number from input.
  return new Promise((resolve, reject) => {
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("Please select a number from the following options:");

    topResultsUrl.forEach((result, index) => {
      console.log(`${index + 1}. ${result.link} - ${result.summary}`);
    });

    readline.question("Enter the number of your choice: ", (number) => {
      readline.close();
      const choice = parseInt(number) - 1;
      if (choice >= 0 && choice < topResultsUrl.length) {
        resolve(choice);
      } else {
        reject(new Error("Invalid choice."));
      }
    });
  });
}

async function searchWithDiff(query) {
  sdk.auth(diffbotApiKey);

  const topResultsUrl = await diffSearch.search(
    `https://www.google.com/search?q=${query}`
  );

  console.log("topResultsUrl", topResultsUrl);

  const selectedIndex = await getChoise(topResultsUrl);

  const chosenArticle = topResultsUrl[selectedIndex].link;

  console.log("chosenArticle", chosenArticle);
  const article = await diffSearch.article(chosenArticle);
  console.log("article", article);
}

module.exports = searchWithDiff;
