
# 🤖 LINK Auto-Staking Bot (Chainlink Staking v0.2)

This bot automatically stakes your LINK tokens into the [Chainlink Staking v0.2](https://staking.chain.link) pool on Ethereum Mainnet. It watches for available slots and submits the staking transaction for you when space becomes available.

📚 Learn more: [Chainlink Staking v0.2 Announcement](https://blog.chain.link/chainlink-staking-v0-2-now-live/)

---

## ⚙️ Features

- ✅ Automatically monitors and stakes your LINK tokens
- 🔒 Uses your private key securely from a `.env` file
- 🛎️ Optional Telegram notifications on staking events

---

## 🧰 Requirements

- Node.js (v16 or later)
- An Ethereum wallet with:
  - ✅ LINK tokens to stake
  - ✅ ETH for gas fees
- Infura WebSocket endpoint (free to create)
- (Optional) Telegram bot for notifications

---

## 🚀 How to Set Up

### 1. Install Node.js

Download from [https://nodejs.org/](https://nodejs.org/) and install the **LTS** version.

### 2. Download or Clone This Repository

```bash
git clone https://github.com/thaolp21/JS_auto-staking-CL-pool-v2.0.git
cd JS_auto-staking-CL-pool-v2.0
````

Or download as ZIP and extract it.

### 3. Install Dependencies

```bash
npm install
```

### 4. Create a `.env` File

Create a file named `.env` in the project folder with the following content:

```dotenv
WEB3_PROVIDER=wss://mainnet.infura.io/ws/v3/YOUR_INFURA_PROJECT_ID
PRIVATE_KEY=0xYOUR_PRIVATE_KEY
STAKING_CONTRACT_ADDRESS=0xbc10f2e862ed4502144c7d632a3459f49dfcdb5e
LINK_TOKEN_ADDRESS=0x514910771AF9Ca656af840dff83E8264EcF986CA
MIN_STAKE_AMOUNT=100

# Optional - Telegram Alerts
TELEGRAM_CHAT_ID=your_telegram_chat_id
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
```

> ⚠️ Never share your `.env` file or private key.

---

## ▶️ How to Run

Once everything is set up, run the bot with:

```bash
npm start
```

You should see logs in your terminal indicating the bot is running and watching the staking pool.

---

## 🛑 How to Stop

Press:

```
Ctrl + C
```

in your terminal window.

---

## 🛡 Security Notes

* Use a dedicated wallet with just enough LINK and ETH.
* Always protect your `.env` file.
* Do **not** upload `.env` to GitHub or share it.

---

## 📬 Telegram Notifications (Optional)

1. Create a bot via [@BotFather](https://t.me/BotFather)
2. Get your chat ID using [@userinfobot](https://t.me/userinfobot)
3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` to your `.env`

---

## ❓ Troubleshooting

* Make sure `.env` is created before running the bot.
* Ensure your wallet has ETH for gas and LINK for staking.
* If nothing happens, check Infura connection and console logs.

