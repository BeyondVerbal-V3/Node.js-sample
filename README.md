# Node.js-sample
The client application witch shows basic functionality of Beyond Verbal REST API

It require('extend')   library

For install in you project:  npm install extend --save


Usage example
```node
var fs = require('fs')
var Analyzer = require('./analyzer-v3')

var analyzer = Analyzer('YOUR_API_KEY')

analyzer.analyze(fs.createReadStream('C:/path/to/Sample.wav'),function(err,analysis){
  console.log(analysis);
   
 });
```
