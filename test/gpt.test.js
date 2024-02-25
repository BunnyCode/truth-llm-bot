const gpt = require("../src/commands/utility/chatGPT");

const interaction = {
  options: {
    getString: function (key) {
      // Mock getString function
      return this[key];
    },
    input: "Hello, World!",
  },
};

async function testGPT() {
  const response = await gpt.execute(interaction);
  // const message = interaction.options.getString("input");
  console.log(response);
}

testGPT();
