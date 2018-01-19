var tconst = new URLSearchParams(window.location.search).get("tconst");

$(document).ready(function() {
    s3 = new AWS.S3({apiVersion: '2006-03-01'});
    s3.makeUnauthenticatedRequest(
        'listObjects',
        { Bucket: "tvcharts", Prefix: "output/00006/series_title_index/part" },
        function(err, data) {
          if (err) console.log(err, err.stack);
          else {
            var xhr = new XMLHttpRequest();
            xhr.onload = function(e) {
                if (xhr.readyState == xhr.DONE && this.status == 200) {
                    titles = xhr.responseText
                        .split("\n")
                        .map(s => s.split(","))
                        .map(s => { return { value: s[0], label: s[1] }})
                    $("#title").autocomplete({
                        minLength: 3,
                        source: titles,
                        select: function(event, ui) {
                            window.location.href = "?tconst=" + ui.item.value;
                            return false;
                        }
                    });
                }
            }
            xhr.open("GET", "https://s3-us-west-2.amazonaws.com/tvcharts/" + data["Contents"][0]["Key"]);
            xhr.responseType = "text";
            xhr.send()
          }
        }
    );
    s3.makeUnauthenticatedRequest(
        'listObjects',
        { Bucket: "tvcharts", Prefix: "output/00006/series_ratings/part=" + tconst.substring(2,5) },
        function(err, data) {
          if (err) console.log(err, err.stack);
          else {
            var xhr = new XMLHttpRequest();
            xhr.onload = function(e) {if (this.status == 200) {
                series = pako.inflate(
                    new Uint8Array(xhr.response), { to: "string"}
                ).trim().split(/\n/)
                    .map(JSON.parse)
                    .find(r => r["tconst"] == tconst)
                series['episodes'] = series['episodes'].sort(
                    (a, b) => a[12] - b[12] || a[13] - b[13]
                );
                plotChart(series);
            }}
            xhr.open("GET", "https://s3-us-west-2.amazonaws.com/tvcharts/" + data["Contents"][0]["Key"]);
            xhr.responseType = "arraybuffer";
            xhr.send()
          }
        }
    );
});

function plotChart(series) {
    Highcharts.chart('chart', {
        chart: { type: 'scatter' },
        title: { text: series['series'][3] + " (" + series['series'][9] + ")" },
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
        series: [
            {
                name: 'Episodes',
                data: series['episodes'].map(
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
            }
        ]
    });
}
