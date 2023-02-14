<script>
  import FusionCharts from 'fusioncharts'
  import Timeseries from 'fusioncharts/fusioncharts.timeseries'
  import SvelteFC, { fcRoot } from 'svelte-fusioncharts'

  fcRoot(FusionCharts, Timeseries)

  let promise,
    jsonify = (res) => res.json(),
    dataFetch = fetch('src/components/Dashboard/data.json').then(jsonify),
    schemaFetch = fetch('src/components/Dashboard/schema.json').then(jsonify)

  promise = Promise.all([dataFetch, schemaFetch])

  const getChartConfig = ([data, schema]) => {
    const fusionDataStore = new FusionCharts.DataStore(),
      fusionTable = fusionDataStore.createDataTable(data, schema)

    return {
      type: 'timeseries',
      width: '50%',
      height: 450,
      renderAt: 'chart-container',
      dataSource: {
        data: fusionTable,
        theme: 'fusion',
        caption: {
          text: 'Web visits & downloads',
        },
        subcaption: {
          text: 'since 2015',
        },
        yAxis: [
          {
            plot: [
              {
                value: 'Downloads',
                type: 'column',
              },
              {
                value: 'Web Visits',
                type: 'line',
              },
            ],
          },
        ],
      },
    }
  }
</script>

<div id="chart-container">
  {#await promise}
    <p>Fetching data and schema...</p>
  {:then value}
    <SvelteFC {...getChartConfig(value)} />
  {:catch error}
    <p>Something went wrong: {error.message}</p>
  {/await}
</div>
