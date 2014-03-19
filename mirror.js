var async   = require("async")
var cheerio = require("cheerio")
var fs      = require("fs")
var path    = require("path")
var request = require("request")
var url     = require("url")

function mirror(srcURL, destDir, cb) {
  var srcURL     = url.parse(srcURL)
  var srcURLHost = srcURL.protocol + "//" + srcURL.hostname
  var srcURLPath = srcURL.path
  var destPath   = path.basename(srcURLPath)
  var srcURLs    = [] // extracted child URLs to mirror

  console.log("request host=" + srcURLHost + " path=" + srcURLPath)

  var r = request(url.format(srcURL), function(err, response, body) {
    var contentType = response.headers['content-type'].split(";")[0]
    if (contentType == "text/html") {
      // append file extension if missing
      if (path.extname(destPath) == "")
        destPath += ".html"

      // extract javascript and CSS URLs
      $ = cheerio.load(body)

      $("script[src]").each(function(i, e) {
        srcURLs.push(this.attr("src"))
      })
      $('link[rel="stylesheet"]').each(function(i, e) {
        srcURLs.push(this.attr("href"))
      })
    }
    else if (contentType == "text/css") {
      // extract URLs
      // url(/foo), url(/foo#bar) or url("/foo")
      var re = /url\(\"?([^\)\"]+)\"?\)/g
      while (m = re.exec(body)) {
        srcURLs.push(m[1])
      }
    }

    // replace all extracted URLs in body with local URLs
    for (var i = 0; i < srcURLs.length; i++) {
      var srcURL  = srcURLs[i]
      var destURL = path.basename(srcURL)
      var re = new RegExp(srcURL, 'g')
      console.log("replace src=" + srcURL + " dest=" + destURL)
      body = body.replace(re, destURL)
    }

    // write body to destDir
    console.log("write dest=" + destDir + " path=" + destPath)
    fs.writeFile(path.join(destDir, destPath), body, function(err) {
      if (err) abort(err)

      // mirror each extracted srcURLs
      async.each(srcURLs, function(srcURL, cb) {
        if (srcURL[0] != "/") return cb(null, null) // skip non-relative URLs for now
        mirror(srcURLHost + srcURL, destDir, cb)
      }, function (err) {
        cb(err, "results")
      })
    })
  })
}

mirror("https://gist.github.com/nzoschke/f3f9b5ea054779893224", "src/", function(err, results) {
  console.log("PROGRAM CALLBACK")
})
