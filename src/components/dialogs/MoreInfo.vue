<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { useDialogStore } from "../../store/dialogStore";
import { useContentStore } from "../../store/contentStore";

import DialogContainer from "./DialogContainer.vue";
import ComponentContainer from "../components/ComponentContainer.vue";
import HistoryChart from "../utilities/HistoryChart.vue";
import DownloadData from "./DownloadData.vue";

const { BASE_URL } = import.meta.env;

//===========獲取Store==========//
const dialogStore = useDialogStore();
const contentStore = useContentStore();


//===========Method=========//
function getLinkTag(link, index) {
	if (link.includes("data.taipei")) {
		return `資料集 - ${index + 1} (data.taipei)`;
	} else if (link.includes("tuic.gov.taipei")) {
		return `大數據中心專案網頁`;
	} else if (link.includes("github.com")) {
		return `GitHub 程式庫`;
	} else {
		return `資料集 - ${index + 1} (其他)`;
	}
}
</script>

<template>
	<!--使用DialogContainer實現彈跳功能，綁定on-close自訂emit事件-->
	<DialogContainer
		:dialog="`moreInfo`"
		@on-close="dialogStore.hideAllDialogs" 
	>
		<div class="moreinfo">
			<!--為"組件資訊"左側的圖表畫面，基本上與外層圖表內容一樣，只是將NotMoreInfo設為false-->
			<ComponentContainer
				:content="dialogStore.moreInfoContent"
				:not-more-info="false"
			/>
			<!--為"組件資訊"右側的內容-->
			<div class="moreinfo-info">
				<!--為"組件資訊"右側不含下方按鈕的所有內容-->
				<!--以下dialogStore.moreInfoContent請直接看成是contentStore.currentDashboard.content[]的content-->
				<div class="moreinfo-info-data">
					<!--基本說明欄位，資料直接從all_components.json來-->
					<h3>
						組件說明（{{
							` ID: ${dialogStore.moreInfoContent.id}｜Index:
											${dialogStore.moreInfoContent.index} `
						}}）
					</h3>
					<p>{{ dialogStore.moreInfoContent.long_desc }}</p>
					<h3>範例情境</h3>
					<p>{{ dialogStore.moreInfoContent.use_case }}</p>
					<!--"歷史資料"，如果content.history_data=true則渲染-->
					<div v-if="dialogStore.moreInfoContent.history_data">
						<h3>歷史軸</h3>
						<h4>*點擊並拉動以檢視細部區間資料</h4>
						<!--具體資料來源可參考contentStore.setCurrentDashboardChartData()-->
						<!--series是history_data-->
						<HistoryChart
							:chart_config="
								dialogStore.moreInfoContent.chart_config
							"
							:series="dialogStore.moreInfoContent.history_data"
							:history_data_color="
								dialogStore.moreInfoContent.history_data_color
							"
						/>
					</div>
					<div v-if="dialogStore.moreInfoContent.contributors">
						<h3>協作者</h3>
						<div class="moreinfo-info-contributors">
							<div
								v-for="contributor in dialogStore
									.moreInfoContent.contributors"
								:key="contributor"
							>
								<a
									:href="
										contentStore.contributors[contributor]
											.link
									"
									target="_blank"
									rel="noreferrer"
									><img
										:src="`${BASE_URL}/images/contributors/${contributor}.png`"
										:alt="`協作者-${contentStore.contributors[contributor].name}`"
									/>
									<p>
										{{
											contentStore.contributors[
												contributor
											].name
										}}
									</p>
								</a>
							</div>
						</div>
					</div>
					<div v-if="dialogStore.moreInfoContent.links">
						<h3>相關資料</h3>
						<div class="moreinfo-info-links">
							<a
								v-for="(link, index) in dialogStore
									.moreInfoContent.links"
								:href="link"
								:key="link"
								target="_blank"
								rel="noreferrer"
								>{{ getLinkTag(link, index) }}</a
							>
						</div>
					</div>
				</div>
				<!--為"組件資訊"右側下方按鈕的內容-->
				<div class="moreinfo-info-control">
					<button
						@click="dialogStore.showReportIssue(dialogStore.moreInfoContent.id,dialogStore.moreInfoContent.name)"
					>
						<span>flag</span>回報問題
					</button>
					<button
						v-if=" dialogStore.moreInfoContent.chart_config.types[0] !== 'MetroChart' "
						@click="dialogStore.showDialog('downloadData')"
					>
						<span>download</span>下載資料
					</button>
				</div>
				<!--為"下載資料"的隱藏頁面-->
				<DownloadData />
			</div>
		</div>
	</DialogContainer>
</template>

<style scoped lang="scss">
.moreinfo {
	height: fit-content;
	width: 400px;
	display: grid;

	@media (min-width: 820px) {
		width: 720px;
		height: 410px;
		grid-template-columns: 3fr 2fr;
	}

	@media (min-width: 1200px) {
		height: 440px;
		width: 820px;
	}

	@media (min-width: 2200px) {
		height: 550px;
		width: 920px;
	}

	&-info {
		display: flex;
		flex-direction: column;
		padding: 1rem;
		border-top: solid 1px var(--color-border);

		p {
			margin-bottom: 0.75rem;
			color: var(--color-complement-text);
			text-align: justify;
		}

		h4 {
			color: var(--color-complement-text);
			font-weight: 400;
			font-size: 10px;
		}

		@media (min-width: 820px) {
			border-left: solid 1px var(--color-border);
			border-top: none;
		}

		&-data {
			max-height: calc(100% - 2.5rem);
			overflow-y: scroll;
			padding-right: 8px;

			&::-webkit-scrollbar {
				width: 4px;
			}
			&::-webkit-scrollbar-thumb {
				background-color: rgba(136, 135, 135, 0.5);
				border-radius: 4px;
			}
			&::-webkit-scrollbar-thumb:hover {
				background-color: rgba(136, 135, 135, 1);
			}
		}

		&-contributors {
			display: grid;
			grid-template-columns: 1fr 1fr;
			row-gap: 4px;
			margin: 4px 0 var(--font-s);

			a {
				display: flex;
				align-items: center;

				p {
					margin: 0;
					transition: color 0.2s;
				}

				img {
					height: var(--font-xl);
					margin-right: 4px;
				}

				&:hover p {
					color: var(--color-highlight);
				}
			}
		}

		&-links {
			display: grid;
			grid-template-columns: 1fr 1fr;

			a {
				font-size: var(--font-s);
				color: var(--color-complement-text);
				transition: color 0.2s;

				&:hover {
					color: var(--color-highlight);
				}
			}
		}

		&-control {
			display: flex;
			align-items: flex-end;
			justify-content: flex-end;
			flex: 1;

			span {
				margin-right: 4px;
				font-family: var(--font-icon);
				font-size: calc(var(--font-m) * var(--font-to-icon));
			}

			button {
				display: flex;
				align-items: center;
				margin-left: 8px;
				padding: 2px 4px;
				border-radius: 5px;
				background-color: var(--color-highlight);
				font-size: var(--font-m);
				transition: opacity 0.2s;

				&:hover {
					opacity: 0.8;
				}
			}
		}
	}
}
</style>
