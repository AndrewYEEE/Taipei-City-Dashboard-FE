<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { computed, defineProps, ref } from 'vue';
import { useMapStore } from '../../store/mapStore';

//以"交通路況"為解析範例

//chart_config 作為ApexChart的option 、 series 作為ApexChart的data 、map_config是針對"地圖交叉比對"圖層設定、activeChart 決定是否渲染
const props = defineProps(['chart_config', 'activeChart', 'series', 'map_config']);

//Map"地圖交叉比對"的全域圖層設定
const mapStore = useMapStore();

// How many data points to show before summing all remaining points into "other"
// 為資料數量的門檻值，預設6筆，超過6筆則要歸納為"other"
const steps = ref(6);

// Donut charts in apexcharts uses a slightly different data format from other chart types
// As such, the following parsing functions are required
// 用於建立 data陣列， 如果資料筆數超出steps.value (6筆)，則第七筆之後，會統一加總
const parsedSeries = computed(() => {
	const toParse = [...props.series[0].data]; //先複製一份資料 (避免Call By Reference的缺陷)
	if (toParse.length <= steps.value) {
		return toParse.map((item) => item.y); //將y值(data)匯出成陣列
	}
	let output = [];
	for (let i = 0; i < steps.value; i++) {
		output.push(toParse[i].y);
	}
	const toSum = toParse.splice(steps.value, toParse.length - steps.value); //從資料陣列中，第6位置開始擷取岀資料
	let sum = 0;
	toSum.forEach(element => sum += element.y); //加總
	output.push(sum); //放入第七筆資料
	return output;
});


//用於建立 Label陣列， 如果資料筆數超出steps.value (6筆)，則第七筆直接設為"其他"
const parsedLabels = computed(() => {
	const toParse = [...props.series[0].data]; //先複製一份資料 (避免Call By Reference的缺陷)
	if (toParse.length <= steps.value) {
		return toParse.map((item) => item.x); //將x值(lebel)匯出成陣列
	}
	let output = [];
	for (let i = 0; i < steps.value; i++) {
		output.push(toParse[i].x);
	}
	output.push('其他');
	return output;
});

//用於在 Dount圖 正中間顯示
const sum = computed(() => {
	return Math.round(
		parsedSeries.value.reduce((a, b) => a + b) * 100
		) / 100; //reduce將一個累加器及陣列中每項元素（由左至右）傳入回呼函式，將陣列化為單一值。
});

// chartOptions needs to be in the bottom since it uses computed data
// chartOptions的設定
const chartOptions = ref({
	chart: {
		offsetY: 10, //決定圖表呈現的Y軸起始點，由左上角為起始位置
	},
	//檢查資料筆數，如果超過steps.value(6筆)，則附加顏色"#848c94"到color陣列後面，以代表'其他'
	colors: props.series.length >= steps.value ? [...props.chart_config.color, '#848c94'] : props.chart_config.color,
	//DataLabels用於格式化圖表上顯示的字與特效，如果文字長度超過6個字，則裁剪
	dataLabels: {
		//formatter用於決定如何處裡label文字，注意: 這裡是"每筆"資料都會進來一遍
		formatter: function (val, { seriesIndex, w }) {
			let value = w.globals.labels[seriesIndex]; //獲取該筆資料的"label"
			return value.length > 7 ? value.slice(0, 6) + "..." : value; //如果文字長度超過6個字，則裁剪
		},
	},
	labels: parsedLabels, //每筆資料的label，超出6筆第7筆直接寫"其他"
	legend: {  //設定右邊的圖例，這裡是設定隱藏圖例
		show: false,
	},
	plotOptions: { //用於控制圖表的樣式、大小、寬度等，包含裡面的Label (上面的dataLabels是用於更改格式)
		pie: { //Pie的圖表用pie控制
			dataLabels: { //控制lebal的起始位置
				offset: 15,
			},
			donut: { //Pie中的子類別Dount在這裡設定
				size: '77.5%', //控制donut的粗細
			},
		}
	},
	stroke: { //設定資料圖區的外框風格
		colors: ['#282a2c'], //外框顏色
		show: true, //是否有外框
		width: 3, //外框寬度
	},
	tooltip: { //設定滑鼠移到資料資料上時顯示的提示資訊框
		followCursor: false, //是否跟著使用者的滑鼠位置
		custom: function ({ series, seriesIndex, w }) { //自訂工具提示框
			// The class "chart-tooltip" could be edited in /assets/styles/chartStyles.css
			return '<div class="chart-tooltip">' +
				'<h6>' + w.globals.labels[seriesIndex] + '</h6>' + //label名稱
				'<span>' + series[seriesIndex] + ` ${props.chart_config.unit}` + '</span>' + //資料與單位 (ex: 55.6 %)
				'</div>';
		},
	},
});

//用於map"地圖交叉比對"的圖層
const selectedIndex = ref(null);

// 用於在使用者點擊圖表特定資料點時更換圖層
// 如果該應用支援map_filter (也就是除了基本Map顯示外還支援顯示不同圖層)
// 如果現在被點擊的資料沒有被點過，則觸發mapStore.addLayerFilter()
function handleDataSelection(e, chartContext, config) {
	// 如果該應用支援map_filter則往下 (也就是除了基本Map顯示外還支援顯示不同圖層)
	if (!props.chart_config.map_filter) { //如果chart_config.map_filter為false，不做事
		return;
	}
	// 如果現在被點擊的資料沒有被點過，則觸發mapStore.addLayerFilter()
	if (config.dataPointIndex !== selectedIndex.value) {
		/*
			"map_config": [
				{
					"index": "work_soil_liquefaction",
					"paint": {
						"fill-color": [
							"match",
							["get", "class"],
							"高",
							"#c87a74",
							"中",
							"#c8b974",
							"低",
							"#9bc874",
							"#9c967f"
						]
					},
					"property": [
						{
							"key": "class",
							"name": "潛勢分級"
						}
					],
					"type": "fill",
					"title": "土壤液化潛勢"
				}
			],
			"chart_config": {
				"types": ["MapLegend"],
				"map_filter": ["class", ["高", "中", "低"]]
			},
		*/
		/*
		mapStore.addLayerFilter(
			"work_soil_liquefaction-fill",
			"class",
			"高");
		*/
		mapStore.addLayerFilter(
			`${props.map_config[0].index}-${props.map_config[0].type}`, 
			props.chart_config.map_filter[0], 
			props.chart_config.map_filter[1][config.dataPointIndex]);
		selectedIndex.value = config.dataPointIndex;
	} else {
		mapStore.clearLayerFilter(`${props.map_config[0].index}-${props.map_config[0].type}`);
		selectedIndex.value = null;
	}
}
</script>

<template>
	<div v-if="activeChart === 'DonutChart'" class="donutchart">
		<apexchart width="100%" type="donut" :options="chartOptions" :series="parsedSeries"
			@dataPointSelection="handleDataSelection">
		</apexchart>
		<div class="donutchart-title">
			<h5>總合</h5>
			<h6>{{ sum }}</h6>
		</div>
	</div>
</template>

<style scoped lang="scss">
.donutchart {
	height: 100%;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	position: relative;
	overflow-y: visible;

	&-title {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		position: absolute;

		h5 {
			color: var(--color-complement-text);
		}

		h6 {
			color: var(--color-complement-text);
			font-size: var(--font-m);
			font-weight: 400;
		}
	}
}
</style>