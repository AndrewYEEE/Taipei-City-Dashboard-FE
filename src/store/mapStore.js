// Cleaned

/* mapStore */
/*
The mapStore controls the map and includes methods to modify it.

!! PLEASE BE SURE TO REFERENCE THE MAPBOX DOCUMENTATION IF ANYTHING IS UNCLEAR !!
https://docs.mapbox.com/mapbox-gl-js/guides/
*/
import { createApp, defineComponent, nextTick, ref } from "vue";
import { defineStore } from "pinia";
import { useAuthStore } from "./authStore";
import mapboxGl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import axios from "axios";
import { Threebox } from "threebox-plugin";

import mapStyle from "../assets/configs/mapbox/mapStyle.js";
import {
	MapObjectConfig,
	TaipeiTown,
	TaipeiVillage,
	TaipeiBuilding,
	maplayerCommonPaint,
	maplayerCommonLayout,
} from "../assets/configs/mapbox/mapConfig.js";
import { savedLocations } from "../assets/configs/mapbox/savedLocations.js";
import { calculateGradientSteps } from "../assets/configs/mapbox/arcGradient";
import MapPopup from "../components/map/MapPopup.vue";

const { BASE_URL } = import.meta.env;

export const useMapStore = defineStore("map", {
	state: () => ({
		// Array of layer IDs that are in the map
		currentLayers: [],
		// Array of layer IDs that are in the map and currently visible
		currentVisibleLayers: [],
		// Stores all map configs for all layers (to be used to render popups)
		mapConfigs: {},
		// Stores the mapbox map instance (用於存放MapBox物件以控制地圖操作)
		map: null,
		// Stores popup information
		popup: null, //用於儲存彈跳視窗內容 (例如點擊公車站牌圖標時觸發儲存)
		// Stores saved locations (用於儲存座標位置，在savedLocations.js中已經有預設四個座標點)
		// 初始建立時直接以savedLocations.js內容初始化
		// 格式: [[lng, lat], zoom(放大), pitch(3D角度), bearing(東西南北，正北方為 0), savedLocationName]
		savedLocations: savedLocations,
		// Store currently loading layers,
		loadingLayers: [],
	}),
	getters: {},
	actions: {
		/* Initialize Mapbox */
		// 1. Creates the mapbox instance and passes in initial configs
		// 每次使用者進入"地圖交叉比對"畫面時就會觸發，載入mapConfig、mapStyle，並觸發initializeBasicLayers()
		initializeMapBox() {
			//清空地圖
			this.map = null; 
			
			//獲取Mapbox Token
			const MAPBOXTOKEN = import.meta.env.VITE_MAPBOXTOKEN;
			
			//利用mapboxGl建立Mapbox物件
			mapboxGl.accessToken = MAPBOXTOKEN;
			this.map = new mapboxGl.Map({
				...MapObjectConfig, //載入地圖通用設定，從mapConfig.js來
				style: mapStyle,    //載入地圖風格文件
			});
			//新增導航控制條
			this.map.addControl(new mapboxGl.NavigationControl()); 

			//關閉雙點擊放大功能
			this.map.doubleClickZoom.disable();

			//設置事件監聽 (https://docs.mapbox.com/mapbox-gl-js/api/map/#events-interaction)
			this.map
				//監聽事件: Map Style樣式載入時觸發
				.on("style.load", () => { 
					this.initializeBasicLayers();
				})
				
				//監聽事件: 使用者點擊地圖時觸發
				//目的是要處裡地圖上彈跳視窗的內容
				.on("click", (event) => { 
					if (this.popup) { //如果現在popup有東西，先清空
						this.popup = null;
					}
					this.addPopup(event);  //處裡地圖上彈跳視窗
				})

				//監聽事件: 所有加載、動畫等均已完成，在地圖進入“空閒”狀態之前渲染最後一幀後觸發
				
				.on("idle", () => { 
					this.loadingLayers = this.loadingLayers.filter(
						(el) => el !== "rendering"
					);
				});
		},

		// 2. Adds three basic layers to the map (Taipei District, Taipei Village labels, and Taipei 3D Buildings)
		// Due to performance concerns, Taipei 3D Buildings won't be added in the mobile version
		// 
		initializeBasicLayers() {
			const authStore = useAuthStore();
			fetch(`${BASE_URL}/mapData/taipei_town.geojson`)
				.then((response) => response.json())
				.then((data) => {
					this.map
						.addSource("taipei_town", {
							type: "geojson",
							data: data,
						})
						.addLayer(TaipeiTown);
				});
			fetch(`${BASE_URL}/mapData/taipei_village.geojson`)
				.then((response) => response.json())
				.then((data) => {
					this.map
						.addSource("taipei_village", {
							type: "geojson",
							data: data,
						})
						.addLayer(TaipeiVillage);
				});
			if (!authStore.isMobileDevice) {
				this.map
					.addSource("taipei_building_3d_source", {
						type: "vector",
						url: import.meta.env.VITE_MAPBOXTILE,
					})
					.addLayer(TaipeiBuilding);
			}

			this.addSymbolSources();
		},
		// 3. Adds symbols that will be used by some map layers
		addSymbolSources() {
			const images = [
				"metro",
				"triangle_green",
				"triangle_white",
				"bike_green",
				"bike_orange",
				"bike_red",
			];
			images.forEach((element) => {
				this.map.loadImage(
					`${BASE_URL}/images/map/${element}.png`,
					(error, image) => {
						if (error) throw error;
						this.map.addImage(element, image);
					}
				);
			});
		},

		/* Adding Map Layers */
		// 1. Passes in the map_config (an Array of Objects) of a component and adds all layers to the map layer list
		addToMapLayerList(map_config) {
			map_config.forEach((element) => {
				let mapLayerId = `${element.index}-${element.type}`;
				// 1-1. If the layer exists, simply turn on the visibility and add it to the visible layers list
				if (
					this.currentLayers.find((element) => element === mapLayerId)
				) {
					this.loadingLayers.push("rendering");
					this.turnOnMapLayerVisibility(mapLayerId);
					if (
						!this.currentVisibleLayers.find(
							(element) => element === mapLayerId
						)
					) {
						this.currentVisibleLayers.push(mapLayerId);
					}
					return;
				}
				let appendLayerId = { ...element };
				appendLayerId.layerId = mapLayerId;
				// 1-2. If the layer doesn't exist, call an API to get the layer data
				this.loadingLayers.push(appendLayerId.layerId);
				this.fetchLocalGeoJson(appendLayerId);
			});
		},
		// 2. Call an API to get the layer data
		fetchLocalGeoJson(map_config) {
			axios
				.get(`${BASE_URL}/mapData/${map_config.index}.geojson`)
				.then((rs) => {
					this.addMapLayerSource(map_config, rs.data);
				})
				.catch((e) => console.error(e));
		},
		// 3. Add the layer data as a source in mapbox
		addMapLayerSource(map_config, data) {
			this.map.addSource(`${map_config.layerId}-source`, {
				type: "geojson",
				data: { ...data },
			});
			if (map_config.type === "arc") {
				this.AddArcMapLayer(map_config, data);
			} else {
				this.addMapLayer(map_config);
			}
		},
		// 4-1. Using the mapbox source and map config, create a new layer
		// The styles and configs can be edited in /assets/configs/mapbox/mapConfig.js
		addMapLayer(map_config) {
			let extra_paint_configs = {};
			let extra_layout_configs = {};
			if (map_config.icon) {
				extra_paint_configs = {
					...maplayerCommonPaint[
						`${map_config.type}-${map_config.icon}`
					],
				};
				extra_layout_configs = {
					...maplayerCommonLayout[
						`${map_config.type}-${map_config.icon}`
					],
				};
			}
			if (map_config.size) {
				extra_paint_configs = {
					...extra_paint_configs,
					...maplayerCommonPaint[
						`${map_config.type}-${map_config.size}`
					],
				};
				extra_layout_configs = {
					...extra_layout_configs,
					...maplayerCommonLayout[
						`${map_config.type}-${map_config.size}`
					],
				};
			}
			this.loadingLayers.push("rendering");
			this.map.addLayer({
				id: map_config.layerId,
				type: map_config.type,
				paint: {
					...maplayerCommonPaint[`${map_config.type}`],
					...extra_paint_configs,
					...map_config.paint,
				},
				layout: {
					...maplayerCommonLayout[`${map_config.type}`],
					...extra_layout_configs,
				},
				source: `${map_config.layerId}-source`,
			});
			this.currentLayers.push(map_config.layerId);
			this.mapConfigs[map_config.layerId] = map_config;
			this.currentVisibleLayers.push(map_config.layerId);
			this.loadingLayers = this.loadingLayers.filter(
				(el) => el !== map_config.layerId
			);
		},
		// 4-2. Add Map Layer for Arc Maps
		AddArcMapLayer(map_config, data) {
			const authStore = useAuthStore();
			const lines = [...JSON.parse(JSON.stringify(data.features))];
			const arcInterval = 20;

			this.loadingLayers.push("rendering");

			for (let i = 0; i < lines.length; i++) {
				let line = [];
				let lngDif =
					lines[i].geometry.coordinates[1][0] -
					lines[i].geometry.coordinates[0][0];
				let lngInterval = lngDif / arcInterval;
				let latDif =
					lines[i].geometry.coordinates[1][1] -
					lines[i].geometry.coordinates[0][1];
				let latInterval = latDif / arcInterval;

				let maxElevation =
					Math.pow(Math.abs(lngDif * latDif), 0.5) * 80000;

				for (let j = 0; j < arcInterval + 1; j++) {
					let waypointElevation =
						Math.sin((Math.PI * j) / arcInterval) * maxElevation;
					line.push([
						lines[i].geometry.coordinates[0][0] + lngInterval * j,
						lines[i].geometry.coordinates[0][1] + latInterval * j,
						waypointElevation,
					]);
				}

				lines[i].geometry.coordinates = [...line];
			}

			const tb = (window.tb = new Threebox(
				this.map,
				this.map.getCanvas().getContext("webgl"), //get the context from the map canvas
				{ defaultLights: true }
			));

			const delay = authStore.isMobileDevice ? 2000 : 500;

			setTimeout(() => {
				this.map.addLayer({
					id: map_config.layerId,
					type: "custom",
					renderingMode: "3d",
					onAdd: function () {
						const paintSettings = map_config.paint
							? map_config.paint
							: { "arc-color": ["#ffffff"] };
						const gradientSteps = calculateGradientSteps(
							paintSettings["arc-color"][0],
							paintSettings["arc-color"][1]
								? paintSettings["arc-color"][1]
								: paintSettings["arc-color"][0],
							arcInterval + 1
						);
						for (let line of lines) {
							let lineOptions = {
								geometry: line.geometry.coordinates,
								color: 0xffffff,
								width: paintSettings["arc-width"]
									? paintSettings["arc-width"]
									: 2,
								opacity:
									paintSettings["arc-opacity"] ||
									paintSettings["arc-opacity"] === 0
										? paintSettings["arc-opacity"]
										: 0.5,
							};

							let lineMesh = tb.line(lineOptions);
							lineMesh.geometry.setColors(gradientSteps);
							lineMesh.material.vertexColors = true;

							tb.add(lineMesh);
						}
					},
					render: function () {
						tb.update(); //update Threebox scene
					},
				});
				this.currentLayers.push(map_config.layerId);
				this.mapConfigs[map_config.layerId] = map_config;
				this.currentVisibleLayers.push(map_config.layerId);
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== map_config.layerId
				);
			}, delay);
		},
		//  5. Turn on the visibility for a exisiting map layer
		turnOnMapLayerVisibility(mapLayerId) {
			this.map.setLayoutProperty(mapLayerId, "visibility", "visible");
		},
		// 6. Turn off the visibility of an exisiting map layer but don't remove it completely
		turnOffMapLayerVisibility(map_config) {
			map_config.forEach((element) => {
				let mapLayerId = `${element.index}-${element.type}`;
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== mapLayerId
				);

				if (this.map.getLayer(mapLayerId)) {
					this.map.setFilter(mapLayerId, null);
					this.map.setLayoutProperty(
						mapLayerId,
						"visibility",
						"none"
					);
				}
				this.currentVisibleLayers = this.currentVisibleLayers.filter(
					(element) => element !== mapLayerId
				);
			});
			this.removePopup();
		},

		/* Popup Related Functions */
		// Adds a popup when the user clicks on a item. The event will be passed in.
		// 處理使用者點擊的東西，並建立彈跳視窗
		addPopup(event) {
			// Gets the info that is contained in the coordinates that the user clicked on (only visible layers)
			const clickFeatureDatas = this.map.queryRenderedFeatures(
				event.point, //用於設定系統要捕捉的範圍，這裡是一個點，但官網是直接抓一個範圍!! (https://docs.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures-around-point/)
				{
					layers: this.currentVisibleLayers, //用於設置你要抓取資料的圖層Layer是哪一層，因為一個TileSet可以有很多層。
				}
			);
			// Return if there is no info in the click
			// 如果無法獲取使用者點擊資料，直接返回
			if (!clickFeatureDatas || clickFeatureDatas.length === 0) {
				return;
			}

			// console.log(clickFeatureDatas)
			// Parse clickFeatureDatas to get the first 3 unique layer datas, skip over already included layers
			const mapConfigs = [];
			const parsedPopupContent = [];
			let previousParsedLayer = "";

			for (let i = 0; i < clickFeatureDatas.length; i++) {
				if (mapConfigs.length === 3) break;
				if (previousParsedLayer === clickFeatureDatas[i].layer.id)
					continue;
				previousParsedLayer = clickFeatureDatas[i].layer.id;
				mapConfigs.push(this.mapConfigs[clickFeatureDatas[i].layer.id]);
				parsedPopupContent.push(clickFeatureDatas[i]);
			}
			// Create a new mapbox popup
			this.popup = new mapboxGl.Popup()
				.setLngLat(event.lngLat)
				.setHTML('<div id="vue-popup-content"></div>')
				.addTo(this.map);

			// Mount a vue component (MapPopup) to the id "vue-popup-content" and pass in data
			// 建立一個自訂義Vue Component，並以MapPopup Component為模板
			const PopupComponent = defineComponent({
				extends: MapPopup,
				setup() {
					// Only show the data of the topmost layer
					// 這裡Return的東西，在MapPopup模板內可以用"this"接收到
					return { 
						popupContent: parsedPopupContent,
						mapConfigs: mapConfigs,
						activeTab: ref(0),
					};
				},
			});

			// This helps vue determine the most optimal time to mount the component
			// nextTick : 確保裡面 callback function 執行的任務，會等待畫面都更新結束後才執行
			// 掛載到剛剛定義的DOM節點上
			nextTick(() => {
				const app = createApp(PopupComponent);
				app.mount("#vue-popup-content");
			});
		},

		// Remove the current popup 
		// (移除彈出視窗)
		removePopup() {
			if (this.popup) {
				this.popup.remove(); //先清除裡面內容後在設為null
			}
			this.popup = null;
		},

		/* Functions that change the viewing experience of the map */

		// Add new saved location that users can quickly zoom to
		// 讓使用者新增一個位置到this.savedLocations
		addNewSavedLocation(name) {
			const coordinates = this.map.getCenter();
			const zoom = this.map.getZoom();
			const pitch = this.map.getPitch();
			const bearing = this.map.getBearing();
			this.savedLocations.push([coordinates, zoom, pitch, bearing, name]);
		},

		// Zoom to a location
		// 用於改變當前地圖座標位置 ([[lng, lat], zoom, pitch, bearing, savedLocationName])
		easeToLocation(location_array) {
			this.map.easeTo({
				center: location_array[0],
				zoom: location_array[1],
				duration: 4000,
				pitch: location_array[2],
				bearing: location_array[3],
			});
		},

		// Remove a saved location
		// 依據給予的index移除this.savedLocations中儲存的位置
		// 除非應用重啟，否則不會初始化回來
		removeSavedLocation(index) {
			this.savedLocations.splice(index, 1);
		},

		// Force map to resize after sidebar collapses
		resizeMap() {
			if (this.map) {
				setTimeout(() => {
					this.map.resize();
				}, 200);
			}
		},

		/* Map Filtering */
		// Add a filter based on a property on a map layer
		addLayerFilter(layer_id, property, key, map_config) {
			if (!this.map) {
				return;
			}
			if (map_config && map_config.type === "arc") {
				this.map.removeLayer(layer_id);
				let toBeFiltered = {
					...this.map.getSource(`${layer_id}-source`)._data,
				};
				toBeFiltered.features = toBeFiltered.features.filter(
					(el) => el.properties[property] === key
				);
				map_config.layerId = layer_id;
				this.AddArcMapLayer(map_config, toBeFiltered);
				return;
			}
			this.map.setFilter(layer_id, ["==", ["get", property], key]);
		},
		// Remove any filters on a map layer
		clearLayerFilter(layer_id, map_config) {
			if (!this.map) {
				return;
			}
			if (map_config && map_config.type === "arc") {
				this.map.removeLayer(layer_id);
				let toRestore = {
					...this.map.getSource(`${layer_id}-source`)._data,
				};
				map_config.layerId = layer_id;
				this.AddArcMapLayer(map_config, toRestore);
				return;
			}
			this.map.setFilter(layer_id, null);
		},

		/* Clearing the map */

		// Called when the user is switching between maps (與下面clearEntireMap()差異在沒有清除this.map)
		clearOnlyLayers() {
			this.currentLayers.forEach((element) => {
				this.map.removeLayer(element);
				this.map.removeSource(`${element}-source`);
			});
			this.currentLayers = [];
			this.mapConfigs = {};
			this.currentVisibleLayers = [];
			this.removePopup();
		},
		// Called when user navigates away from the map (清除所有Map要用到的變數、彈出視窗)
		clearEntireMap() {
			this.currentLayers = [];
			this.mapConfigs = {};
			this.map = null;
			this.currentVisibleLayers = [];
			this.removePopup();
		},
	},
});
