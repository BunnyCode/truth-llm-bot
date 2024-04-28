require('dotenv').config();
const diffbotApiKey = process.env.DIFFBOT_API_KEY;

class DiffbotWebSearch {
  async search(query) {
    console.log('query.searchstring', JSON.stringify(query));
    const options = { method: 'GET', headers: { accept: 'application/json' } };

    const urlEncoded = encodeURIComponent(query);
    console.log('urlEncoded', urlEncoded);

    const response = await fetch(`https://api.diffbot.com/v3/list?url=${urlEncoded}&token=${diffbotApiKey}`, options);

    const data = await response.json();
    console.log('data', JSON.stringify(data));
    return data?.objects[0].items ?? ['No results found, try again'];
  }

  async article(url) {

    const response = await fetch(`https://api.diffbot.com/v3/analyze?url=${url}&token=${diffbotApiKey}`);
    const data = await response.json();

    console.log('data', data);
    return data;
  }
}

module.exports = DiffbotWebSearch;
