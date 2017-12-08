var app = angular.module('stockApp', ['ngMaterial', 'angularMoment', 'ngAnimate']);
// app.controller('formCtrl', function($scope, $http, moment) {
app.controller('formCtrl', ['$scope', '$http', 'moment', '$interval', function($scope, $http, moment, $interval) {
    $scope.toggle = false;
    $scope.quoteBtnToggle = true;

    $scope.records = [];
    
    $scope.contentLoaded = false;
    $scope.getQuoteBtnClicked = false;
    $scope.stockDetailsFetchError = false;
    $scope.favStock = false;

    $scope.graphsReady = {
        'pricevol' : false,
        'sma' : false,
        'ema' : false,
        'stoch' : false,
        'rsi' : false,
        'adx' : false,
        'cci' : false,
        'bbands' : false,
        'macd' : false
    };

    $scope.graphsError = {
        'pricevol' : false,
        'sma' : false,
        'ema' : false,
        'stoch' : false,
        'rsi' : false,
        'adx' : false,
        'cci' : false,
        'bbands' : false,
        'macd' : false
    };

    $scope.priceVolumeData = [];
    $scope.smaData = [];
    $scope.emaData = [];
    $scope.stochData = [];
    $scope.rsiData = [];
    $scope.adxData = [];
    $scope.cciData = [];
    $scope.bbandsData = [];
    $scope.macdData = [];

    $scope.favList = [];
    $scope.sortSelectedItem = "Default";
    $scope.orderSelectedItem = "Descending";

    if (typeof(Storage) !== "undefined") {
        var flist = localStorage.getItem("favListLocal");
        if(flist != null && flist !== "null" && flist != "") {
            $scope.favList = JSON.parse(flist);
        }
    } else {
        alert('Local storage not supported!');
    }

    $scope.$watch('favList', updateLocalStorage, true);

    function updateLocalStorage() {
        if (typeof(Storage) !== "undefined") {
            localStorage.setItem("favListLocal", JSON.stringify($scope.favList));
        }
    }

    function searchStockInFavList(symbol) {
        for(var i = 0, len = $scope.favList.length; i < len; i++) {
            var fsymbol = $scope.favList[i].symbol;
            if(fsymbol == symbol) {
                return i;
            }
        }
        return -1;
    }
    
    $scope.refreshClick = function() {
        refreshList();
    };

    var backendserver = "http://node-express-env.rvwxchbskw.us-west-1.elasticbeanstalk.com";
    var localserver = "http://localhost:8080";

    function refreshList() {
        var url = backendserver + "/stockDetails/";
        
        var sfavList = $scope.favList;
        sfavList.forEach(function(favItem, index) {
            
            $http.get(url + favItem.symbol)
            .then(function(results) {
                if(JSON.stringify(results.data).includes("Meta Data") == true) {
                    var sdata = results.data;
                    var obj = [];

                    var prclose = 0;
                    var close = 0;
                    var timeseriesDataObjects = sdata["Time Series (5min)"];

                    var i=0;
                    for(var key in timeseriesDataObjects) {
                        if(timeseriesDataObjects.hasOwnProperty(key)) {
                            if(i == 0) {
                                close = timeseriesDataObjects[key]["4. close"];
                            }
                            if(i == 1) {
                                prclose = timeseriesDataObjects[key]["4. close"];
                                break;
                            }
                        }
                        i++;
                    }

                    var lastrefreshed = sdata["Meta Data"]["3. Last Refreshed"];

                    var change = close - prclose;
                    var changePercent = (change / prclose) * 100;
                    
                    var price = sdata["Time Series (5min)"][lastrefreshed]["4. close"];
                    var volume = sdata["Time Series (5min)"][lastrefreshed]["5. volume"];
                    // console.log("previous value : " + sfavList[index].price);
                    // console.log("current value : " + price);

                    sfavList[index].price = price;
                    sfavList[index].change = change;
                    sfavList[index].changePercent = changePercent;
                    sfavList[index].volume = volume;

                    console.log(favItem.symbol + " refreshed");
                }
                else {
                    console.log(favItem.symbol + " not refreshed");
                }
            });
        });
    }

    $scope.autoRefresh = false;
    $(function() {
        $('#autorefreshToggle').change(function() {
            $scope.autoRefresh = !$scope.autoRefresh;
        });
    });

    $interval(function () {
        if($scope.autoRefresh == true) {
            refreshList();
        }
    }, 5000);

    function drawPriceVolumeGraph() {
        
        var priceData = $scope.priceVolumeData[0].slice(870);
        var volumeData = $scope.priceVolumeData[1].slice(870);
        
        minPrice = 10000;
        maxVolume = 0;
        
        for(i = 0; i < 130; i++) {
            if(minPrice > priceData[i][1])
                minPrice = priceData[i][1];

            if(maxVolume < volumeData[i][1])
                maxVolume = volumeData[i][1];
        }

        minPrice = minPrice - 10;
        maxVolume = maxVolume + 5;

        var callDate = moment.unix(parseInt(priceData[0][0])/1000).format("MM/DD/YYYY");
        console.log(callDate);

        var options = {
            chart: {
                type: 'area',
                zoomType: 'xy'
            },
            title: {
                text: $scope.searchText + ' Stock Price and Volume'
            },
            subtitle: {
                text: '<a href="https://www.alphavantage.co" target="_blank">Source: Alpha Vantage</a>',
                style : {
                    color: '#0000FF'
                }
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    week: '%m/%d'
                },
                tickLength: 4,
                tickInterval: 24 * 3600 * 1000 * 7
            },

            yAxis: [{
                title: {
                    text: 'Stock Price'
                },
                tickAmount: 8,
                min: minPrice
            }, {
                title: {
                    text: 'Volume'
                },
                labels: {
                    format: '{value}M'
                },

                max: maxVolume,
                tickAmount: 8,
                tickInterval: 50,
                opposite: true
            }],
            
            tooltip: {
                formatter: function() {
                    var d = new Date(this.x)
                    var datestring =  ("0"+(d.getMonth()+1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2)
                    return datestring + '<br><span style="color: ' + this.series.color + '">\u25CF</span> ' + this.series.name + ' : ' + '<b>' + this.y + '</b>'
                }
            },
            plotOptions: {
                column: {
                    pointPadding: 3
                },
                area: {
                    lineColor: '#1D00FF',
                    lineWidth: 1
                }
            },
            series: [{
                name: 'Price',
                type: 'area',
                color: '#E6E5FF',
                yAxis: 0,
                data: priceData
            }, {
                name: 'Volume',
                color: '#FF0000',
                type: 'column',
                pointWidth: 2,
                yAxis: 1,
                data: volumeData
            }]
        };
        options.chart.renderTo = 'pvDiv';
        var chart = new Highcharts.Chart(options);
    }

    function drawSingleSeriesGraph(graph, title, plotData) {
        var renderDiv = graph + 'Div';

        var options = {
            chart: {
                renderTo: renderDiv,
                type: 'line'
            },
            title: {
                text: title
            },
            subtitle: {
                text: '<a href="https://www.alphavantage.co" target="_blank">Source: Alpha Vantage</a>',
                style : {
                    color: '#0000FF'
                }
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    week: '%m/%d'
                },
                tickLength: 5,
                tickInterval: 24 * 3600 * 1000 * 7
            },

            yAxis: {
                title: {
                    text: graph.toUpperCase()
                }
            },
            
            tooltip: {
                formatter: function() {
                    var d = new Date(this.x)
                    var datestring =  ("0"+(d.getMonth()+1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2)
                    return datestring + '<br><span style="color: ' + this.series.color + '">●</span> ' + this.series.name + ' : ' + '<b>' + this.y + '</b>'
                }
            },
            series: [{
                name: $scope.searchText,
                color: '#F49591',
                data: plotData
            }]
        };
        options.chart.renderTo = renderDiv;
        var chart = new Highcharts.Chart(options);
    };

    function drawDoubleSeriesGraph(graph, title, plotData) {
        var renderDiv = graph + 'Div';
        
        var slowKData = plotData[0];
        var slowDData = plotData[1];

        var options = {
            chart: {
                type: 'line',
                zoomType: 'xy'
            },
            title: {
                text: title
            },
            subtitle: {
                text: '<a href="https://www.alphavantage.co" target="_blank">Source: Alpha Vantage</a>',
                style : {
                    color: '#0000FF'
                }
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    week: '%m/%d'
                },
                tickLength: 5,
                tickInterval: 24 * 3600 * 1000 * 7
            },

            yAxis: {
                title: {
                    text: graph.toUpperCase()
                }
            },
            
            tooltip: {
                formatter: function() {
                    var d = new Date(this.x)
                    var datestring =  ("0"+(d.getMonth()+1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2)
                    return datestring + '<br><span style="color: ' + this.series.color + '">\u25CF</span> ' + this.series.name + ' : ' + '<b>' + this.y + '</b>'
                }
            },
            series: [{
                name: $scope.searchText + ' SlowK',
                color: '#f93e3e',
                data: slowKData
            },
            {
                name: $scope.searchText + ' SlowD',
                color: '#77b9ff',
                data: slowDData
            }]
        };

        options.chart.renderTo = renderDiv;
        var chart = new Highcharts.Chart(options);
    }

    function drawTripleSeriesGraph(graph, title, plotData) {
        var renderDiv = graph + 'Div';
        
        var plotData1 = plotData[0];
        var plotData2 = plotData[1];
        var plotData3 = plotData[2];

        var plotSeriesText = [];

        switch(graph) {
            case "bbands":
                plotSeriesText.push("MACD");
                plotSeriesText.push("MACD_Hist");
                plotSeriesText.push("MACD_Signal");
            break;
            case "macd":
                plotSeriesText.push("Real Middle Band");
                plotSeriesText.push("Real Lower Band");
                plotSeriesText.push("Real Upper Band");
            break;
        }

        var options = {
            chart: {
                type: 'line',
                zoomType: 'xy'
            },
            title: {
                text: title
            },
            subtitle: {
                text: '<a href="https://www.alphavantage.co" target="_blank">Source: Alpha Vantage</a>',
                style : {
                    color: '#0000FF'
                }
            },
            xAxis: {
                type: 'datetime',
                dateTimeLabelFormats: {
                    week: '%m/%d'
                },
                tickLength: 5,
                tickInterval: 24 * 3600 * 1000 * 7
            },
            yAxis: {
                title: {
                    text: graph.toUpperCase()
                }
            },
            tooltip: {
                formatter: function() {
                    var d = new Date(this.x)
                    var datestring =  ("0"+(d.getMonth()+1)).slice(-2) + "/" + ("0" + d.getDate()).slice(-2)
                    return datestring + '<br><span style="color: ' + this.series.color + '">\u25CF</span> ' + this.series.name + ' : ' + '<b>' + this.y + '</b>'
                }
            },
            series: [{
                name: $scope.searchText + " " + plotSeriesText[0],
                color: '#FF0000',
                data: plotData1
            },
            {
                name: $scope.searchText + " " + plotSeriesText[1],
                color: '#000000',
                data: plotData2
            },
            {
                name: $scope.searchText + " " + plotSeriesText[2],
                color: '#B6EDAC',
                data: plotData3
            }]
        };

        options.chart.renderTo = renderDiv;
        var chart = new Highcharts.Chart(options);
    }

    function drawHistoricalChart() {
        options = {
            chart: {
            },
    
            title: {
                text: $scope.searchText + ' Stock Value'
            },
    
            subtitle: {
                text: '<a href="https://www.alphavantage.co">Source: Alpha Vantage</a>',
                style : {
                    color: '#0000FF'
                }
            },
    
            rangeSelector: {
                selected: 0,
                buttons: [
                {
                    type: 'week',
                    count: 1,
                    text: '1w'
                },
                {
                    type: 'month',
                    count: 1,
                    text: '1m',
                }, 
                {
                    type: 'month',
                    count: 3,
                    text: '3m'
                },
                {
                    type: 'month',
                    count: 6,
                    text: '6m'
                },
                {
                    type: 'ytd',
                    text: 'YTD'
                }, 
                {
                    type: 'year',
                    count: 1,
                    text: '1y'
                }, 
                {
                    type: 'all',
                    text: 'All'
                }]
            },
    
            series: [{
                name: $scope.searchText + ' Stock Price',
                data: $scope.priceVolumeData[0],
                type: 'area',
                threshold: null,
                tooltip: {
                    valueDecimals: 2
                }
            }],
    
            responsive: {
                rules: [{
                    condition: {
                        maxWidth: 500
                    },
                    chartOptions: {
                        chart: {
                            height: 300
                        },
                        subtitle: {
                            text: null
                        },
                        navigator: {
                            enabled: false
                        }
                    }
                }]
            }
        };
        options.chart.renderTo = "histDiv";
        var chart = new Highcharts.stockChart(options);
    }

    $scope.records = $scope.getAutoCompleteResults = function (text) {
        if(text !== '') {
            var url = backendserver + "/autocomplete/" + text;
            return $http.get(url)
            .then(function(results) {
                return results.data;
            });
        }
    };
    
    $scope.clearBtnClick = function() {
        $scope.toggle = false;
        $scope.getQuoteBtnClicked = false;
        $scope.searchText = "";
    };

    var sort_by = function(field, reverse, primer){
        var key = primer ? function(x) {return primer(x[field])} : function(x) {return x[field]};
    
        reverse = !reverse ? 1 : -1;
    
        return function (a, b) {
            return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
        } 
    };

    $scope.sortItems = function() {
        console.log($scope.sortSelectedItem + " " + $scope.orderSelectedItem);
        var reverseOption = false;

        if($scope.orderSelectedItem == "Descending")
            reverseOption = true;

        switch($scope.sortSelectedItem) {
            case "Symbol":
                $scope.favList = $scope.favList.sort(sort_by('symbol', reverseOption, function(a){return a}));
                break;
            case "Price":
                $scope.favList = $scope.favList.sort(sort_by('price', reverseOption, parseFloat));
                break;
            case "Change":
                $scope.favList = $scope.favList.sort(sort_by('change', reverseOption, parseFloat));
                break;
            case "Change Percent":
                $scope.favList = $scope.favList.sort(sort_by('changePercent', reverseOption, parseFloat));
                break;
            case "Volume":
                $scope.favList = $scope.favList.sort(sort_by('volume', reverseOption, parseInt));
                break;
        }
    }

    $scope.deleteRow = function($event) {
        var btn = $event.currentTarget;
        var row = btn.parentNode.parentNode;
        var index = searchStockInFavList(row.cells[0].innerHTML);
        $scope.favList.splice(index, 1);
        
        row.parentNode.removeChild(row);
        $scope.favStock = false;
    };

    $scope.favBtnClick = function() {
        var index = searchStockInFavList($scope.searchText);
        if(index == -1) {
            var obj = new Object();
            obj.symbol = $scope.searchText;
            obj.price = $scope.lastPrice;
            obj.change = $scope.change;;
            obj.changePercent = $scope.changePercent;
            obj.volume = $scope.volume;

            $scope.favList.push(obj);
            $scope.favStock = true;
        }
        else {
            $scope.favList.splice(index, 1);
            $scope.favStock = false;
        }
    };

    $scope.getStockDetails = function(text) {
        $scope.favStock = false;
        $scope.contentLoaded = false;

        if(searchStockInFavList($scope.searchText) != -1) {
            $scope.favStock = true;
        }

        $scope.getQuoteBtnClicked = true;
        $scope.toggle = true;
        $scope.stockDetailsFetchError = false;
        $scope.graphsError = {
            'pricevol' : false,
            'sma' : false,
            'ema' : false,
            'stoch' : false,
            'rsi' : false,
            'adx' : false,
            'cci' : false,
            'bbands' : false,
            'macd' : false
        };

        $scope.graphsReady = {
            'pricevol' : false,
            'sma' : false,
            'ema' : false,
            'stoch' : false,
            'rsi' : false,
            'adx' : false,
            'cci' : false,
            'bbands' : false,
            'macd' : false
        };

        var url = backendserver + "/stockDetails/" + text;

        $http.get(url)
        .then(function(results) {
            if(JSON.stringify(results.data).includes("Meta Data") == true) {
                var sdata = results.data;
                $scope.priceVolumeData = sdata;
                var obj = [];

                var prclose = 0;
                var close = 0;
                var timeseriesDataObjects = sdata["Time Series (5min)"];

                var i=0;
                for(var key in timeseriesDataObjects) {
                    if(timeseriesDataObjects.hasOwnProperty(key)) {
                        if(i == 0) {
                            close = timeseriesDataObjects[key]["4. close"];
                        }
                        if(i == 1) {
                            prclose = timeseriesDataObjects[key]["4. close"];
                            break;
                        }
                    }
                    i++;
                }

                var lastrefreshed = sdata["Meta Data"]["3. Last Refreshed"];

                $scope.change = close - prclose;
                $scope.changePercent = ($scope.change / prclose) * 100;
                
                $scope.stockSymbol = sdata['Meta Data']['2. Symbol'];
                $scope.lastPrice = sdata["Time Series (5min)"][lastrefreshed]["4. close"];
                
                var timezoneAbbr = moment.tz(lastrefreshed, 'America/New_York').zoneAbbr();
                $scope.timestamp = lastrefreshed + " " + timezoneAbbr;

                $scope.open = sdata["Time Series (5min)"][lastrefreshed]["1. open"];
                $scope.close = sdata["Time Series (5min)"][lastrefreshed]["4. close"];
                
                var formatStr = "HH:mm:ss";
                var currentTime = moment().tz("America/New_York");
                var beforeTime = moment('09:30:00', formatStr);
                var afterTime = moment('16:00:00', formatStr);

                if(currentTime.isBetween(beforeTime, afterTime)) {
                    $scope.closeStr = "Previous Close";
                }
                else {
                    $scope.closeStr = "Close";
                }

                $scope.high = sdata["Time Series (5min)"][lastrefreshed]["2. high"];
                $scope.low = sdata["Time Series (5min)"][lastrefreshed]["3. low"];
                $scope.volume = sdata["Time Series (5min)"][lastrefreshed]["5. volume"];

                $scope.contentLoaded = true;
            }
            else {
                $scope.stockDetailsFetchError = true;
            }
        });

        $http.get(backendserver + '/stockNews/' + text)
        .then(function(results) {
            $scope.newsObj = results.data;
        });

        $http.get(backendserver + '/timeseries/' + text + '/1000')
        .then(function(results) {
            $scope.priceVolumeData = results.data;

            if(results.data[0].length == 0) {
                $scope.graphsError.pricevol = true;
            }
            else {
                drawPriceVolumeGraph();
                $scope.graphsReady.pricevol = true;
                drawHistoricalChart();
            }
        });

        $http.get(backendserver + '/sma/' + text + '/130')
        .then(function(results) {
            $scope.smaData = results.data;

            if(results.data.length == 0) {
                $scope.graphsError.sma = true;
            }
            else {
                drawSingleSeriesGraph('sma', 'Simple Moving Average (SMA)', $scope.smaData);
                $scope.graphsReady.sma = true;
            }
        });

        $http.get(backendserver + '/ema/' + text + '/130')
        .then(function(results) {
            $scope.emaData = results.data;
            
            if(results.data.length == 0) {
                $scope.graphsError.ema = true;
            }
            else {
                drawSingleSeriesGraph('ema', 'Exponential Moving Average (SMA)', $scope.emaData);
                $scope.graphsReady.ema = true;
            }
        });

        $http.get(backendserver + '/rsi/' + text + '/130')
        .then(function(results) {
            $scope.rsiData = results.data;

            if(results.data.length == 0) {
                $scope.graphsError.rsi = true;
            }
            else {
                drawSingleSeriesGraph('rsi', 'Relative Strength Index (RSI)', $scope.rsiData);
                $scope.graphsReady.rsi = true;
            }
        });

        $http.get(backendserver + '/adx/' + text + '/130')
        .then(function(results) {
            $scope.adxData = results.data;

            if(results.data.length == 0) {
                $scope.graphsError.adx = true;
            }
            else {
                drawSingleSeriesGraph('adx', 'Average Directional movement indeX (ADX)', $scope.adxData);
                $scope.graphsReady.adx = true;
            }
        });

        $http.get(backendserver + '/cci/' + text + '/130')
        .then(function(results) {
            $scope.cciData = results.data;
            
            if(results.data.length == 0) {
                $scope.graphsError.cci = true;
            }
            else {
                drawSingleSeriesGraph('cci', 'Commodity Channel Index (CCI)', $scope.cciData);
                $scope.graphsReady.cci = true;
            }
        });

        $http.get(backendserver + '/stoch/' + text + '/130')
        .then(function(results) {
            $scope.stochData = results.data;
            
            if(results.data[0].length == 0) {
                $scope.graphsError.stoch = true;
            }
            else {
                drawDoubleSeriesGraph('stoch', 'Stochastic Oscillator (STOCH)', $scope.stochData);
                $scope.graphsReady.stoch = true;
            }
        });

        $http.get(backendserver + '/bbands/' + text + '/130')
        .then(function(results) {
            $scope.bbandsData = results.data;
            
            if(results.data[0].length == 0) {
                $scope.graphsError.bbands = true;
            }
            else {
                drawTripleSeriesGraph('bbands', 'Bollinger Bands (BBANDS)', $scope.bbandsData);
                $scope.graphsReady.bbands = true;
            }
        });

        $http.get(backendserver + '/macd/' + text + '/130')
        .then(function(results) {
            $scope.macdData = results.data;
            
            if(results.data[0].length == 0) {
                $scope.graphsError.macd = true;
            }
            else {
                drawTripleSeriesGraph('macd', 'Moving Average Convergence/Divergence (MACD)', $scope.macdData);
                $scope.graphsReady.macd = true;
            }
        });

    };

    $scope.shareOnFB = function() {
        // FB.ui({
        //     app_id: "875021415993850",
        //     method: 'feed',
        //     picture: URL_OR_PICTURE
        // }, function(response){
        //     if (response && !response.error_message) {
        //         alert('Posting completed.');
        //     } else {
        //         alert('Error while posting.');
        //     }
        // });
        
    }

    $scope.toggleFunc = function() {
        $scope.toggle = !$scope.toggle;
    };

    $scope.toggleQuoteBtn = function() {
        $scope.quoteBtnToggle = false;
    };

    $scope.checkEmptyInput = function() {
        if($scope.searchText == "") {
            $scope.quoteBtnToggle = true;
        }
        if($scope.getQuoteBtnClicked == true) {
            $scope.quoteBtnToggle = true;
        }
    }
}]);