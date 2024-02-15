export const ready = {
  name: "ready",
  once: true,
  async execute(client) {
    console.log(`Ready, ${client.user.tag} is online`);
  },
};

export default ready;
