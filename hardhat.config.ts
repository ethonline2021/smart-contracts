import 'dotenv/config';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@nomiclabs/hardhat-waffle';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-contract-sizer';
import { Wallet } from 'ethers';
import '@openzeppelin/hardhat-upgrades';

const mnemonic = process.env.MNEMONIC;
let accounts;

if (mnemonic) {
  accounts = {
    mnemonic,
  };
} else {
  accounts = [];
  for (let i = 0; i < 10; i++) {
    const wallet = Wallet.createRandom();
    accounts.push({
      privateKey: wallet.privateKey,
      balance: '1000000000000000000000',
    });
  }
}

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: false,
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 80001,
      initialBaseFeePerGas: 0, // workaround from https://github.com/sc-forks/solidity-coverage/issues/652#issuecomment-896330136 . Remove when that issue is closed.
      forking: {
        url: 'https://polygon-mumbai.g.alchemy.com/v2/' + process.env.ALCHEMY_TOKEN_POLYGON,
      },
      allowUnlimitedContractSize: true,
      accounts: accounts,
    },
    kovan: {
      url: 'https://eth-kovan.alchemyapi.io/v2/' + process.env.ALCHEMY_TOKEN,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : "remote",
    },
    mumbai: {
      url: 'https://polygon-mumbai.g.alchemy.com/v2/' + process.env.ALCHEMY_TOKEN_POLYGON,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : "remote",
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 40000
  }
};
