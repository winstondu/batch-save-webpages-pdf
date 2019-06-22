
// By Winston Du
// Run this as follows (cd into the right folder, and type 'node autohtml2pdf.js')

const puppeteer = require('puppeteer-core');
const fs_module = require('fs');
const readline_module = require('readline');
const minimist = require('minimist');

const paywallBypassPath = __dirname + String.raw`.\bypass-paywalls-chrome-master`;
const defaultChromePath = String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`;
const defaultOutputDir = __dirname + "/out";
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

// See: https://gokatz.me/blog/automate-chrome-extension-testing/
// Current limiation; https://github.com/GoogleChrome/puppeteer/issues/2486

async function consoleInput() {
    var console_io = readline_module.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
    });

    let result = undefined;
    console_io.on('line', function (line) {
        result = line;
    })

    while (result == undefined) await sleep(100);

    return result;
}

/**
 * Checks if the input string is likely a valid URL.
 * @param {string} possibleURL
 */
function isValidURL(possibleURL) {
    var res =
        possibleURL.match(/(http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g);
    return (res !== null)
};

async function readURLs(file_path) {
    var urlsToRead = [];
    var lineReader = readline_module.createInterface({
        input: fs_module.createReadStream(file_path)
    });

    console.log("Reading from files.")

    lineReader.on('line', (line) => {
        urlsToRead.push(line.trim());
    });
    // From https://stackoverflow.com/questions/41453982/node-js-resolve-promise-and-return-value
    return new Promise(function (resolve, reject) {
        lineReader.on('close', (line) => {
            resolve(urlsToRead);
        });
    });
}

async function main() {
    // Parse Command Line arguments
    var user_arguments = minimist(process.argv.slice(2));
    console.dir(user_arguments);
    const chromePath = ("chromePath" in user_arguments ? user_arguments["chromePath"] : defaultChromePath);
    const outFolder = ("outFolder" in user_arguments ? user_arguments["outFolder"] : defaultOutputDir);
    var file_path = ("urls" in user_arguments ? user_arguments['urls'] : undefined);

    // Read from input urls file.
    // (If no file containing the url inputs was given, prompt the user for one).
    console.log("Enter a text to read from (or press enter for default of input.txt)");
    var file_exists = fs_module.existsSync(file_path);
    while (!file_path || !file_exists) {
        file_path = await consoleInput();
        // Trim starting or ending quotes
        file_path = file_path.replace(/(^"|^'|"$|'$)/g, '');
        if (file_path == "") {
            file_path = "input.txt"
        }
        console.log("Checking file path: \"" + file_path + "\"");
        file_exists = fs_module.existsSync(file_path);
        if (!file_exists) { console.log("File not found! Enter again!") }
    }
    console.log("Reading from: " + file_path);
    const urls = await readURLs(file_path);
    console.log(urls);
    urls.forEach(function (item, index, array) {
        if (!isValidURL(item)) {
            console.log("Warning! This is not a valid URL:", item, index);
        }
    });
    /**
     * Now we commence with launching Chrome to the indicated URLs.
     * To avoid asking the user for newsite passwords they may not have,
     * we use the bypass paywall extension. To launch the extension, we need to
     * be in headful mode as headless mode does not support extensions.
     * (See: https://github.com/GoogleChrome/puppeteer/issues/4503)
     * However, headful mode does not yet allow print-to-pdf
     * (See: https://github.com/GoogleChrome/puppeteer/issues/576) 
     * Thus, to get a pdf to user, we complete this workaround in two steps:
     * First, we use headful mode to bypass paywall and snapshot the site page
     * Then, we reopen our saved, paywall-less local snapshots and save as pdf.
     */

    // var { writing } = "test";
    // try {
    //     // Output
    //     fs_module.mkdirSync(__dirname + "/out", { recursive: true });
    //     // Open file and "truncate" it (i.e. wipe it)
    //     fs_module.writeFileSync(__dirname + "/out/pikachu.txt", writing);
    // } catch (err) {
    //     console.error(err);
    // };
    console.log("Grabbing Snapshot " + outFolder);
    var outputFileNames = await GetSnapshots(chromePath, outFolder, urls);
    console.log(outputFileNames);
    // If the user asked for PDF, we will now 
    process.exit(0);
}

async function GetSnapshots(chromePath, outFolder, urls) {
    console.log(paywallBypassPath)
    const browser = await puppeteer.launch({
        devtools: true,
        headless: false, // extension are allowed only in the head-full mode
        executablePath: chromePath,
        args: [
            `--disable-extensions-except=${paywallBypassPath}`,
            `--load-extension=${paywallBypassPath}`
        ]
    });
    var snapshot_threads = 
        urls.map((value)=>GetSnapshotTab(value, outFolder, browser));
    var outputFileNames = await Promise.all(snapshot_threads);
    console.log(outputFileNames);
    // Now we can run the following in headless chrome to actually save it to a pdf.
    // C:\"Program Files (x86)"\Google\Chrome\Application\chrome.exe --headless  --print-to-pdf=C:\Users\wenha\Documents\ffs_module.pdf C:\Users\wenha\Documents\ProgrammingProjects\PuppeteerLoginDuplicate.mht
    // If needed, we can use --user-data-dir=
    //await page.pdf({ format: 'A4', path:"test.pdf" });
    browser.close();
    return outputFileNames;
}

async function GetSnapshotTab(url, outFolder, browser) {
    const page = await browser.newPage()
    await page.goto(url, {
        waitUntil: 'networkidle2'
    });
    page.setViewport({
        width: 1920,
        height: 1080
    });

    let outputFileName = await page.evaluate(() => {
        return document.title
    });
    // Must make sure we don't have a \\ or a / in the final filename.
    outputFileName = outputFileName.replace('/', '-').replace('\\', '-');
    outputFileName = outputFileName + ".mht";
    page.target().createCDPSession();
    const session = await page.target().createCDPSession();
    await session.send('Page.enable');
    // Save as mhtml, a niche feature from:
    // https://github.com/GoogleChrome/puppeteer/issues/3575
    const { data } = await session.send('Page.captureSnapshot');
    try {
        // Output
        if (!fs_module.existsSync(outFolder)){
            fs_module.mkdirSync(outFolder, { recursive: true });
        }
        // Open file and "truncate" it (i.e. wipe it)
        fs_module.writeFileSync(outFolder + "/" + outputFileName, data);
        console.log(`The file "${outputFileName}" was saved! (Location Below)`);
        console.log(outFolder);
    } catch (err) {
        console.error(err);
    };
    return outputFileName;
}

main();