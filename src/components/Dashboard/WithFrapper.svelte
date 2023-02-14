<script>
  import Chart from 'svelte-frappe-charts'

  let data = {
    labels: ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'],
    datasets: [
      {
        values: [10, 12, 3, 9, 8, 15, 9],
      },
    ],
    colors: ['red'],
  }
</script>

<Chart {data} type="bar" />
