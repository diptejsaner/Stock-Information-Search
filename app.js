// var http = require('http');
// var fs = require('fs');
// var events = require('events');
var request = require('request');
var express = require('express');
var path = require('path');
// var async = require('async');
var moment = require('moment-timezone');
var parseString = require('xml2js').parseString;

app = express();

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function (req, res) {
  res.send('Hello!');
});

var apikeyStr = "&apikey=MI8IX62VGAUYBVBQ";
var autocompleteAPIurl = 'http://dev.markitondemand.com/MODApis/Api/v2/Lookup/json?input=';
var timeseriesAPIurl = 'https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&outputsize=full&symbol=';
var stockDetailsAPIurl = 'https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&outputsize=compact&interval=5min&symbol=';
var stockNewsAPIurl = 'https://seekingalpha.com/api/sa/combined/';

function sortFunction(a, b) {
  if (a[0] === b[0]) {
      return 0;
  }
  else {
      return (a[0] < b[0]) ? -1 : 1;
  }
}

app.get('/autocomplete/:input', function (req, serverRes) {
  var aurl = autocompleteAPIurl + req.params.input;
  request.get({
    url: aurl,
    json: true,
    headers: { 'User-Agent': 'request' }
  }, (err, incomingRes, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (incomingRes.statusCode !== 200) {
      console.log('Status:', incomingRes.statusCode);
    } else {
      // data is already parsed as JSON
      serverRes.send(data);
    }
  });
});

app.get('/stockDetails/:input', function (req, serverRes) {
  var aurl = stockDetailsAPIurl + req.params.input + apikeyStr;
  request.get({
    url: aurl,
    json: true,
    headers: { 'User-Agent': 'request' }
  }, (err, incomingRes, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (incomingRes.statusCode !== 200) {
      console.log('Status:', incomingRes.statusCode);
    } else {
      // var ismdata = JSON.stringify(data).includes("Meta Data");
      // console.log("Complete stock details? " + ismdata);

      // if(ismdata == false) {
      //   console.log("Apparent invalid api call");
      //   console.log("aurl : " + aurl);
      // }

      serverRes.send(data);
    }
  });
});

app.get('/stockNews/:input', function (req, serverRes) {
  var aurl = stockNewsAPIurl + req.params.input + ".xml";

  request.get({
    url: aurl,
    json: false,
    headers: { 'User-Agent': 'request' }
  }, (err, incomingRes, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (incomingRes.statusCode !== 200) {
      console.log('Status:', incomingRes.statusCode);
    } else {
      parseString(data, function (err, result) {
        var newsJsonObj = result;
        var newsItems = newsJsonObj["rss"]["channel"][0]["item"];
        var newsJsonArr = [];
        var i = 0;
        var j = 0;
        while(i < 5) {
          var link = newsItems[j]["link"][0];
          if(link.indexOf("article") !== -1) {
            var obj = new Object();
            obj.title = newsItems[j]["title"][0];
            obj.link = link;

            var dateStr = newsItems[j]["pubDate"][0];
            var timezoneAbbr = moment.tz(dateStr, 'America/New_York').zoneAbbr();
            obj.date = dateStr.substring(0, 25) + " " + timezoneAbbr;
            obj.author = newsItems[j]["sa:author_name"][0];
            newsJsonArr.push(obj);
            i++;
          }
          j++;
        }
        serverRes.send(newsJsonArr);
      });
    }
  });
});

// take a look at async parallel request in the future if required
app.get('/timeseries/:input/:numPoints', function (req, serverRes) {
  var aurl = timeseriesAPIurl + req.params.input + apikeyStr;
  request.get({
    url: aurl,
    json: true,
    headers: { 'User-Agent': 'request' }
  }, (err, incomingRes, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (incomingRes.statusCode !== 200) {
      console.log('Status:', incomingRes.statusCode);
    } else {
      // data is already parsed as JSON
      var npoints = req.params.numPoints;
      var priceVolumeDataObj = data['Time Series (Daily)'];
      
      var priceData = []
      var volumeData = []
      
      var ind = 1
      
      for(var key in priceVolumeDataObj) {
          if(ind > parseInt(npoints))
              break
              
          var date = new Date(String(key))
          var millisecs = date.getTime()
          
          var priceValue = parseFloat(priceVolumeDataObj[key]['4. close']);
          var volumeValue = parseFloat(priceVolumeDataObj[key]['5. volume'])/1000000;
          
          priceData.push([millisecs, priceValue])
          volumeData.push([millisecs, volumeValue])
          
          ind++
      }
      
      priceData.sort(sortFunction);
      volumeData.sort(sortFunction);

      // merge 2 arrays
      var priceVolumeData = [];
      priceVolumeData.push(priceData);
      priceVolumeData.push(volumeData);

      serverRes.send(priceVolumeData);
    }
  });
});

app.get('/stoch/:input/:numPoints', function (req, serverRes) {
  
  var APIurl = 'https://www.alphavantage.co/query?function=STOCH&interval=daily&time_period=10&series_type=open&symbol=' + req.params.input + apikeyStr;
  var techAnalysisStr = "Technical Analysis: " + "STOCH";

  request.get({
    url: APIurl,
    json: true,
    headers: { 'User-Agent': 'request' }
  }, (err, incomingRes, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (incomingRes.statusCode !== 200) {
      console.log('Status:', incomingRes.statusCode);
    } else {
      // data is already parsed as JSON
      var npoints = req.params.numPoints;
      var stochDataObj = data[techAnalysisStr];
      
      var slowKData = []
      var slowDData = []
      
      var ind = 1
      
      for(var key in stochDataObj) {
          if(ind > parseInt(npoints))
              break
              
          var date = new Date(String(key))
          var millisecs = date.getTime()
          
          var skValue = parseFloat(stochDataObj[key]['SlowK']);
          var sdValue = parseFloat(stochDataObj[key]['SlowD']);
          
          slowKData.push([millisecs, skValue]);
          slowDData.push([millisecs, sdValue]);
          
          ind++
      }
      
      slowKData.sort(sortFunction);
      slowDData.sort(sortFunction);

      // merge 2 arrays
      var stochData = [];
      stochData.push(slowKData);
      stochData.push(slowDData);

      serverRes.send(stochData);
    }
  });
});

app.get('/(|bbands|macd)/:input/:numPoints', function (req, serverRes) {
  
  var functionGraph = req.path.split("/")[1].toUpperCase();
  var APIurl = 'https://www.alphavantage.co/query?function=' + functionGraph + '&interval=daily&time_period=10&series_type=open&symbol=' + req.params.input + apikeyStr;
  var techAnalysisStr = "Technical Analysis: " + functionGraph;
  
  var indexStr = ["", "", ""];

  if(functionGraph == "BBANDS") {
    indexStr[0] = "Real Middle Band";
    indexStr[1] = "Real Lower Band";
    indexStr[2] = "Real Upper Band";
  }
  else {
    indexStr[0] = "MACD_Hist";
    indexStr[1] = "MACD_Signal";
    indexStr[2] = "MACD";
  }

  request.get({
    url: APIurl,
    json: true,
    headers: { 'User-Agent': 'request' }
  }, (err, incomingRes, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (incomingRes.statusCode !== 200) {
      console.log('Status:', incomingRes.statusCode);
    } else {
      // data is already parsed as JSON
      var npoints = req.params.numPoints;
      var dataObj = data[techAnalysisStr];
      
      var plotData1 = []
      var plotData2 = []
      var plotData3 = []
      
      var ind = 1
      
      for(var key in dataObj) {
          if(ind > parseInt(npoints))
              break;
              
          var date = new Date(String(key));
          var millisecs = date.getTime();
          
          var value1 = parseFloat(dataObj[key][indexStr[0]]);
          var value2 = parseFloat(dataObj[key][indexStr[1]]);
          var value3 = parseFloat(dataObj[key][indexStr[2]]);
          
          plotData1.push([millisecs, value1]);
          plotData2.push([millisecs, value2]);
          plotData3.push([millisecs, value3]);
          
          ind++
      }
      
      plotData1.sort(sortFunction);
      plotData2.sort(sortFunction);
      plotData3.sort(sortFunction);

      // merge 3 arrays
      var plotData = [];
      plotData.push(plotData1);
      plotData.push(plotData2);
      plotData.push(plotData3);

      serverRes.send(plotData);
    }
  });
});

app.get('/(|sma|ema|rsi|adx|cci)/:input/:numPoints', function (req, serverRes) {
  var functionGraph = req.path.split("/")[1].toUpperCase();
  var APIurl = 'https://www.alphavantage.co/query?function=' + functionGraph + '&interval=daily&time_period=10&series_type=open&symbol=' + req.params.input + apikeyStr;
  var techAnalysisStr = "Technical Analysis: " + functionGraph;

  request.get({
    url: APIurl,
    json: true,
    headers: { 'User-Agent': 'request' }
  }, (err, incomingRes, data) => {
    if (err) {
      console.log('Error:', err);
    } else if (incomingRes.statusCode !== 200) {
      console.log('Status:', incomingRes.statusCode);
    } else {
      var npoints = req.params.numPoints;
      var dataObj = data[techAnalysisStr];
      
      var plotData = []
      var ind = 1
      
      for(var key in dataObj) {
        if(ind > parseInt(npoints))
            break
            
        var date = new Date(String(key))
        var millisecs = date.getTime()
        
        var value = parseFloat(dataObj[key][functionGraph])
        plotData.push([millisecs, value])
        
        ind++
      }

      plotData.sort(sortFunction);

      serverRes.send(plotData);
      console.log("Data sent for " + functionGraph);
    }
  });
  console.log('Getting data...');
});

module.exports = app;
