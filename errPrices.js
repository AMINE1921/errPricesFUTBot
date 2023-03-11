const { Client, Intents } = require("discord.js");
const fs = require("fs");
const dotenv = require("dotenv").config();
const cloudscraper = require("cloudscraper");
const playersDB = fs.readFileSync("playersDB.json");
const listPlayers = JSON.parse(playersDB);
const logs = fs.readFileSync("logsErr.json");
let logsErr = JSON.parse(logs);

const platform = "ps";
const valueBenef = 100;
const maxBudget = 1500000000;
const shareDiscord = true;

let nbSearch = 0;

const channelId = process.env.CHANNEL_ID;
const token = process.env.DISCORD_TOKEN;

const client = new Client({
  intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES],
});

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.login(token);

const filterPrice = async (p) => {
  const options = {
    method: "GET",
    url: `https://www.futbin.com/23/playerPrices?player=${p?.playerResource}`,
  };
  await cloudscraper(options)
    .then((response) => JSON.parse(response))
    .then((prices) => {
      const price =
        platform === "pc"
          ? prices[p?.playerResource].prices.pc
          : prices[p?.playerResource].prices.ps;
      const lastPrice = Number(
        price?.LCPrice === 0 ? 0 : price?.LCPrice?.replace(/,/g, "")
      );
      const beforeLastPrice = Number(
        price?.LCPrice2 === 0 ? 0 : price?.LCPrice2?.replace(/,/g, "")
      );
      const updated = price?.updated?.split(" ");
      const updatedValid =
        updated[1] === "seconds" ||
        updated[1] === "second" ||
        ((updated[1] === "mins" || updated[1] === "min") &&
          Number(updated[0]) <= 9);
      function addZero(i) {
        if (i < 10) {
          i = "0" + i;
        }
        return i;
      }
      const d = new Date();
      let h = addZero(d.getHours());
      let m = addZero(d.getMinutes());
      let time = h + ":" + m;
      if (
        updatedValid &&
        beforeLastPrice - 0.05 * beforeLastPrice - lastPrice >=
          Number(valueBenef) &&
        lastPrice <= Number(maxBudget)
      ) {
        const playerErr = {
          time: new Date().toLocaleString(),
          id: p?.id,
          playerID: p?.playerID,
          playerResource: p?.playerResource,
          name: p?.name,
          rating: p?.rating,
          profit: beforeLastPrice - 0.05 * beforeLastPrice - lastPrice,
          buyPrice: lastPrice,
          sellPrice: beforeLastPrice - 0.05 * beforeLastPrice,
          futbin: `https://www.futbin.com/23/player/${p?.id}`,
        };
        logsErr.push(playerErr);
        fs.writeFile("logsErr.json", JSON.stringify(logsErr), function (err) {
          if (err) throw err;
        });
        console.log(
          `[Heure: ${time}]\nErreur de prix sur ce joueur avec un benef de (${
            beforeLastPrice - 0.05 * beforeLastPrice - lastPrice
          }): https://www.futbin.com/23/player/${p?.id}\n ${p?.name} - ${
            p?.revision
          }\n Prix d'achat MAX: ${lastPrice}\n Prix de revente: ${beforeLastPrice}`
        );
        if (shareDiscord && platform === "ps") {
          const channel = client.channels.cache.get(channelId);
          const message = `[Heure: ${time}]\nErreur de prix sur ce joueur avec un benef de **(${
            beforeLastPrice - 0.05 * beforeLastPrice - lastPrice
          })**: https://www.futbin.com/23/player/${
            p?.id
          }\n Prix d'achat MAX: ${lastPrice}\n Prix de revente: ${beforeLastPrice}`;
          channel.send(message);
        }
      }
    })
    .catch((err) => {
      console.log("Error...");
      searchErr();
    });
};

const clearLogsErr = () => {
  logsErr = [];
  fs.writeFile("logsErr.json", JSON.stringify(logsErr), function (err) {
    if (err) throw err;
  });
};

const searchErr = () => {
  setInterval(clearLogsErr, 30 * 60 * 1000);
  console.log(`\nSearch n° ${nbSearch + 1} started!`);
  client
    .login(token)
    .then(() => {
      listPlayers.forEach((p, i) => {
        setTimeout(function () {
          filterPrice(p);
          if (listPlayers?.length - 1 === i) {
            nbSearch++;
            searchErr();
          }
        }, i * 600);
      });
    })
    .catch(console.error);
};

searchErr();
