require("dotenv").config();
const sdk = require("api")("@diffbot-2/v1.1#9i9y4qmlr6p26mz");
const diffbotApiKey = process.env.DIFFBOT_API_KEY;
class DiffbotWebSearch {
  async search(query) {
    const options = {method: 'GET', headers: {accept: 'application/json'}};

    const urlEncoded = encodeURIComponent(query);

    const response = await fetch(`https://api.diffbot.com/v3/list?url=${urlEncoded}&token=${diffbotApiKey}`, options)

    const data = await response.json();

    return data.objects[0].items;
  }

  article(url) {
    sdk.auth(diffbotApiKey);
    return sdk
      .article({ url })
      .then(({ data }) => {
        // Extract the data returned as a variable
        const extractedData = data;
        return extractedData;
      })
      .catch((err) => {
        console.error(err);
        throw err;
      });
  }
}

module.exports = DiffbotWebSearch;
