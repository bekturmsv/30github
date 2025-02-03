import axios from "axios";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const QUOTE_API = "https://api.quotable.io/random";
const BACKUP_QUOTE_API = "https://zenquotes.io/api/random";
const START_DATE_FILE = "start_date.txt";
const README_FILE = "README.md";
const TOTAL_DAYS = 30;
const GENERATED_SITES_DIR = "generated_sites";

const FALLBACK_QUOTES = [
  "Believe in yourself and all that you are.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Your limitation—it’s only your imagination.",
  "Dream big and dare to fail.",
  "Don’t stop until you’re proud.",
];

async function getRandomQuote() {
  try {
    const response = await axios.get(QUOTE_API, { timeout: 5000 });
    if (response.data && response.data.content) {
      return response.data.content;
    }
    throw new Error("Invalid response from primary API");
  } catch (error) {
    console.error("Primary API failed, trying backup API...");
    try {
      const backupResponse = await axios.get(BACKUP_QUOTE_API, {
        timeout: 5000,
      });
      if (
        backupResponse.data &&
        Array.isArray(backupResponse.data) &&
        backupResponse.data[0].q
      ) {
        return backupResponse.data[0].q;
      }
      throw new Error("Invalid response from backup API");
    } catch (backupError) {
      console.error("Backup API also failed, using fallback quotes.");
      return FALLBACK_QUOTES[
        Math.floor(Math.random() * FALLBACK_QUOTES.length)
      ];
    }
  }
}

function getRandomStyles() {
  return `body {
        font-family: Arial, sans-serif;
        background-color: hsl(${Math.floor(Math.random() * 360)}, 100%, 90%);
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        text-align: center;
        margin: 0;
    }
    .container {
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
    }
    .quote {
        font-style: italic;
        margin-top: 10px;
        color: hsl(${Math.floor(Math.random() * 360)}, 100%, 30%);
    }`;
}

function getProgressDay() {
  let startDate;
  if (fs.existsSync(START_DATE_FILE)) {
    startDate = new Date(fs.readFileSync(START_DATE_FILE, "utf8"));
  } else {
    startDate = new Date();
    fs.writeFileSync(START_DATE_FILE, startDate.toISOString(), "utf8");
  }
  const today = new Date();
  const diffTime = Math.floor((today - startDate) / (1000 * 60 * 60 * 24)) + 1;
  return Math.min(diffTime, TOTAL_DAYS);
}

async function generateFiles() {
  if (!fs.existsSync(GENERATED_SITES_DIR)) {
    fs.mkdirSync(GENERATED_SITES_DIR);
  }

  const today = new Date();
  const formattedDate = `${today.getDate()}-${
    today.getMonth() + 1
  }-${today.getFullYear()}`;
  const progressDay = getProgressDay();
  const folderName = path.join(
    GENERATED_SITES_DIR,
    `site_${formattedDate}_progress_${progressDay}`
  );

  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
  }

  const dateStr = today.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const quote = await getRandomQuote();
  const randomStyles = getRandomStyles();

  const htmlContent = `<!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Day ${dateStr} (${progressDay}/${TOTAL_DAYS} days)</title>
        <link rel='stylesheet' href='style.css'>
    </head>
    <body>
        <div class='container'>
            <h1>Today is ${dateStr}</h1>
            <h2>Progress: ${progressDay}/${TOTAL_DAYS} days</h2>
            <p class='quote'>"${quote}"</p>
        </div>
    </body>
    </html>`;

  fs.writeFileSync(path.join(folderName, "index.html"), htmlContent, "utf8");
  fs.writeFileSync(path.join(folderName, "style.css"), randomStyles, "utf8");

  console.log(
    `Site created in folder ${folderName}. Progress: ${progressDay}/${TOTAL_DAYS} days.`
  );

  try {
    execSync("git rev-parse --is-inside-work-tree", { stdio: "ignore" });
    execSync("git add .");
    execSync(
      `git commit -m "Site created in folder ${folderName}. Progress: ${progressDay}/${TOTAL_DAYS} days."`
    );
    execSync("git push origin master");
    console.log("Changes successfully committed and pushed to the repository.");
  } catch (error) {
    console.error("Skipping Git commands: Not inside a valid Git repository.");
  }
}

generateFiles();
