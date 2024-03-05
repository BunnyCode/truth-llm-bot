const fs = require("fs").promises;

module.exports = class discordFunctions {
  splitMessage(content, maxLength = 2000) {
    if (!content) { // Checks if content is undefined, null, or empty
      console.warn("splitMessage was called with undefined or null content.");
      return []; // Returns an empty array or some other fallback as appropriate
    }
    if (content.length <= maxLength) return [content];
    return content.match(new RegExp('.{1,' + maxLength + '}', 'g'));
  }

  async botSystemProfile(filePath) {
    const data = await fs.readFile(filePath);
    return JSON.parse(data);
  }
}

