<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { ref } from 'vue';

const props = defineProps(['chart_config', 'series', 'history_data_color']);

// chartOptions的設定
const chartOptions = ref({
	chart: {
		toolbar: { //設置工具箱，位於圖表上方，這裡只開啟reset功能
			tools: {
				download: false,
				pan: false,
				reset: '<p>' + '重置' + '</p>',
				zoomin: false,
				zoomout: false,
			}
		}
	},
	//用於控制Area的顏色(曲線圖裡側)，取決於all_components.json設定
	//注意，這裡history_data_color是陣列，ex:["#EC4037", "#BBB"]，ApexChart會自動依種類順序對照套用顏色
	colors: props.history_data_color ? props.history_data_color : props.chart_config.color,
	//資料標籤，這裡關閉
	dataLabels: {
		enabled: false,
	},
	//背景網格線設定，這裡設定不顯示
	grid: {
		show: false,
	},
	//設定圖例，這裡是如果資料總類數大於1則啟用
	legend: {
		show: props.series.length > 1 ? true : false,
	},
	//設定每個資料點的風格，這裡是控制圓圈圈style
	markers: {
		hover: {
			size: 5,
		},
		size: 3,
		strokeWidth: 0,
	},
	//設定資料的外框風格，這裡因為是曲線圖，所以是線的風格
	//注意，這裡history_data_color是陣列
	stroke: {
		colors: props.history_data_color ? props.history_data_color : props.chart_config.color,
		curve: 'smooth',
		show: true,
		width: 2,
	},
	//設定滑鼠移到資料資料上時顯示的提示資訊框
	//注意: dataPointIndex只有在有座標的圖表才有用，其他都是undefined，例如:Dount Chart
	tooltip: {
		custom: function ({ series, seriesIndex, dataPointIndex, w }) {
			// The class "chart-tooltip" could be edited in /assets/styles/chartStyles.css
			return '<div class="chart-tooltip">' +
				'<h6>' + `${w.config.series[seriesIndex].data[dataPointIndex].x}` + '</h6>' +
				'<span>' + series[seriesIndex][dataPointIndex] + ` ${props.chart_config.unit}` + '</span>' +
				'</div>';
		},
	},
	//設置X軸的風格與資料格式，這裡設定為datetime
	xaxis: {
		axisBorder: {
			color: '#555',
			height: '0.8',
		},
		axisTicks: {
			color: '#555',
		},
		crosshairs: {
			show: false,
		},
		tooltip: {
			enabled: false,
		},
		type: 'datetime',
	},
});
</script>

<template>
	<div>
		<apexchart width="100%" height="140px" type="area" :options="chartOptions" :series="series"></apexchart>
	</div>
</template>