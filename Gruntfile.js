var async   = require("async")
var cheerio = require("cheerio")
var fs      = require("fs")
var path    = require("path")
var request = require("request")
var url     = require("url")

module.exports = function(grunt) {
  grunt.loadNpmTasks("grunt-prettify")
  grunt.loadNpmTasks("grunt-uncss")

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),

    prettify: {
      html: {
        files: {
          "dist/index.html": ["dist/index.html"]
        }
      }
    },
    uncss: {
      dist: {
        files: {
          "dist/style.css": ["dist/index.html"]
        },
        options: {
          stylesheets: ["style.css"],
        }
      }
    }
  })

  grunt.task.registerTask("env", "Set Environment", function(srcDir, distDir, url, selector) {
    if (!process.env.SRCDIR)
      process.env.SRCDIR = "src/"
    if (!process.env.DISTDIR)
      process.env.DISTDIR = "dist/"
    if (!process.env.URL)
      process.env.URL = "https://gist.github.com/nzoschke/f3f9b5ea054779893224"
    if (!process.env.SELECTOR)
      process.env.SELECTOR = "div.file-box"

    grunt.log.writeln("SRCDIR=" + process.env.SRCDIR)
    grunt.log.writeln("DISTDIR=" + process.env.DISTDIR)
    grunt.log.writeln("URL=" + process.env.URL)
    grunt.log.writeln("SELECTOR=" + process.env.SELECTOR)
  })

  grunt.task.registerTask("clean", "Clean directory", function(srcDir, distDir) {
    if (!srcDir) srcDir = process.env.SRCDIR
    if (!distDir) distDir = process.env.DISTDIR

    var dirs = [srcDir, distDir]
    dirs.forEach(function(dir) {
      grunt.file.mkdir(dir)
      grunt.log.writeln("delete " + dir)
      grunt.file.delete(dir)
      grunt.log.writeln("mkdir " + dir)
      grunt.file.mkdir(dir)
    })
  })

  grunt.task.registerTask("mirror", "Mirror HTML", function(srcURL, srcDir) {
    function mirror(srcURL, srcDir, cb) {
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

        // write body to srcDir
        console.log("write dir=" + srcDir + " path=" + destPath)
        fs.writeFile(path.join(srcDir, destPath), body, function(err) {
          if (err) abort(err)

          // mirror each extracted srcURLs
          async.each(srcURLs, function(srcURL, cb) {
            if (srcURL[0] != "/") return cb(null, null) // skip non-relative URLs for now
            mirror(srcURLHost + srcURL, srcDir, cb)
          }, function (err) {
            cb(err, "results")
          })
        })
      })
    }

    if (!srcDir) srcDir = process.env.SRCDIR
    if (!srcURL) srcURL = process.env.URL
    var done = this.async()
    mirror(srcURL, srcDir, function(err, result) {
      done()
    })
  })

  grunt.task.registerTask("extract", "", function(srcDir, distDir, selector) {
    function extract(e) {
      // don't extract <body> from <html>
      if (e[0].name == "html") return
      if (e[0].name == "head") return
      if (e[0].name == "body") return

      // remove all sibling nodes
      e.siblings().each(function(i, e) {
        this.remove()
      })

      // recursivey extract only the element's parent
      extract(e.parent())
    }

    if (!srcDir) srcDir = process.env.SRCDIR
    if (!distDir) distDir = process.env.DISTDIR
    if (!selector) selector = process.env.SELECTOR

    // TODO: assumes a single .html and .css file -> index.html and style.css. Generalize?
    grunt.file.expand(path.join(srcDir, "*.html")).forEach(function(file) {
      $ = cheerio.load(grunt.file.read(file))

      var link = $('link[rel="stylesheet"]')
      link.attr("href", "style.css")
      extract(link)
      extract($(selector))
      console.log("write dir=" + distDir + " path=index.html")
      grunt.file.write(path.join(distDir, "index.html"), $.html())
    })

    grunt.file.expand(path.join(srcDir, "*.css")).forEach(function(file) {
      console.log("write dir=" + distDir + " path=style.css")
      grunt.file.copy(file, path.join(distDir, "style.css"))
    })
  })

  grunt.registerTask("default", ["env", "clean", "mirror", "extract", "prettify", "uncss"])
};