require('dotenv').config();
const sdk = require('api')('@diffbot-2/v1.1#9i9y4qmlr6p26mz');
const DiffbotSearch = require('./diffbotsearch');
const diffSearch = new DiffbotSearch();

const diffbotApiKey = process.env.DIFFBOT_API_KEY;


async function searchArticle(query) {
  sdk.auth(diffbotApiKey);
  const newQuery = query.url = query.url.replace(/['"]/g, '').trim();
  const uriEncoded = encodeURIComponent(stripTextFragment(newQuery));
  const topResultsUrl = await diffSearch.article(
    `${uriEncoded}`,
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
  const urlList = topResultsUrl?.map(item => item.link);
  const articleLinks = { 'articleLinks': urlList };
  console.log(articleLinks);
  return JSON.stringify(articleLinks);

}

function stripTextFragment(url) {
  return url.replace(/#:.*/, '');
}

module.exports = [searchInternet, searchArticle];
