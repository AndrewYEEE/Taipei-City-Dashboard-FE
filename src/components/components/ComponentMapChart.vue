<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<!-- This component has two modes 'normal mapview charts' / 'basic map layers' -->
<!-- The different modes are controlled by the prop "isMapLayer" (default false) -->

<script setup>
import { ref, computed } from 'vue';
import { useMapStore } from '../../store/mapStore';
import { useDialogStore } from '../../store/dialogStore';

import { chartTypes } from '../../assets/configs/apexcharts/chartTypes';

const mapStore = useMapStore();
const dialogStore = useDialogStore();

//=======Props========//
const props = defineProps({
	// The complete config (incl. chart data) of a dashboard component will be passed in
	content: { type: Object }, //contents是每個單一元件的chartdata，如果是一般元件，則包含chartData與historyData
	isMapLayer: { type: Boolean, default: false }, //是否是"map-layer"
}); //接收父元件的Props


//=======Ref========//
// The default active chart is the first one in the list defined in the dashboard component
//從content中獲取chart_config指定的第一個Chart樣式，具體可以參考all_components.json
//用來決定當前圖表要不要渲染
const activeChart = ref(props.content.chart_config.types[0]);

// Stores whether the component is toggled on or not
// 用來判斷圖表右邊的按鈕是否被點擊
const checked = ref(false);


//=======Computed========//
// Parses time data into display format
// 獲取圖表日期 
// 如果沒有time_from則dataTime()回傳"固定資料"
// 如果沒有time_to則dataTime()是擷取time_from的結果 (ex: "2023-01-01T23:59:59+08:00" 會擷取 "2023-01-01")
// 否則回傳time_from~time_to日期部份 (ex:  "2023-01-01" ~ "2023-01-03" )
const dataTime = computed(() => {
	if (!props.content.time_from) {
		return '固定資料';
	}
	if (!props.content.time_to) {
		return props.content.time_from.slice(0, 10);
	}
	return `${props.content.time_from.slice(0, 10)} ~ ${props.content.time_to.slice(0, 10)}`;
});

// If any map layers are loading, disable the toggle
// 如果現在應用沒有map_config直接回傳false
// 組合當前應用的MapLayerId (有用到的Layer的ID)，如果有任何一個用到的Layer還在Loading，則回傳true
// 應該是用於判斷是否所有要用到的Layer都準備好，準備好則回傳false
// (注意!!!!!!!) 然而，我覺得這個功能沒用，因為mapStore中，this.loadingLayers.push()推入的都不是LayerID而是"rending"字串!!!!
const shouldDisable = computed(() => {
	if (!props.content.map_config) return false;

	//從all_component.json獲取，例如"土壤液化潛勢"應用，這裡會是"work_soil_liquefaction-fill"
	//如果map_config中有多組設定，則這裡就有多組ID
	const allMapLayerIds = props.content.map_config.map((el) => `${el.index}-${el.type}`);

	//filter會將條件為true元素加入、includes會檢查輸入元素是否有在Array
	//檢查loadingLayers[]中，有沒有元素，是allMapLayerIds[]有的，有的話就回傳true
	//我猜這裏的邏輯是: 如果當前應用要用到的任一Layer還在Loading (loadingLayers裡)，就要回傳true
	return mapStore.loadingLayers.filter((el) => allMapLayerIds.includes(el)).length > 0;
});


//=======Method========//
// Open and closes the component as well as communicates to the mapStore to turn on and off map layers
// 左側應用旁的按鈕
// 如果Check Ref=true (代表被點開)，則呼叫addToMapLayerList()加入當前應用的map_config
// 如果Check Ref=false (代表被關起)，則呼叫turnOffMapLayerVisibility()移除當前應用的map_config
function handleToggle() {
	//如果該應用沒有map_config，顯示提示訊息後不做任何事
	if (!props.content.map_config) {
		if (checked.value) {
			dialogStore.showNotification('info', '本組件沒有空間資料，不會渲染地圖');
		}
		return;
	}
	//如果Check Ref=true (代表被點開)，則呼叫addToMapLayerList()加入當前應用的map_config
	//如果Check Ref=false (代表被關起)，則呼叫turnOffMapLayerVisibility()移除當前應用的map_config
	if (checked.value) {
		mapStore.addToMapLayerList(props.content.map_config);
	} else {
		mapStore.turnOffMapLayerVisibility(props.content.map_config);
	}
}

// Toggles between chart types defined in the dashboard component
// Also clear any map filters applied
// 當應用支援多圖表呈現時，這個功能會用到
// 使用者切換不同圖表時觸發
function changeActiveChart(chartName) {
	activeChart.value = chartName; //更改切換的圖表
	//移除切換圖層的規則 (簡單來說就是this.map.setFilter(layer_id, null))
	mapStore.clearLayerFilter(`${props.content.map_config[0].index}-${props.content.map_config[0].type}`);
}
</script>

<template>
	<div :class="{ componentmapchart: true, checked: checked, 'maplayer': isMapLayer && checked }">
		<!--左側清單，標題、圖示、按鈕部份-->
		<div class="componentmapchart-header">
			<div>
				<div>
					<h3>{{ content.name }}</h3>
					<span v-if="content.chart_config.map_filter && content.map_config"
						@click="dialogStore.showNotification('info', '本組件有篩選地圖功能，點擊圖表資料點以篩選')">tune</span>
					<span v-if="content.map_config"
						@click="dialogStore.showNotification('info', '本組件有空間資料，點擊開關以顯示地圖')">map</span>
					<span v-if="content.history_data"
						@click="dialogStore.showNotification('info', '回到儀表板頁面並點擊「組件資訊」以查看')">insights</span>
				</div>
				<h4 v-if="checked">{{ `${content.source} | ${dataTime}` }}</h4>
			</div>
			<!--左側清單，按鈕部份-->
			<div class="componentmapchart-header-toggle">
				<!-- The class "toggleswitch" could be edited in /assets/styles/toggleswitch.css -->
				<label class="toggleswitch">
					<input type="checkbox" @change="handleToggle" v-model="checked" :disabled="shouldDisable">
					<span class="toggleswitch-slider"></span>
				</label>
			</div>
		</div>

		<!--左側清單，如果按鈕被點開，如果chart_config.types大於1，渲染切換圖表的按鈕-->
		<div class="componentmapchart-control" v-if="props.content.chart_config.types.length > 1 && checked">
			<button v-for="item in props.content.chart_config.types" @click="changeActiveChart(item)"
				:key="`${props.content.index}-${item}-mapbutton`">{{
					chartTypes[item] }}</button>
		</div>

		<!--左側清單，當按鈕被點開時，要顯示的圖表-->
		<div class="componentmapchart-chart" v-if="checked && content.chart_data">
			<!--注意: 與"一般儀表版總覽"不同的是-->
			<!-- The components referenced here can be edited in /components/charts -->
			<component v-for="item in content.chart_config.types" :activeChart="activeChart" :is="item"
				:key="`${props.content.index}-${item}-mapchart`" :chart_config="content.chart_config"
				:series="content.chart_data" :map_config="content.map_config">
			</component>
		</div>


		<div v-else-if="checked" class="componentmapchart-loading">
			<div></div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.componentmapchart {
	width: calc(100% - var(--font-m) *2);
	max-width: calc(100% - var(--font-m) *2);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	position: relative;
	padding: var(--font-m);
	border-radius: 5px;
	background-color: var(--color-component-background);

	&-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;

		h3 {
			font-size: var(--font-m);
		}

		h4 {
			color: var(--color-complement-text);
			font-size: var(--font-s);
			font-weight: 400;
		}

		div:first-child {
			div {
				display: flex;
				align-items: center;
			}

			span {
				margin-left: 8px;
				color: var(--color-complement-text);
				font-family: var(--font-icon);
				user-select: none;
			}
		}

		&-toggle {
			min-height: 1rem;
			min-width: 2rem;
			margin-top: 4px;
		}
	}

	&-control {
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
		position: absolute;
		top: 4rem;
		left: 0;
		z-index: 10;

		button {
			margin: 0 4px;
			padding: 4px 4px;
			border-radius: 5px;
			background-color: rgb(77, 77, 77);
			opacity: 0.25;
			color: var(--color-complement-text);
			font-size: var(--font-s);
			text-align: center;
			;
			transition: color 0.2s, opacity 0.2s;

			&:hover {
				opacity: 1;
				color: white;
			}
		}
	}

	&-chart,
	&-loading {
		height: 80%;
		position: relative;
		overflow-y: scroll;

		p {
			color: var(--color-border)
		}
	}

	&-loading {
		display: flex;
		align-items: center;
		justify-content: center;

		div {
			width: 2rem;
			height: 2rem;
			border-radius: 50%;
			border: solid 4px var(--color-border);
			border-top: solid 4px var(--color-highlight);
			animation: spin 0.7s ease-in-out infinite;
		}
	}
}

.checked {
	max-height: 300px;
	height: 300px;
}

.maplayer {
	height: 200px;
	max-height: 200px;
	padding-bottom: 0;
}
</style>