<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { ref, computed } from "vue";
import { useDialogStore } from "../../store/dialogStore";

import { jsonToCsv } from "../../assets/utilityFunctions/jsonToCsv";
import DialogContainer from "./DialogContainer.vue";

const dialogStore = useDialogStore();

// Stores the inputted dashboard name
// moreInfoContent.name從ComponentContainer.vue來，可以直接看作contentStore.currentDashboard.content
const name = ref(dialogStore.moreInfoContent.name);

// Stores the file type
// 預設使用JSON格式
const fileType = ref("JSON");

// 獲取JSON格式結果，包含chart_data與categories (使用encodeURIComponent)
const parsedJson = computed(() => {
	let json = {};
	json.data = dialogStore.moreInfoContent.chart_data;
	// 如果chart_config中有categories資訊，則多附帶進json (一些應用圖表會用到，例如BarPercentChart)
	if (dialogStore.moreInfoContent.chart_config.categories) { 
		json.categories = dialogStore.moreInfoContent.chart_config.categories;
	}

	//轉換為JSON格式
	const jsonString = encodeURIComponent(JSON.stringify(json));
	// const base64Json = btoa(jsonString)
	return jsonString;
});

// 獲取CSV格式結果，包含chart_data與chart_config (使用encodeURI)
const parsedCsv = computed(() => {
	const csvString = jsonToCsv(
		dialogStore.moreInfoContent.chart_data,
		dialogStore.moreInfoContent.chart_config
	);
	return encodeURI(csvString);
});

//這裡等同handleClose()
function handleSubmit() {
	handleClose();
}

//??? 
function handleClose() {
	name.value = dialogStore.moreInfoContent.name; //設置name Ref ex: "交通路況"
	dialogStore.dialogs.downloadData = false; //dialogStore裡沒有downloadData阿??
}
</script>

<template>
	<DialogContainer :dialog="`downloadData`" @onClose="handleClose">
		<div class="downloaddata">
			<!--Title-->
			<h2>下載資料</h2>
			
			<!--輸入檔名Input，綁定Ref name -->
			<div class="downloaddata-input">
				<h3>請輸入檔名</h3>
				<input type="text" v-model="name" />
			</div>

			<!--選擇檔案類型，綁定Ref fileType-->
			<h3>請選擇檔案格式</h3>
			<div>
				<input
					class="downloaddata-radio"
					type="radio"
					v-model="fileType"
					value="JSON"
					id="JSON"
				/>
				<label for="JSON">
					<div></div>
					JSON
				</label>
				<input
					class="downloaddata-radio"
					type="radio"
					v-model="fileType"
					value="CSV"
					id="CSV"
				/>
				<label for="CSV">
					<div></div>
					CSV (UTF-8)
				</label>
			</div>

			<!--下載功能，他們下載是直接將資料塞在href-->
			<div class="downloaddata-control">
				<button
					class="downloaddata-control-cancel"
					@click="handleClose"
				>
					取消
				</button>
				<button
					v-if="name && fileType === 'JSON'"
					class="downloaddata-control-confirm"
					@click="handleSubmit"
				>
					<a
						:href="`data:application/json;charset=utf-8,${parsedJson}`"
						:download="`${name}.json`"
						>下載JSON</a
					>
				</button>
				<button
					v-if="name && fileType === 'CSV'"
					class="downloaddata-control-confirm"
					@click="handleSubmit"
				>
					<a
						:href="`data:text/csv;charset=utf-8,${parsedCsv}`"
						:download="`${name}.csv`"
						>下載CSV</a
					>
				</button>
			</div>
		</div>
	</DialogContainer>
</template>

<style scoped lang="scss">
.downloaddata {
	width: 300px;

	h3 {
		margin-bottom: 0.5rem;
		font-size: var(--font-s);
		font-weight: 400;
	}

	&-input {
		display: flex;
		flex-direction: column;
		margin: 1rem 0 0.5rem;

		p {
			color: rgb(216, 52, 52);
		}

		input {
			padding: 4px 6px;
			border: solid 1px var(--color-border);
			border-radius: 5px;
			background-color: transparent;
			font-size: var(--font-m);

			&:focus {
				outline: none;
				border: solid 1px var(--color-highlight);
			}
		}
	}

	&-radio {
		display: none;

		&:checked + label {
			color: white;

			div {
				background-color: var(--color-highlight);
			}
		}

		&:hover + label {
			color: var(--color-highlight);

			div {
				border-color: var(--color-highlight);
			}
		}
	}

	label {
		position: relative;
		display: flex;
		align-items: center;
		margin-bottom: 2px;
		font-size: var(--font-s);
		color: var(--color-complement-text);
		transition: color 0.2s;
		cursor: pointer;

		div {
			width: calc(var(--font-s) / 2);
			height: calc(var(--font-s) / 2);
			margin-right: 4px;
			padding: calc(var(--font-s) / 4);
			border-radius: 50%;
			border: 1px solid var(--color-border);
			transition: background-color 0.2s;
		}
	}

	&-control {
		display: flex;
		justify-content: flex-end;

		&-cancel {
			margin: 0 2px;
			padding: 4px 6px;
			border-radius: 5px;
			transition: color 0.2s;

			&:hover {
				color: var(--color-highlight);
			}
		}

		&-confirm {
			margin: 0 2px;
			padding: 4px 10px;
			border-radius: 5px;
			background-color: var(--color-highlight);
			transition: opacity 0.2s;

			&:hover {
				opacity: 0.8;
			}
		}
	}
}
</style>
