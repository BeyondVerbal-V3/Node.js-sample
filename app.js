

var fs = require('fs')
var Analyzer = require('./analyzer-v3')


var analyzer = new Analyzer('YOU API KEY')

analyzer.analyze(fs.createReadStream('C:/Audio.wav'),function(err,analysis){
    console.log(analysis);
  
});


