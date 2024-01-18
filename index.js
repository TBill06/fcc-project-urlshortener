require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const axios = require('axios');
const app = express();

// Basic Configuration
const port = process.env.PORT;
mongoose.connect(process.env.MONGO_URI);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number,
});
const Url = mongoose.model('Url', urlSchema);

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// URL Shortener Microservice POST
app.post('/api/shorturl', (req, res) => {
  const url = req.body.url;
  const urlRegex = /^(http|https)(:\/\/)/;
  if (!urlRegex.test(url)) {
    return res.json({ error: 'invalid url' });
  }
  else{
    resolveIP(url)
    .then((data) => {
      res.json({"original_url":data.original_url,"short_url":data.short_url});
    })
    .catch((error) => {
      console.log("Post",error.message);
    })
  }
});

function resolveIP(url) {
  return axios.get(url)
  .then((response) => {
    return checkAndAddtoDB(response.request.res.responseUrl);
  })
  .catch((error) => {
    console.log(error.message);
  })
}

function checkAndAddtoDB(url) {
  return Url.countDocuments({})
  .then((count) => {
    return Url.findOne({ original_url: url })
    .then((data) => {
      if (!data) {
        var newUrl = new Url({
          original_url: url,
          short_url: count+1,
        });
        return newUrl.save();
      }
      else {
        throw new Error("URL already exists");
      }
    })
  })
}

function redirectUrl(id){
  return Url.findOne({short_url: id})
  .then((data) => {
    if (data) {
      return data;
    }
  })
  .catch((error) => {
    console.log(error.message);
  })
}

// URL Shortener Microservice GET
app.get('/api/shorturl/:urlid', (req, res) => {
  const id = req.params.urlid;
  redirectUrl(id)
  .then(data => {
    res.redirect(data.original_url);
  })
  .catch(error => {
    res.status(500).json({ error: "No URL found" })
  })
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
