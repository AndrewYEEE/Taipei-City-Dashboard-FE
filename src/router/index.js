/* Developed By Taipei Urban Intelligence Center 2023 */

// Lead Developer:  Igor Ho (FE Engineer)
// Data Pipelines:  Iima Yu (Data Scientist)
// Design and UX: Roy Lin (Prev. Consultant), Chu Chen (Researcher)
// Systems: Ann Shih (Systems Engineer)
// Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)

/* Department of Information Technology, Taipei City Government */

import { createRouter, createWebHistory } from "vue-router";
import { useContentStore } from "../store/contentStore";
import { useMapStore } from "../store/mapStore";
import DashboardView from "../views/DashboardView.vue";
import MapView from "../views/MapView.vue";

const routes = [
	{
		path: "/",
		redirect: "/dashboard",
	},
	{
		path: "/dashboard",
		name: "dashboard", //使用"具名路由"方式，好處是<router-link>直接指定name就對起來了，不用寫path
		component: DashboardView,
	},
	{
		path: "/mapview",
		name: "mapview",
		component: MapView,
	},
	{
		path: "/:pathMatch(.*)*",
		name: "notFoundRedirect",
		redirect: "/dashboard",
	},
]; //預設走DashboardView component

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL), //使用HTML5 (History API) Mode
	base: import.meta.env.BASE_URL,
	routes, //導入設定
}); //使用HTML5 (History API) Mode、建立router物件，要在main.js導入 (App.use(router))

//「每一個」路由進入之前都會先經過這裡，to是即將進入的路由，from是從何處進入的路由
// 允許以非同步方式執行，例如 router.beforeEach(async (to) => { await fetch() ... })
router.beforeEach((to) => { 
	const contentStore = useContentStore(); //獲取useContentStore以操作全域變數
	const mapStore = useMapStore(); //獲取useMapStore控制MapView
	// Pass in route info to contentStore if the path starts with /dashboard or /mapview
	if (
		to.path.toLowerCase() === "/dashboard" ||
		to.path.toLowerCase() === "/mapview"
	) {
		// console.log(to.path, to.query.index) //初次進入首頁時會是 "/dashboard undefined"
		contentStore.setRouteParams(to.path, to.query.index); //類似useRoute()用法，to.path是目前路由物件的路徑， to.query是路由中查詢參數(ex: /home/01?favorite=yes ，會得到$route.query.favorite)
	}
	// Clear the entire mapStore if the path doesn't start with /mapview (如果是瀏覽dashboard，清除mapview的渲染)
	if (to.path.toLowerCase() !== "/mapview") { 
		mapStore.clearEntireMap();
	}
	// Clear only map layers if the path starts with /mapview (如果是瀏覽mapview，清除mapview的地圖資訊，但地圖物件本身還在)
	else if (to.path.toLowerCase() === "/mapview") { 
		mapStore.clearOnlyLayers();
	}
});

export default router;
