require('dotenv').config();
const sdk = require('api')('@diffbot-2/v1.1#9i9y4qmlr6p26mz');
const DiffbotSearch = require('./diffbotsearch');
const diffSearch = new DiffbotSearch();

const diffbotApiKey = process.env.DIFFBOT_API_KEY;


async function analyzeWithDiff(query) {
  sdk.auth(diffbotApiKey);
  const newQuery = query.searchstring = query.searchstring.replace(/['"]/g, '').trim();
  const uriEncoded = encodeURIComponent(newQuery);
  const topResultsUrl = await diffSearch.search(
    `https://www.google.com/search?q=${uriEncoded}`,
  );

  return JSON.stringify(topResultsUrl);

}

async function searchInternet(query) {
  sdk.auth(diffbotApiKey);
  const newQuery = query.searchstring = query.searchstring.replace(/['"]/g, '').trim();
  const uriEncoded = encodeURIComponent(newQuery);
  const topResultsUrl = await diffSearch.search(
    `https://www.google.com/search?q=${uriEncoded}`,
  );

  return JSON.stringify(topResultsUrl);

}

module.exports = [searchInternet, analyzeWithDiff];
