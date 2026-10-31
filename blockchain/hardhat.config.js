require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: { version: "0.8.24", settings: { evmVersion: "paris" } },
  networks: { localhost: { url: "http://127.0.0.1:8545" } },
};