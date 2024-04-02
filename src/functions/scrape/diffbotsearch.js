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

  async article(url) {
    
    const response = await fetch(`https://api.diffbot.com/v3/analyze?url=${url}&token=${diffbotApiKey}`);
    const data = await response.json();

    console.log("data", data);
    return data
  }
}

module.exports = DiffbotWebSearch;
