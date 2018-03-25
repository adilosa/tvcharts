# TVCharts

Chart the IMDb Ratings for episodes of a TV Series over time.

## Details
* Uses official [IMDb datasets](https://www.imdb.com/interfaces/)
* Builds search index and show ratings index using Spark / EMR
* Automatically ingest new data daily using AWS Data Pipeline and EC2 Spot Instances 
* Data chunks loaded asynchronously from S3 and cached
* Asynchronous page loads using HTML 5 History API
* GZIP data infalted via [Pako](https://nodeca.github.io/pako/)
* Plots charts using [Highcharts](https://www.highcharts.com/products/highcharts/)
* Search powered by [Twitter Typeahead.js/Bloodhound](https://github.com/twitter/typeahead.js/blob/master/doc/bloodhound.md)
