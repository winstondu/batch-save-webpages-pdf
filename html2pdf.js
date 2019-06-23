
// By Winston Du
// Run this as follows (cd into the right folder, and type 'node autohtml2pdf.js')

const puppeteer = require('puppeteer-core');
const readline_module = require('readline');
const minimist = require('minimist');
const fs_module = require('fs');
const path = require('path');

const paywallBypassPath = __dirname + String.raw`.\bypass-paywalls-chrome-master`;
const defaultChromePath = String.raw`C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`;
const defaultOutputDir = __dirname + "/out";
const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs));

// See: https://gokatz.me/blog/automate-chrome-extension-testing/
// Current limiation; https://github.com/GoogleChrome/puppeteer/issues/2486

/**
 * A one-invocation of getting Command-Line Input (CLI) from the user.
 */
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

/**
 * Code to open headful chrome with extensions, navigate to urls, and snapshot them.
 */
async function GetSnapshots(chromePath, outFolder, urls) {
    console.log("Using extension located at: " + paywallBypassPath);
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
        urls.map((value) => GetSnapshotTab(value, outFolder, browser, ".mht"));
    var outputFileNames = await Promise.all(snapshot_threads);
    browser.close();
    return outputFileNames;
}

/**
 * Code to open headless chrome, navigate to local mht files, and print to pdf.
 */
async function GetPDFs(chromePath, outFolder, paths) {
    const browser = await puppeteer.launch({
        headless: true, // extension are allowed only in the headful mode
        executablePath: chromePath,
    });
    var snapshot_threads =
        paths.map((value) => GetSnapshotTab(value, outFolder, browser, ".pdf"));
    var outputFileNames = await Promise.all(snapshot_threads);
    browser.close();
    return outputFileNames;
}

/**
 * Code for the tab to save itself, either via a snapshot or print to pdf
 * (The input browser instance must be headless to print to pdf).
 */
async function GetSnapshotTab(urlOrPath, outFolder, browser, extension = ".mht") {
    const page = await browser.newPage()
    if (extension == ".pdf"){
        urlOrPath = `file:${urlOrPath}`;
    }
    await page.goto(urlOrPath, {
        waitUntil: 'networkidle2'
    }).catch(error => {console.error(error); return [];});
    page.setViewport({
        width: 1920,
        height: 1080
    });

    let outputFileName = await page.evaluate(() => {
        return document.title
    });
    // Must make sure we don't have a \\ or a / in the final filename.
    outputFileName = outputFileName.replace('/', '-').replace('\\', '-');

    if (extension == ".mht") {
        // Save as mhtml, a niche feature from:
        // https://github.com/GoogleChrome/puppeteer/issues/3575
        page.target().createCDPSession();
        const session = await page.target().createCDPSession();
        await session.send('Page.enable');
        const { data } = await session.send('Page.captureSnapshot');

        saveFile(data, outputFileName, outFolder, extension/*=".mht"*/);
        return outputFileName;
    } else if (extension == ".pdf") {
        await page.pdf({
            path: (outFolder+"/"+outputFileName + extension),
            format: 'letter'
        });
        return outputFileName;
    }
    else {
        // Todo, change to error for better handling.
        console.log("No valid extension specified. Returning empty string.");
        return "";
    }
}

function saveFile(data, outputFileName, outFolder, extension = ".mht") {
    outputFileName = outputFileName + extension;
    try {
        if (!fs_module.existsSync(outFolder)) {
            fs_module.mkdirSync(outFolder, { recursive: true });
        }
        fs_module.writeFileSync(outFolder + "/" + outputFileName, data);
        console.log(`The file "${outputFileName}" was saved! (Location Below)`);
        console.log(outFolder);
    } catch (err) {
        console.error(err);
    };
}


async function main() {
    // Parse Command Line arguments
    var user_arguments = minimist(process.argv.slice(2));
    console.dir(user_arguments);
    var file_path = ("urls-file" in user_arguments ? user_arguments['urls-file'] : undefined);
    const mhtOnly = ("mht-only" in user_arguments ? user_arguments['mht-only'] : false);
    const outFolder = ("outFolder" in user_arguments ? path.resolve(user_arguments["outFolder"]) : defaultOutputDir);
    const chromePath = ("chromePath" in user_arguments ? user_arguments["chromePath"] : defaultChromePath);

    if (!fs_module.existsSync(outFolder)){
        console.log("Error: Given outFolder is not valid!");
        return;
    }
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
    console.log("Grabbing Snapshots into " + outFolder);
    var outputMhtFileNames = await GetSnapshots(chromePath, outFolder, urls);
    console.log("Saved Snapshots:");
    outputMhtFileNames.map((el)=>console.log(el)); // Output them all.
    // If the user asked for PDF, we will now generate the pdf.
    var outputMhtLocations = outputMhtFileNames.map((e)=>outFolder+"/"+e+".mht");
    if (!mhtOnly) {
        var outputPdfFileNames = await GetPDFs(chromePath, outFolder, /*paths =*/ outputMhtLocations);
        console.log("Saved PDFs:");
        outputPdfFileNames.map((el)=>console.log(el));
    }
    process.exit(0);
}

main();