var chart = Highcharts.chart('chart', {
    chart: { type: 'scatter' },
    title: { text: '' },
    xAxis: {
        min: 0,
        title: { text: 'Episodes' },
        startOnTick: true,
        endOnTick: true,
        showLastLabel: true,
        gridLineWidth: 0,
        tickWidth: 0,
        labels: { enabled: false }
    },
    yAxis: {
        max: 10,
        title: { text: 'IMDb Rating' }
    },
    legend: { enabled: false },
    tooltip: {
        formatter: function() {
            return [
            "<b>S", this.point.season, "E", this.point.episode, "</b>", "<br>",
            this.point.name, "<br>",
            "Rating: ", this.point.rating || 0.0, "<br>",
            "Votes: ", this.point.votes || 0
            ].join("")
        }
    },
    series: [{ name: 'Episodes' }]
});

$(document).ready(function() {
    s3 = new AWS.S3({apiVersion: '2006-03-01'});
    s3.makeUnauthenticatedRequest(
        'listObjects',
        { Bucket: "tvcharts", Prefix: "output/20180127T052230/series_title_index/part" },
        function(err, data) {
            if (err) console.log(err, err.stack);
            else {
                bloodhound = new Bloodhound({
                    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('title'),
                    queryTokenizer: Bloodhound.tokenizers.whitespace,
                    prefetch: {
                        url: "https://s3-us-west-2.amazonaws.com/tvcharts/" + data["Contents"][0]["Key"],
                        thumbprint: data["Contents"][0]["ETag"],
                        transport: function (options, onSuccess, onError) {
                            var xhr = new XMLHttpRequest();
                            xhr.onload = function(e) {
                                if (this.status == 200) {
                                    onSuccess(
                                        xhr.responseText
                                            .split("\n")
                                            .map(s => s.split(","))
                                            .map(s => { return { tconst: s[0], title: s[1] }})
                                    );
                                }
                            }
                            xhr.open("GET", options['url'], true);
                            xhr.responseType = "text";
                            xhr.send()
                        }
                    }
                });
                $('#bloodhound .typeahead').typeahead(
                    {
                        hint: true,
                        highlight: true,
                        minLength: 1
                    },
                    {
                        name: 'titles',
                        displayKey: 'title',
                        source: bloodhound.ttAdapter(),
                        templates: {
                            empty: [
                                '<div class="empty-message">',
                                    'unable to find any results that match the current query',
                                '</div>'
                            ].join('\n')
                        }
                    }
                ).bind('typeahead:select', function(ev, suggestion) {
                    gotoSeries(suggestion['tconst']);
                    $("#bloodhound .typeahead").typeahead('close');
                });
            }
        }
    );
    window.onpopstate = function(event) {
        loadSeries(event.state.tconst);
    };
    gotoSeries(new URLSearchParams(window.location.search).get("tconst"));
});

function gotoSeries(tconst) {
    history.pushState({tconst: tconst}, "", "index.html?tconst=" + tconst);
    loadSeries(tconst);
}

function loadSeries(tconst) {
    chart.showLoading();
    s3.makeUnauthenticatedRequest(
        'listObjects',
        { Bucket: "tvcharts", Prefix: "output/20180127T052230/series_ratings/part=" + tconst.substring(2,5) },
        function(err, data) {
            if (err) console.log(err, err.stack);
            else {
                var xhr = new XMLHttpRequest();
                xhr.onload = function(e) {
                    if (this.status == 200) {
                        series = pako.inflate(
                            new Uint8Array(xhr.response), { to: "string"}
                        ).trim().split(/\n/).map(JSON.parse).find(r => r["tconst"] == tconst)
                        series['episodes'] = series['episodes'].sort((a, b) => a[12] - b[12] || a[13] - b[13]);
                        plotChart(series);
                    }
                }
                xhr.open("GET", "https://s3-us-west-2.amazonaws.com/tvcharts/" + data["Contents"][0]["Key"], true);
                xhr.responseType = "arraybuffer";
                xhr.send()
            }
        }
    );
}

function plotChart(series) {
    chart.hideLoading();
    chart.setTitle({text: series['series'][3]});
    chart.setSubtitle({text: series['series'][9] + "/10.0  " + series['series'][10]});
    chart.series[0].setData(
        series['episodes'].map(
            e => {
                return {
                    'name': e[3],
                    'season': e[12],
                    'episode': e[13],
                    'rating': e[9] || 0,
                    'votes': e[10],
                    'y': parseFloat(e[9] || 0)
                }
            }
        )
    );
}
