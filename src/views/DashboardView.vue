<!-- Developed By Taipei Urban Intelligence Center 2023 -->
<!-- 
Lead Developer:  Igor Ho (FE Engineer)
Data Pipelines:  Iima Yu (Data Scientist)
Design and UX: Roy Lin (Fmr. Consultant), Chu Chen (Researcher)
Systems: Ann Shih (Systems Engineer)
Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern) 
-->
<!-- Department of Information Technology, Taipei City Government -->

<script setup>
import { useContentStore } from '../store/contentStore';
import { useDialogStore } from '../store/dialogStore';

import ComponentContainer from '../components/components/ComponentContainer.vue';
import MoreInfo from '../components/dialogs/MoreInfo.vue';
import ReportIssue from '../components/dialogs/ReportIssue.vue';

const contentStore = useContentStore(); //獲取useContentStore取得全域共用參數
const dialogStore = useDialogStore(); //獲取useDialogStore用來設定彈跳視窗
</script>

<template>
	<!--如果是"map-layers"則渲染-->
	<!--contentStore.currentDashboard.content從router.beforeEach()來，參考index.js-->
	<!-- If the dashboard is map layers -->
	<div v-if="contentStore.currentDashboard.index === 'map-layers'" class="dashboard">
		<ComponentContainer v-for="item in contentStore.currentDashboard.content" :content="item" :is-map-layer="true"
			:key="item.index" /> <!--content、is-map-layer是Dynamic Props，子元件內會接收-->
		<ReportIssue /> <!--這裡應該用不到，因為沒有"組件資訊"可以點到-->
	</div>
	
	<!--如果不是"map-layers"則渲染-->
	<!-- other dashboards that have components -->
	<div v-else-if="contentStore.currentDashboard.content.length !== 0" class="dashboard">
		<ComponentContainer v-for="item in contentStore.currentDashboard.content" :content="item" :key="item.index" />
		<MoreInfo /> <!--左下角"組件資訊"的預先渲染畫面-->
		<ReportIssue /> <!--左下角"組件資訊"內，"回報問題"的預先渲染畫面-->
	</div>

	<!--檢查是否是loading，loading會由路由傳導時，觸發的setRouteParams()決定-->
	<!-- if dashboard is still loading -->
	<div v-else-if="contentStore.loading" class="dashboard dashboard-nodashboard">
		<div class="dashboard-nodashboard-content">
			<div></div>
		</div>
	</div>

	<!--檢查是否是error，error會由路由傳導時，觸發的setRouteParams()決定-->
	<!-- if dashboard failed to load -->
	<div v-else-if="contentStore.error" class="dashboard dashboard-nodashboard">
		<div class="dashboard-nodashboard-content">
			<span>sentiment_very_dissatisfied</span>
			<h2>發生錯誤，無法載入儀表板</h2>
		</div>
	</div>

	<!--如果contentStore.currentDashboard沒有東西時會到這，通常發生在all_dashboard.json是空的，則this.dashboards[0].index沒有東西-->
	<!-- other dashboards that don't have components -->
	<div v-else class="dashboard dashboard-nodashboard">
		<div class="dashboard-nodashboard-content">
			<span>addchart</span>
			<h2>尚未加入組件</h2>
			<button @click="dialogStore.showDialog('addComponent')" class="hide-if-mobile"
				v-if="contentStore.currentDashboard.index !== 'favorites'">加入您的第一個組件</button>
			<p v-else>點擊其他儀表板組件之愛心以新增至收藏組件</p>
		</div>
	</div>
</template>

<style scoped lang="scss">
.dashboard {
	max-height: calc(100vh - 127px);
	max-height: calc(var(--vh) * 100 - 127px);
	display: grid;
	row-gap: var(--font-s);
	column-gap: var(--font-s);
	margin: var(--font-m) var(--font-m);
	overflow-y: scroll;

	@media (min-width: 720px) {
		grid-template-columns: 1fr 1fr;
	}

	@media (min-width: 1150px) {
		grid-template-columns: 1fr 1fr 1fr;
	}

	@media (min-width: 1800px) {
		grid-template-columns: 1fr 1fr 1fr 1fr;
	}

	@media (min-width: 2200px) {
		grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
	}

	&-nodashboard {
		grid-template-columns: 1fr;

		&-content {
			width: 100%;
			height: calc(100vh - 127px);
			height: calc(var(--vh) * 100 - 127px);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;

			span {
				margin-bottom: 1rem;
				font-family: var(--font-icon);
				font-size: 2rem;
			}

			button {
				color: var(--color-highlight)
			}

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
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}
</style>