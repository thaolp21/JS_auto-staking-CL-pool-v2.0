module.exports = {
    apps: [
      {
        name: "auto-staking-T",
        script: "auto-staking.js",
        env: {
          DOTENV_CONFIG_PATH: ".env.t"
        },
        node_args: "-r dotenv/config"
      },
      {
        name: "auto-staking-K_1",
        script: "auto-staking.js",
        env: {
          DOTENV_CONFIG_PATH: ".env.k.1"
        },
        node_args: "-r dotenv/config"
      },
      {
        name: "auto-staking-K_2",
        script: "auto-staking.js",
        env: {
          DOTENV_CONFIG_PATH: ".env.k.2"
        },
        node_args: "-r dotenv/config"
      }
    ]
  };
  