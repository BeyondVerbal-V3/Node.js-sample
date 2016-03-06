

var request = require('request')
var extend = require('extend')



var defaults = {
    tokenUrl: 'https://token.beyondverbal.com/token',
    serverUrl: 'https://apiv3.beyondverbal.com/v3/recording/',
    //set interval in milliseconds for streaming analysis
    //interval:1000
}


//
// //Usage example
// var fs = require('fs')
// var Analyzer = require('./analyzer-v3')
//
//
// var analyzer = Analyzer('YOUR_API_KEY')
//
// analyzer.analyze(fs.createReadStream('C:/path/to/Sample.wav'),function(err,analysis){
//     console.log(analysis);
//   
// });
module.exports = (apiKey, opts) => {
    var tokenCahced = null;
    var options = extend({}, defaults, opts);
    return {
        analyze: (stream, callback) => {
            if(!tokenCahced) {
                return getToken(apiKey, options, function (err, token) {
                    tokenCahced = token;
                    return analyzeFile(tokenCahced, stream, options, callback);
                });
            }

        return analyzeFile(tokenCahced, stream, options, callback);
    }
        
  };
}


///
/// options.apiKey 
///
function getToken(apiKey, options, callback) {
    return request.post(options.tokenUrl, {
        form: {
            grant_type: "client_credentials",
            apiKey: apiKey
        }
    }, function (err, resp, body) {
        if (!err) {
            return callback(null, JSON.parse(body).access_token);
        } else {
            return callback(err);
        }
    });
}

function analyzeFile(token, stream, options, callback) {
    var startUrl = options.serverUrl + "start";
    var interval = options.interval;
    var streaming = interval;

    //1. start
    return request.post(startUrl, {
        json: true,
        body: { dataFormat: { type: "WAV" } },
        auth: { 'bearer': token }
    }, function (err, resp, body) {

        var timer;
        function errorCalback(err) {
            if (timer) { clearInterval(timer); }
            callback(err);
        }

        if (err) {
            return errorCalback(err);
        }

        var recordingUrl = options.serverUrl + body.recordingId;
        stream.pipe(request.post(recordingUrl, { auth: { 'bearer': token } },
            function (err, resp, body) {
                if (err) {
                    errorCalback(err);
                } else {
                    // if (!streaming) {
                    var jsonResp = JSON.parse(body)
                    callback(null, jsonResp);
                    // }
                }
            }));

        if (streaming) {
            var offset = 0;
            timer = setInterval(function () {

                var analysisUrl = recordingUrl + "/analysis?fromMs=" + offset;
                return request.get(analysisUrl, { auth: { 'bearer': token } }, function (err, resp, body) {
                    if (err) { return errorCalback(err); }
                    else {
                        var jsonResp = JSON.parse(body),
                            sessionStatus = jsonResp.result.sessionStatus;
                        if (sessionStatus === "Processing") {

                            if (jsonResp.result.analysisSegments) {
                                //calculate and update ooset
                                var len = jsonResp.result.analysisSegments.length - 1;
                                offset = jsonResp.result.analysisSegments[len].offset;
                                callback(null, jsonResp.result);
                            }

                        } else if (sessionStatus === "Done") {
                            if (timer) {
                                clearInterval(timer);
                            }
                            callback(null, jsonResp.result);
                        }
                    }
                })
            }, interval);
        }
        return;
    });
}


