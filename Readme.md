# Extract

Extract takes a URL and a CSS selector, and writes a folder of minimal and tidy
.html, .css and other related assets.

Its was written to turn the look and feel of a complex website into a template 
for a minimal static site.

Heavy lifting is done by [cheerio](https://github.com/MatthewMueller/cheerio) to
remove all HTML unrelated to the provided selector, and 
[uncss](https://github.com/giakki/uncss) to filter out CSS selectors not found
in the remaining HTML.

This tool chain could be extended to perform state-of-the-art extraction of 
assets from dynamic websites, but for now it supports a farily narrow purpose.

## Usage:

```sh
$ npm install -g grunt-cli
$ npm install
$ URL=https://gist.github.com/nzoschke/f3f9b5ea054779893224 SELECTOR=div.file-box grunt

Running "env" task
SRCDIR=src/
DISTDIR=dist/
URL=https://gist.github.com/nzoschke/f3f9b5ea054779893224
SELECTOR=div.file-box

Running "clean" task
delete src/
mkdir src/
delete dist/
mkdir dist/

Running "mirror" task
request host=https://gist.github.com path=/nzoschke/f3f9b5ea054779893224
replace src=/assets/application-547a90cb301cc65eca3cc67dcfc74c35.js dest=application-547a90cb301cc65eca3cc67dcfc74c35.js
replace src=/assets/application-283b219dd00f455351f48f9346c59ffa.css dest=application-283b219dd00f455351f48f9346c59ffa.css
write dir=src/ path=f3f9b5ea054779893224.html
request host=https://gist.github.com path=/assets/application-547a90cb301cc65eca3cc67dcfc74c35.js
request host=https://gist.github.com path=/assets/application-283b219dd00f455351f48f9346c59ffa.css
...

Running "extract" task
write dir=dist/ path=index.html
write dir=dist/ path=style.css

Running "prettify:html" (prettify) task
>> File "dist/index.html" prettified.

Running "uncss:dist" (uncss) task
File dist/style.css created.

Done, without errors.

$ gdu -b src/ src/*.{css,html} dist/*
593488  src/
118821  src/application-283b219dd00f455351f48f9346c59ffa.css
19484   src/f3f9b5ea054779893224.html
16784   dist/index.html
11954   dist/style.css
```
