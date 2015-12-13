



var opt = {
            url: {
                tokenUrl: 'https://token.beyondverbal.com/token',
                serverUrl: 'https://apiv3.beyondverbal.com/v3/recording/'
            },
            apiKey:'API KEY',
            audioFile:"C:/Beyond/scarlettapi/BeyondVerbal.Scarlet.WebApi/Dominic16000khz.wav",
            offset:0
        };

var request = require('request');
var fs = require('fs');


function getToken(callback){
    return request.post(opt.url.tokenUrl,
            {form: {
                     grant_type: "client_credentials",
                     apiKey: opt.apiKey 
                    }
            },
                    function(err,resp,body){
                        if(!err){
                            return callback(err,JSON.parse(body).access_token);
                        }
                        else{
                            return callback(err);
                        }
                        
                    });
}

getToken(function(err,token){
    analyzeFile(token,fs.createReadStream(opt.audioFile), 
                        { interval: false},//1000 }, //no analysis:false,  int interval(1000 =1sec) for pull analysis
                        function (err, res) {
                            if (!err) {
                                console.log(JSON.stringify(res,null,4));
                                
                                var filepath = 'C:/Software/BVC/Online/AudioConversation_Test/bin/Debug/logs/test'+
                                    new Date().toISOString().replace(/T/, ' ')
                                    .replace(/\..+/, '')
                                    .replace(' ','_')
                                    .split('-').join('_').split(':').join('_')
                                    +'.txt';
                                
                                fs.writeFileSync(filepath, JSON.stringify(res,null,4));
                                console.log("---------------------------");
                            }
                            else{
                                console.log("Error !!!!");
                                console.log(JSON.stringify(err));
                            }
                        }
)});

    
function analyzeFile(token, stream, options, callback) {
    var startUrl = opt.url.serverUrl+"start";
    if (typeof (options) === "function") {
        callback = options;
        options = {
            interval: 1000
        };
    }
    var interval = options.interval;
    var streaming = interval;
   

    return request.post(startUrl, { 
        json: true, 
        body: { 
            dataFormat: { type: "WAV" } 
        },
        auth: {
            'bearer': token
        } 
    }, function (err, resp, body) {
     
        var recordingId = body.recordingId;
        if(!recordingId)
        {
            console.log(body);
            return;
        }
        
        var analysisUrl = opt.url.serverUrl+recordingId+"/analysis?fromMs="+opt.offset;
        var timer;

        function errorCalback(err) {
            if (timer) { clearInterval(timer); }
            callback(null);
        }

        stream.pipe(request.post(opt.url.serverUrl+recordingId,{ auth: { 'bearer': token } } , 
            function (err, resp, body) {
                if (err) {
                    errorCalback(err);
                } else {
                   // if (!streaming) {
                        var jsonResp = JSON.parse(body)
                        callback(null, jsonResp);
                   // }
                }
            }
        ));

        if (streaming) {
            timer = setInterval(function () {
                request.get(analysisUrl,{ auth: { 'bearer': token } }, function (err, resp, body) {
                    if (err) { errorCalback(err); }
                    else {
                        var jsonResp = JSON.parse(body),
                            sessionStatus = jsonResp.result.sessionStatus;
                        if (sessionStatus === "Processing") {
                            
                            if (jsonResp.result.analysisSegments) {
                                var len = jsonResp.result.analysisSegments.length - 1;
                                opt.offset = jsonResp.result.analysisSegments[len].offset;
                                analysisUrl = opt.url.serverUrl+recordingId+"/analysis?fromMs="+opt.offset
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




