// Cleaned

/* authStore */
/*
The contentStore calls APIs to get content info and stores it.
*/

import router from "../router/index"; //從index.js獲取router物件，下方setDashboards()操作
import { defineStore } from "pinia";
import { useDialogStore } from "./dialogStore";
import axios from "axios";
const { BASE_URL } = import.meta.env;

export const useContentStore = defineStore("content", {
	state: () => ({
		// Stores all dashboards data. Reference the structure in /public/dashboards/all_dashboards.json 
		dashboards: [], //畫面左側"儀表板列表"清單，來自all_dashboards.json，由setDashboards()獲取，由setRouteParams()觸發
		// Stores all components data. Reference the structure in /public/dashboards/all_components.json 
		components: {}, //畫面中間所有元件內容，來自all_components.json，由setComponents()獲取，由setRouteParams()觸發
		// Stores all contributors data. Reference the structure in /public/dashboards/all_contributors.json 
		contributors: {}, //主畫面>點擊"組件資訊"中"協作者"部份，來自all_contributors.json，由setRouteParams()觸發
		// Picks out the components that are map layers and stores them here
		mapLayers: [], //專門紀錄哪些元件屬於"圖資資訊"主題，由setMapLayers()獲取，由setRouteParams()觸發
		// Picks out the components that are favorites and stores them here
		favorites: [],
		// Stores information of the current dashboard
		currentDashboard: { //用於儲存當前頁面資訊
			// /mapview or /dashboard
			mode: null, //就是path
			index: null, //儲存?index=xxx的xxx
			name: null,  //儲存名稱，例如"YouBike研究"、"民情熱議".....
			content: [], //從all_component.json獲取物件陣列，如果是非"map-layer"會另外獲取chartData與historyData
		},
		// Stores whether dashboards are loading (標記是否loading中，是的話會被DashboardView.vue偵測到刷新渲染)
		loading: false,
		// Stores whether an error occurred (標記是否error，是的話會被DashboardView.vue偵測到刷新渲染)
		error: false,
	}),
	getters: {},
	actions: {
		/* Steps in adding content to the application */

		// 1. Check the current path and execute actions based on the current path (每次切換頁面時都會被route呼叫)
		setRouteParams(mode, index) { //mode是path name (ex:dashboard), index是$route.query,index的值 (URL上面?index的值)
			this.error = false;
			this.currentDashboard.mode = mode; //儲存path
			// 1-1. Don't do anything if the path is the same
			if (this.currentDashboard.index === index) { //如果index參數沒變，啥都不做
				return;
			}
			this.currentDashboard.index = index; //否則儲存index (初次執行時，index會是undefined)
			// 1-2. If there is no contributor info, call the setContributors method (7.)
			if (Object.keys(this.contributors).length === 0) { //如果contributors是空的，重新從json獲取 "協作者" (沒意外的話只會觸發一次)
				this.setContributors();
			}
			// 1-3. If there is no dashboards info, call the setDashboards method (2.)
			if (this.dashboards.length === 0) { //如果dashboards是空的，重新從json獲取 "左側 儀表板列表清單"
				this.setDashboards();
				return;
			}
			// 1-4. If there is dashboard info but no index is defined, call the setDashboards method (2.)
			if (!index) { //如果dashboards ("左側 儀表板列表清單") 有東西，但目前沒有index參數，則重新呼叫setDashboards() (其實應該是可以直接呼叫setComponents()，但應該是為了順便更新this.dashboard)
				this.setDashboards();
				return;
			}
			
			// 1-5. If all info is present, skip steps 2, 3, 4, 7 and call the setCurrentDashboardContent method (5.)
			//正常情況下，不是第一次啟動，dashboards[]不是空，index有東西，則都會走到這
			//刷新this.currentDashboard 
			this.setCurrentDashboardContent(); //如果dashboards ("左側 儀表板列表清單") 有東西，也有index參數，則直接呼叫setCurrentDashboardContent()主要是獲取現在dashboard上要顯示的元件有哪些，以及獲取當前物件的chartData與historyData
		},
		// 2. Call an API to get all dashboard info and reroute the user to the first dashboard in the list
		setDashboards() { //從json獲取 "左側 儀表板列表清單"，裡面會一同呼叫setComponents()，啟用this.loading = true;
			this.loading = true; //標記loading中
			axios
				.get(`${BASE_URL}/dashboards/all_dashboards.json`)
				.then((rs) => {
					this.dashboards = rs.data.data; //獲取json資料資料存入this.dashboards
					console.log("setDashboards")
					//如果現在currentDashboard.index是空的，也就是根本還沒有存取過?index=，則以json第一組資料的index為預設
					//首次進入首頁時，index會是undefined，會觸發以下內容
					if (!this.currentDashboard.index) { 
						this.currentDashboard.index = this.dashboards[0].index;
						router.replace({
							query: {
								index: this.currentDashboard.index,
							}, //query是傳參數
						}); //強制重新傳導，replace不會紀錄在history中，等同於 <router-link :to="{name: route.name , params: { id: 123 }}" replace>
						//由於重新轉導，所以setRouteParams流程又會跑一次，不過好像是非同步，也就是還是會將下面的跑完再跳轉頁面
						//但由於if (this.dashboards.length === 0) {}邏輯，這裡不會再觸發
						console.log("replace happen")
					}
					console.log("after parser")
					// Pick out the list of favorite components
					const favorites = this.dashboards.find(
						(item) => item.index === "favorites"
					);//獲取json中"favorites"物件

					this.favorites = [...favorites.components]; //將所有favorites.components陣列內容複製一份出來 (ex: ["108", "22", "79", "60", "107"])
					// After getting dashboard info, call the setComponents (3.) method to get component info
					this.setComponents(); //這裡會將下面所有的set功能全部叫一遍
				})
				.catch((e) => {
					this.loading = false;
					this.error = true;
					console.error(e);
				});
		},
		// 3. Call and API to get all components info
		setComponents() { //由setDashboards()呼叫，獲取components，不論是不是map-layers，成功後關閉this.loading = false;
			axios
				.get(`${BASE_URL}/dashboards/all_components.json`)
				.then((rs) => {
					this.components = rs.data.data; //獲取all_components.json資料存入components
					// Step 4.
					this.setMapLayers(); //將有"圖資資訊"的元件記錄到this.mapLayers[]
					// Step 5.
					this.setCurrentDashboardContent(); //主要是獲取現在dashboard上要顯示的元件有哪些
					this.loading = false;
				})
				.catch((e) => console.error(e));
		},
		// 4. Adds components that are map layers into a separate store to be used in mapview
		setMapLayers() { //由setComponents()呼叫，將所有dashboards.json中index="map-layers"物件的components設置到this.mapLayers[]，代表該元件有"圖資資訊"
			const mapLayerInfo = this.dashboards.find(
				(item) => item.index === "map-layers"
			);
			mapLayerInfo.components.forEach((component) => {
				this.mapLayers.push(this.components[component]);
			});
		},
		// 5. Finds the info for the current dashboard based on the index and adds it to "currentDashboard"
		setCurrentDashboardContent() { //由setComponents()呼叫，主要是獲取現在dashboard上要顯示的元件有哪些
			//從all_dashboards.json轉成的this.dashboards陣列中獲取符合this.currentDashboard.index的物件
			const currentDashboardInfo = this.dashboards.find(
				(item) => item.index === this.currentDashboard.index
			);
			if (!currentDashboardInfo) { //如果沒有找到對應的物件，則觸發replace並設置index為this.dashboards[0].index
				router.replace({
					query: {
						index: this.dashboards[0].index,
					},
				});
				return;
			}
			this.currentDashboard.name = currentDashboardInfo.name; //獲取符合的物件的name
			this.currentDashboard.icon = currentDashboardInfo.icon; //獲取符合的物件的icon
			//如果index="map-layers"，則這裡的this.currentDashboard.content應該要與setMapLayers()的this.mapLayers一樣
			this.currentDashboard.content = currentDashboardInfo.components.map( //獲取符合的物件的components陣列
				(item) => {
					return this.components[item]; //(ex: ["108", "22", "79", "60", "107"]，則獲取key=108、22、79...的this.components)
				}
			); 
			// no need to call additional chart data APIs for the map layers dashboard
			//如果index="map-layers"("圖資資訊")，則離開 
			//(因為map-layers的chartData已經直接寫死在this.currentDashboard.content裡面 (this.currentDashboard.content[id].chartData))
			if (this.currentDashboard.index === "map-layers") { 
				return;
			}
			this.setCurrentDashboardChartData(); //獲取chartData與historyData
		},
		// 6. Call an API for each component to get its chart data and store it
		// Will call an additional API if the component has history data
		setCurrentDashboardChartData() { //setCurrentDashboardContent()呼叫，獲取當前物件的chartData與historyData
			//已知this.currentDashboard.content當前index物件的元件陣列 (ex: ["108", "22", "79", "60", "107"])的實際component物件
			//依據["108", "22", "79"...]的"108"作為檔名去chartData/資料夾內找json檔案
			//這裡有一個特點，就是非"map-layers"的物件，在all_components.json中預設是沒有chart_data這個欄位的
			//從/chartData/獲取.json建立this.currentDashboard.content[index].chart_data內容
			//如果發現this.currentDashboard.content[index].history_data=true，則再去/historyData/獲取對應的.json
			//並且將獲取的data"直接"覆蓋history_data，也就是說this.currentDashboard.content[index].history_data從bool變成object!!!
			this.currentDashboard.content.forEach((component, index) => { 
				axios
					.get(`${BASE_URL}/chartData/${component.id}.json`) 
					.then((rs) => {
						this.currentDashboard.content[index].chart_data =
							rs.data.data; 
					})
					.catch((e) => {
						console.error(e);
					});
				if (this.currentDashboard.content[index].history_data) {
					axios
						.get(`${BASE_URL}/historyData/${component.id}.json`)
						.then((rs) => {
							this.currentDashboard.content[index].history_data =
								rs.data.data;  //這個動作導致history_data從bool變成object!!!
						})
						.catch((e) => {
							console.error(e);
						});
				}
			});
		},
		// 7. Call an API to get contributor data (result consists of id, name, link)
		setContributors() { //原先設計從某個API取得json資料，當前是從自己的資料夾獲取
			axios
				.get(`${BASE_URL}/dashboards/all_contributors.json`)
				.then((rs) => {
					this.contributors = rs.data.data;
				})
				.catch((e) => console.error(e));
		},

		/* Dummy Functions to demonstrate the logic of some functions that require a backend */
		// Connect a backend to actually implement the following functions or remove altogether

		// Call this function to create a new dashboard. Pass in the new dashboard name and icon. 
		createNewDashboard(name, index, icon) { //讓你看起來像是儲存到後端資料庫，實際上就是加入到List中，並透過修改dialogStore觸發Notification介面
			const dialogStore = useDialogStore();

			this.dashboards.push({
				name: name,
				index: index,
				components: [],
				icon: icon,
			});

			router.replace({
				query: {
					index: index,
				},
			});

			dialogStore.showNotification(
				"success",
				`成功加入${name}儀表板（因爲是展示版，僅暫存）`
			);
		},
		// Call this function to change the dashboard name. Pass in the new dashboard name.
		changeCurrentDashboardName(name) { //修改dashboard顯示名稱
			const dialogStore = useDialogStore();

			this.currentDashboard.name = name;
			this.dashboards.forEach((item) => {
				if (item.index === this.currentDashboard.index) {
					item.name = name;
				}
			});

			dialogStore.showNotification(
				"success",
				`成功更改儀表板名稱至${name}（因爲是展示版，僅暫存）`
			);
		},
		// Call this function to delete the current active dashboard.
		deleteCurrentDashboard() {
			const dialogStore = useDialogStore();

			if (this.dashboards.length <= 3) {
				dialogStore.showNotification("fail", `應至少保有一個儀表板`);
				return;
			}

			this.dashboards = this.dashboards.filter(
				(item) => item.index !== this.currentDashboard.index
			);
			router.replace({
				query: {
					index: this.dashboards[0].index,
				},
			});

			dialogStore.showNotification(
				"success",
				`成功刪除儀表板（因爲是展示版，僅暫存）`
			);
		},
		// Call this function to delete a component. Pass in related info.
		deleteComponent(component_id) {
			const dialogStore = useDialogStore();

			this.dashboards.forEach((item) => {
				if (item.index === this.currentDashboard.index) {
					item.components = item.components.filter(
						(element) => +element !== component_id
					);
				}
			});

			this.setCurrentDashboardContent();

			if (this.currentDashboard.index === "favorites") {
				this.favorites = this.favorites.filter(
					(item) => +item !== component_id
				);
				dialogStore.showNotification(
					"success",
					`成功從收藏移除（因爲是展示版，僅暫存）`
				);
			} else {
				dialogStore.showNotification(
					"success",
					`成功刪除組件（因爲是展示版，僅暫存）`
				);
			}
		},
		// Call this function to add components to the current dashboard. Pass in an array of component ids.
		addComponents(component_ids) {
			const dialogStore = useDialogStore();

			this.dashboards.forEach((item) => {
				if (item.index === this.currentDashboard.index) {
					item.components = item.components.concat(component_ids);
				}
			});
			this.setCurrentDashboardContent();

			dialogStore.showNotification(
				"success",
				`成功加入組件（因爲是展示版，僅暫存）`
			);
		},
		
		//將component_id (也就是id號碼) 加入到this.favorites
		//將component_id (也就是id號碼) 加入到this.dashboards[]的index=="favorites"物件，類似直接於all_dashboard.json中的favorites手動加入是一樣的意思
		//修改dialogStore觸發NotificationBar顯示通知畫面
		favoriteComponent(component_id) { 
			const dialogStore = useDialogStore();

			this.favorites.push(component_id.toString());
			this.dashboards.forEach((item) => {
				if (item.index === "favorites") {
					item.components.push(component_id.toString());
				}
			});

			dialogStore.showNotification(
				"success",
				`成功加入收藏（因爲是展示版，僅暫存）`
			);
		},

		//將this.favorites中的id轉換為Number類型與component_id比對，只留下不相同者
		//將this.dashboards[]中index=="favorites"物件的components中移除component_id
		//修改dialogStore觸發NotificationBar顯示通知畫面
		unfavoriteComponent(component_id) {
			const dialogStore = useDialogStore();

			this.favorites = this.favorites.filter(
				(item) => +item !== component_id //id轉換為Number類型與component_id比對
			);
			this.dashboards.forEach((item) => {
				if (item.index === "favorites") {
					item.components = item.components.filter(
						(item) => +item !== component_id //id轉換為Number類型與component_id比對
					);
				}
			});
			dialogStore.showNotification(
				"success",
				`成功從收藏移除（因爲是展示版，僅暫存）`
			);
		},
	},
});
