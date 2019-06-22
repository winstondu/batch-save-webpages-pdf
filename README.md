# Batch Web Articles Snapshots

**A script to batch generate snapshots (either in PDF or MHT).**

Please report any issues you may experience. Direct any thank you letters to
[my email](mailto:winston.du@vanderbilt.edu).

<!-- ## [Live Demo](TBD) | [Documentation](TBD) -->

## Purpose and Background
### Who this is for
If you are an avid reader of articles from prominent news sites (the ones with paywalls), and ever found yourself wanting
to batch save web links from these sites, this is the tool for you.

### Why this is your best bet
While all major browsers have a feature that allows users to select multiple tabs and batch apply certain actions
(e.g. add to favorites), none of them support the option to batch print/download webpage tabs.

Currently, there are no extensions or add-ons on the latest versions of major browsers that support this ability.
There will not be any in the near future. Apparently, for security reasons, the latest versions of major browser APIs do
not support print. 
For example, [Firefox Universal Print Add-on](https://legacycollector.org/firefox-addons/2513/index.html) is no longer
usable due to the fact that add-ons have been wholesale deprecated by Mozilla in favor of WebExtensions.

Thus, if you want to batch save webpages to PDF(especially those using a paywall), this script is your best shot.
It launches Chrome and uses the [Bypass Paywalls Extension](https://github.com/iamadamdev/bypass-paywalls-chrome) to access
news articles. **Thus, no password to any news site is required!**

## How to Run
This is based on the [node.js engine](https://nodejs.org/en/download/). Make sure you have a working version and it is
in your system PATH.

Open up a shell, and `cd` to the folder containing this git repository.

Then, install all required dependencies:
```
npm install
```

Finally, just run the program.
```
node html2pdf.js
```

## Additional Documentation:
Options can be:

* `--urls` - the name of the file you are trying to read a list of urls from.
* `--mht_only` - whether or not to do only MHTML instead of generating PDFs.
* `--outFolder` - where to place all output files. (Defaults to the 'Out' Folder in this directory)

## Credits
- Big thanks to [Yunyu Lin](https://github.com/yunyu) for telling me about the MHTML Snapshot ability in Puppeteer!

## License (MIT)
Copyright (c) 2019 Wenhao Winston Du.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
