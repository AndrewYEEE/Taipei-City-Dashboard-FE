<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { onMounted, ref } from 'vue';
import { useContentStore } from '../store/contentStore';
import { useDialogStore } from '../store/dialogStore';
import { useMapStore } from '../store/mapStore';

import AddDashboard from './dialogs/AddDashboard.vue';
import SideBarTab from './utilities/SideBarTab.vue';

const contentStore = useContentStore();
const dialogStore = useDialogStore();
const mapStore = useMapStore();

// The expanded state is also stored in localstorage to retain the setting after refresh
const isExpanded = ref(true); //用於縮放左側列表，預設true(展開)

function toggleExpand() { //變更isExpanded Ref刷新頁面，於localStorage儲存目前是縮起來還是展開，如果是縮起來，觸發mapStore.resizeMap()
	isExpanded.value = isExpanded.value ? false : true;
	localStorage.setItem('isExpanded', isExpanded.value); 
	if (!isExpanded.value) {
		mapStore.resizeMap();
	}
}

onMounted(() => { //此頁面建立的時候，從localStorage(瀏覽器本地儲存)中取出isExpanded變數，如果沒有預設false
	const storedExpandedState = localStorage.getItem('isExpanded');
	if (storedExpandedState === "false") {
		isExpanded.value = false;
	} else {
		isExpanded.value = true;
	}
});
</script>

<template>
	<div :class="{ sidebar: true, 'sidebar-collapse': !isExpanded, 'hide-if-mobile': true }"> <!--用v-bind大量設定class-->
		<!--針對"儀表板列表"主題顯示清單，利用v-for依據contentStore內容顯示，內容來自all_dashboards.json-->
		<!--排除map-layers、favorites項目，剩下的渲染tab-->
		<!--v-bind有icon、title、index、key、expanded-->
		<div class="sidebar-sub-add"> <!--標題-->
			<h2>{{ isExpanded ? `儀表板列表` : `列表` }}</h2> <!--縮放左側列表時要顯示的文字-->
			<button v-if="isExpanded"
				@click="dialogStore.showDialog('addDashboard')"><span>add_circle_outline</span>新增</button> <!--v-on觸發click讓dialogStore("addDashboard")==true-->
			<AddDashboard /> <!--裡面的DialogContainer會依據上面的dialogStore("addDashboard")==true決定是否顯示-->
		</div>
		<SideBarTab
			v-for="item in contentStore.dashboards.filter((item) => item.index !== 'map-layers' && item.index !== 'favorites')"
			:icon="item.icon" :title="item.name" :index="item.index" :key="item.index" :expanded="isExpanded" />
		
		<!--渲染index = map-layers ， 以下設計都是只假設只有一項-->
		<!--v-bind有icon、title、index、key、expanded，其中icon、title、index、expanded是props-->
		<h2>{{ isExpanded ? `基本地圖圖層` : `圖層` }}</h2> <!--標題--> <!--縮放左側列表時要顯示的文字-->
		<SideBarTab icon="public" title="圖資資訊" :expanded="isExpanded" index="map-layers" />
		
		<!--渲染index = favorites ， 以下設計都是只假設只有一項-->
		<!--v-bind有icon、title、index、key、expanded，其中icon、title、index、expanded是props-->
		<h2>{{ isExpanded ? `我的最愛` : `最愛` }}</h2> <!--標題--> <!--縮放左側列表時要顯示的文字-->
		<SideBarTab icon="favorite" title="收藏組件" :expanded="isExpanded" index="favorites" />

		<!--最底層的縮放按鈕，v-on監聽click事件觸發toggleExpand()-->
		<button class="sidebar-collapse-button" @click="toggleExpand"><span>{{ isExpanded ? "keyboard_double_arrow_left" :
			"keyboard_double_arrow_right"
		}}</span></button> 
		
	</div>
</template>

<style scoped lang="scss">
.sidebar {
	width: 170px;
	min-width: 170px;
	height: calc(100vh - 80px);
	height: calc(var(--vh) * 100 - 80px);
	max-height: calc(100vh - 80px);
	max-height: calc(var(--vh) * 100 - 80px);
	position: relative;
	padding: 0 10px 0 var(--font-m);
	margin-top: 20px;
	border-right: 1px solid var(--color-border);
	transition: min-width 0.2s ease-out;
	overflow-x: hidden;
	overflow-y: scroll;
	user-select: none;

	h2 {
		color: var(--color-complement-text);
		font-weight: 400;
	}

	&-sub {
		margin-bottom: var(--font-s);

		&-add {
			width: 100%;
			display: flex;

			button {
				display: flex;
				align-items: center;
				margin-left: 0.5rem;
				padding: 2px 6px;
				border-radius: 5px;
				background-color: var(--color-highlight);
				color: var(--color-normal-text);

				span {
					margin-right: 4px;
					font-family: var(--font-icon);
				}
			}
		}
	}

	&-collapse {
		width: 45px;
		min-width: 45px;

		h2 {
			margin-left: 5px;
		}

		&-button {
			height: fit-content;
			position: absolute;
			bottom: 10px;
			right: 10px;
			padding: 5px;
			border-radius: 5px;
			transition: background-color 0.2s;

			&:hover {
				background-color: var(--color-component-background);
			}

			span {
				font-family: var(--font-icon);
				font-size: var(--font-l);
			}


		}
	}
}
</style>