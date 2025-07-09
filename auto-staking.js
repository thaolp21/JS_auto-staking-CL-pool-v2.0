// Load environment variables
const dotenv = require("dotenv");
dotenv.config();
const TelegramBot = require("node-telegram-bot-api");

const { Web3 } = require("web3");

const WEB3_PROVIDER = process.env.WEB3_PROVIDER;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS;
const LINK_TOKEN_ADDRESS = process.env.LINK_TOKEN_ADDRESS;

const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const telegramBot =
  telegramToken && telegramChatId
    ? new TelegramBot(telegramToken, { polling: false })
    : null;

// Validate environment variables
if (!PRIVATE_KEY) {
  console.error("❌ Missing PRIVATE_KEY in .env file");
  process.exit(1);
}

// Minimal ABI for LINK token (IERC20)
const LINK_TOKEN_ABI = [
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
      {
        name: "_spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        name: "remaining",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        name: "_spender",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {
        name: "_owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "balance",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        name: "_to",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
      {
        name: "_data",
        type: "bytes",
      },
    ],
    name: "transferAndCall",
    outputs: [
      {
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {
        name: "_to",
        type: "address",
      },
      {
        name: "_value",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
];

// Minimal ABI for staking contract
const STAKING_CONTRACT_ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "staker",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newStake",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "newTotalPrincipal",
        type: "uint256",
      },
    ],
    name: "Unstaked",
    type: "event",
  },
  {
    inputs: [],
    name: "isOpen",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isActive",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMaxPoolSize",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getTotalPrincipal",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Initialize Web3 with WebSocket
const web3 = new Web3(WEB3_PROVIDER);

// Initialize contracts
const linkContract = new web3.eth.Contract(LINK_TOKEN_ABI, LINK_TOKEN_ADDRESS);
const stakingContract = new web3.eth.Contract(
  STAKING_CONTRACT_ABI,
  STAKING_CONTRACT_ADDRESS
);
// Direct Staking Guide: https://ipfs.io/ipfs/QmUWDupeN4D5vHNWH6dEbNuoiZz9bnbqTHw61L27RG6tE2
const dataFieldStakingPool =
  "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000";

// Get account from private key
const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

async function checkAllowance(stakeAmount) {
  try {
    const allowance = await linkContract.methods
      .allowance(account.address, STAKING_CONTRACT_ADDRESS)
      .call();
    return allowance >= stakeAmount;
  } catch (error) {
    console.error("Error checking allowance:", error.message);
    return false;
  }
}

async function approveLink(stakeAmount) {
  try {
    console.log(
      `Approving ${web3.utils.fromWei(
        stakeAmount,
        "ether"
      )} LINK for staking contract...`
    );
    const gasPrice = await web3.eth.getGasPrice();
    const tx = linkContract.methods
      .approve(STAKING_CONTRACT_ADDRESS, stakeAmount)
      .send({
        from: account.address,
        gas: 100000,
        gasPrice: gasPrice,
      });
    await tx;
    console.log("Approval successful.");
  } catch (error) {
    console.error("Error approving LINK:", error.message);
  }
}
// 2. ADD NONCE TRACKING
let currentNonce = null;

async function getNextNonce() {
  if (currentNonce === null) {
    currentNonce = await web3.eth.getTransactionCount(
      account.address,
      "pending"
    );
  } else {
    currentNonce++;
  }
  return currentNonce;
}
let isStaking = false;

// Add this function to replace stuck transactions
async function replaceStuckTransaction(stuckTxHash, newGasPrice) {
  try {
    const tx = await web3.eth.getTransaction(stuckTxHash);
    if (!tx) return;

    const cancelTx = {
      from: account.address,
      to: account.address,
      value: "0",
      gas: 21000,
      gasPrice: newGasPrice,
      nonce: tx.nonce,
    };

    const receipt = await web3.eth.sendTransaction(cancelTx);
    console.log(`Cancellation tx sent: ${receipt.transactionHash}`);
    return receipt;
  } catch (error) {
    console.error("Failed to replace transaction:", error.message);
  }
}

async function stakeLink() {
  if (isStaking) {
    console.log("Staking already in progress. Skipping.");
    return;
  }

  isStaking = true;
  try {
    // Check pool status
    // const [isOpen, isActive] = await Promise.all([
    //   stakingContract.methods.isOpen().call(),
    //   stakingContract.methods.isActive().call()
    // ]);
    // if (!isOpen || !isActive) {
    //   console.log("Pool is not open or active. Skipping staking.");
    //   return;
    // }

    // Get wallet balance
    const balance = await linkContract.methods
      .balanceOf(account.address)
      .call();
    const balanceInLink = web3.utils.fromWei(balance, "ether");

    // Get available pool space
    const maxPoolSize = await stakingContract.methods.getMaxPoolSize().call();
    const totalPrincipal = await stakingContract.methods
      .getTotalPrincipal()
      .call();
    const availableSpace = maxPoolSize - totalPrincipal;
    const availableSpaceInLink = web3.utils.fromWei(availableSpace, "ether");

    // Calculate dynamic stake amount
    // ROUND TO 18 DECIMAL PLACES (1 wei precision)
    const stakeAmountInLink = Math.min(
      parseFloat(balanceInLink),
      parseFloat(availableSpaceInLink)
    );
    // Less than 1 LINK will be not staked
    if (Math.round(Math.floor(stakeAmountInLink)) <= 0) {
      console.log(
        "No LINK available to stake (insufficient balance or pool space)."
      );
      return;
    }

    // Convert to string with max 18 decimals
    const stakeAmountStr = stakeAmountInLink.toFixed(18);
    const stakeAmount = web3.utils.toWei(stakeAmountStr, "ether");
    console.log(
      `Calculated stake amount: ${stakeAmountStr} LINK (Balance: ${balanceInLink} LINK, Available Space: ${availableSpaceInLink} LINK)`
    );

    // Check and approve LINK if necessary
    // if (!(await checkAllowance(stakeAmount))) {
    //   await approveLink(stakeAmount);
    // }

    // Stake LINK
    console.log(`Staking ${stakeAmountStr} LINK...`);

    // Get gas price 50% higher than current
    const gasPrice = await _setHigherGasPrice(2);

    const tx = linkContract.methods
      .transferAndCall(
        STAKING_CONTRACT_ADDRESS,
        stakeAmount,
        dataFieldStakingPool
      )
      .send({
        from: account.address,
        gas: 600000,
        gasPrice,
        nonce: await getNextNonce(),
      });
    const receipt = await tx;
    console.log("Stake successful. Tx:", receipt.transactionHash);

    // Add Telegram notification
    const etherscanLink = `https://etherscan.io/tx/${receipt.transactionHash}`;
    const message =
      `✅ Successfully staked ${stakeAmountStr} LINK\n` +
      `Tx: ${etherscanLink}`;
    await sendTelegramNotification(message);
  } catch (error) {
    console.error("Staking failed:", error.message);

    // Handle timeout errors
    if (error.message.includes("was not mined within")) {
      const txHash = error.receipt?.transactionHash;
      if (txHash) {
        const newGasPrice = await _setHigherGasPrice(1.5);
        console.log(`Attempting to replace stuck transaction ${txHash}`);
        await replaceStuckTransaction(txHash, newGasPrice);
      }
    }

    currentNonce = null;
  } finally {
    isStaking = false;
  }
}

async function _setHigherGasPrice(times) {
  return Math.floor(Number(await web3.eth.getGasPrice()) * times).toString();
}

async function checkBalance() {
  try {
    const balance = await linkContract.methods
      .balanceOf(account.address)
      .call();
    if (balance == 0) {
      console.error(
        `Insufficient LINK balance: ${web3.utils.fromWei(
          balance,
          "ether"
        )} LINK`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error checking balance:", error.message);
    return false;
  }
}
async function handleUnstakedEvent() {
  console.log("Starting WebSocket listener for Unstaked events...");

  try {
    const eventEmitter = stakingContract.events.Unstaked({
      fromBlock: "latest",
    });

    eventEmitter.on("data", async (event) => {
      console.log(
        `Unstaked event detected: Staker=${
          event.returnValues.staker
        }, Amount=${web3.utils.fromWei(
          event.returnValues.amount,
          "ether"
        )} LINK`
      );

      if (isStaking) {
        console.log("Skipping - staking in progress");
        return;
      }

      // Check balance
      if (!(await checkBalance())) {
        console.error("Aborting stake due to insufficient balance.");
        return;
      }

      // Stake LINK with dynamic amount
      await stakeLink();
    });
    eventEmitter.on("error", (error) => {
      console.error("Event error:", error.message);
      console.log("Reconnecting in 5 seconds...");
      setTimeout(handleUnstakedEvent, 5000);
    });
  } catch (setupError) {
    console.error("Event setup failed:", setupError.message);
    setTimeout(handleUnstakedEvent, 5000);
    sendTelegramNotification(`❌ Event setup failed: ${setupError.message}`);
  }
}

async function sendTelegramNotification(message) {
  if (!telegramBot) {
    console.log("Telegram not configured. Skipping notification.");
    return;
  }

  try {
    await telegramBot.sendMessage(telegramChatId, message);
    console.log("Telegram notification sent");
  } catch (error) {
    console.error("Failed to send Telegram notification:", error.message);
  }
}

// Start the script
async function main() {
  try {
    console.log("staking contract address:", STAKING_CONTRACT_ADDRESS);
    console.log("staker's address:", account.address);
    console.log("telegramToken", telegramToken);
    await handleUnstakedEvent();
  } catch (error) {
    console.error("Script error:", error.message);
  }
}

main();
