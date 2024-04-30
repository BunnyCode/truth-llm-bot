const fs = require('fs').promises;

module.exports = class discordFunctions {
  splitMessage(content, maxLength = 2000) {
    // Checks if content is undefined, null, or empty
    if (!content) {
      console.warn('splitMessage was called with undefined or null content.');
      // Returns an empty array or some other fallback as appropriate
      return [];
    }
    if (content.length <= maxLength) return [content];
    return content.match(new RegExp('.{1,' + maxLength + '}', 'g'));
  }

  async botSystemProfile(filePath) {
    const data = await fs.readFile(filePath);
    return JSON.parse(data);
  }

  async feedbackToDiscord(interaction, message) {
    try {
      await interaction.editReply(message);
    }
    catch (error) {
      console.error('Error in feedbackToDiscord:', error);
      await interaction.followUp(
        'there was an error on our end. Please try again.',
      );
    }
  }
};

