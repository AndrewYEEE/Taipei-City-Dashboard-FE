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
		// 紀錄所有已經匯入map設定的LayerID。 由addToMapLayerList()->addMapLayer()新增
		currentLayers: [],

		// Array of layer IDs that are in the map and currently visible
		// 紀錄目前有 "顯示" 的LayerID。 由addToMapLayerList()新增，由turnOffMapLayerVisibility()移除
		currentVisibleLayers: [],

		// Stores all map configs for all layers (to be used to render popups)
		// 記錄所有已經匯入map的LayerID的mapConfig設定。  由addToMapLayerList()->addMapLayer()新增
		mapConfigs: {},
		
		// Stores the mapbox map instance 
		//(用於存放MapBox物件以控制地圖操作)
		map: null,
		
		// Stores popup information
		//用於儲存彈跳視窗內容 (例如點擊公車站牌圖標時觸發儲存)
		//儲存mapboxGl.Popup()物件，由addPopup()建立、removePopup()移除
		popup: null, 
		
		// Stores saved locations (用於儲存座標位置，在savedLocations.js中已經有預設四個座標點)
		// 初始建立時直接以savedLocations.js內容初始化
		// 格式: [[lng, lat], zoom(放大), pitch(3D角度), bearing(東西南北，正北方為 0), savedLocationName]
		savedLocations: savedLocations,
		
		// Store currently loading layers,
		// 原本邏輯是要儲存還在載入的layersID
		// 然而，我覺得這個功能沒用，因為mapStore中，this.loadingLayers.push()推入的都不是LayerID而是"rending"字串!!!!
		loadingLayers: [],

		//我自己加的，用於儲存Maker
		markerList: [],
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
				//監聽事件: 完成下載所有樣式且完成渲染後觸發
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
				//?? 看起來是儲存所有非"rendering"的Layer到this.loadingLayers
				.on("idle", () => { 
					this.loadingLayers = this.loadingLayers.filter(
						(el) => el !== "rendering"
					);
				});
		},

		// 2. Adds three basic layers to the map (Taipei District, Taipei Village labels, and Taipei 3D Buildings)
		// Due to performance concerns, Taipei 3D Buildings won't be added in the mobile version
		// 會在"完成下載所有樣式且完成渲染後觸發"
		// 在非行動裝置下，這裡會載入三組Layers，分別是: 台北市的行政區、里界標籤、台北市建築物的3d模型
		initializeBasicLayers() {
			const authStore = useAuthStore();
			//台北市的行政區Layer設置: 直接從/public/mapData獲取
			fetch(`${BASE_URL}/mapData/taipei_town.geojson`)
				.then((response) => response.json())
				.then((data) => {
					this.map
						.addSource("taipei_town", {
							type: "geojson",
							data: data,
						}) //新增資源 (data)
						.addLayer(TaipeiTown); //新增圖層 (Layer)，這裡是導入Config，Config中
				});

			//台北市里界標籤Layer: 直接從/public/mapData獲取
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
				//台北市建築物的3d模型Layer: 從URL獲取 
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
		// 由呼叫initializeBasicLayers()
		// 加入images到Map中
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
						this.map.addImage(element, image); //addImage(name,filedata)
					}
				);
			});
		},


		/* Adding Map Layers */
		// 1. Passes in the map_config (an Array of Objects) of a component and adds all layers to the map layer list
		// 在ComponentMapChart.vue，應用按鈕點開時呼叫
		// 檢查this.currentLayers[]是否已經有此LayerID，有則呼叫this.turnOnMapLayerVisibility()顯示Layer，
		// 並將這個LayerID加入this.currentVisibleLayers[]
		// 沒有則呼叫fetchLocalGeoJson()
		addToMapLayerList(map_config) {
			//獲取對應應用的map_config[]
			/* EX: 以以下設定為例
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
				]
			*/
			map_config.forEach((element) => {
				// EX: work_soil_liquefaction-fill
				// EX: patrol_rain_sewer-circle
				let mapLayerId = `${element.index}-${element.type}`; 
				
				// 1-1. If the layer exists, simply turn on the visibility and add it to the visible layers list
				// 檢查this.currentLayers[]是否已經有此LayerID
				// 如果有的話，則先在this.loadingLayers[]加入"rendering"，並呼叫this.turnOnMapLayerVisibility()顯示Layer
				// 加入this.currentVisibleLayers[] 
				// return  
				// (那在this.loadingLayers[]加入"rendering"要幹嘛????)
				if ( this.currentLayers.find((element) => element === mapLayerId) ) { //find()回傳第一個滿足所提供之測試函式的元素值
					//??loadingLayers[]不是應該是存LayerID嗎?
					this.loadingLayers.push("rendering"); //?????
					//這裡是將指定Layer設成顯示
					this.turnOnMapLayerVisibility(mapLayerId); 

					//並將這個LayerID加入this.currentVisibleLayers[]代表目前有顯示
					if ( !this.currentVisibleLayers.find( (element) => element === mapLayerId )) {
						this.currentVisibleLayers.push(mapLayerId);
					}

					//我自己加的，加入Marker效果
					const ID = `${mapLayerId}-source`
					if (ID === "district_institution_geo-circle-source") {
						this.addMarker(element,ID);
					}else if (ID === "district_institution_geo-fill-extrusion-source") {
						//map畫面變動動畫，移去最大數量的那個點
						this.map.flyTo({
							// center: max_cor,
							bearing: 56.50, //目標方位角
							zoom: 11,
							pitch: 50,
							speed: 0.9, // speed of flying
						})
					}else if (ID === "business_count_by_town_geo-circle-source") {
						//map畫面變動動畫，移去最大數量的那個點
						this.map.flyTo({
							// center: max_cor,
							bearing: 56.50, //目標方位角
							zoom: 11,
							pitch: 50,
							speed: 0.9, // speed of flying
						})
					}
					return;
				}

				//如果this.currentLayers[]沒有此LayerID
				//則先複製一份element內容，並新增屬性layerId=mapLayerId
				let appendLayerId = { ...element }; //shadow Copy
				appendLayerId.layerId = mapLayerId; //新增layerId屬性
				/* EX: 
					{
						"layerId": "patrol_rain_sewer-circle"
						"index": "patrol_rain_sewer",
						"paint": {
							"circle-color": [
								"interpolate",
								["linear"],
								["to-number", ["get", "ground_far"]],
								-100,
								"#F92623",
								0.51,
								"#81bcf5"
							]
						},
						"property": [
							{
								"key": "station_no",
								"name": "NO"
							},
							{
								"key": "station_name",
								"name": "站名"
							},
							{
								"key": "ground_far",
								"name": "距地面高[公尺]"
							},
							{
								"key": "level_out",
								"name": "水位高[公尺]"
							},
							{
								"key": "rec_time",
								"name": "紀錄時間"
							}
						],
						"type": "circle",
						"size": "big",
						"title": "下水道"
					}
				*/


				// 1-2. If the layer doesn't exist, call an API to get the layer data
				//將mapLayerId加入this.loadingLayers[]
				this.loadingLayers.push(appendLayerId.layerId);
				//呼叫fetchLocalGeoJson()將element丟進去
				// this.fetchLocalGeoJson(appendLayerId);

				//我自己加的，加入Marker效果
				const ID = `${mapLayerId}-source`
				if (ID === "business_count_by_town_geo-circle-source") {
					console.log("CLUSTER",ID)
					this.fetchLocalGeoJsonByClusters(appendLayerId);
				}else{
					console.log("ORG",ID)
					this.fetchLocalGeoJson(appendLayerId);
				}
					
				
				if (ID === "district_institution_geo-circle-source") {
					this.addMarker(element,ID);
				}else if (ID === "district_institution_geo-fill-extrusion-source") {
					//map畫面變動動畫，移去最大數量的那個點
					this.map.flyTo({
						// center: max_cor,
						bearing: 56.50, //目標方位角
						zoom: 11,
						pitch: 50,
						speed: 0.9, // speed of flying
					})
				}else if (ID === "business_count_by_town_geo-circle-source") {


					//map畫面變動動畫，移去最大數量的那個點
					this.map.flyTo({
						// center: max_cor,
						bearing: 56.50, //目標方位角
						zoom: 11,
						pitch: 50,
						speed: 0.9, // speed of flying
					})
				}

			});
		},

		// 2. Call an API to get the layer data
		// 用於獲取當前應用需要的Layer Geojson檔案
		// 由addToMapLayerList()觸發，透過map_config的index獲取geojson之後，呼叫addMapLayerSource()
		fetchLocalGeoJson(map_config) {
			//EX: /mapData/patrol_rain_sewer.geojson
			axios
				.get(`${BASE_URL}/mapData/${map_config.index}.geojson`)
				.then((rs) => {
					this.addMapLayerSource(map_config, rs.data);
				})
				.catch((e) => console.error(e));
		},

		// 3. Add the layer data as a source in mapbox
		// 用於將獲取的geojson檔案匯入map實例
		// 由fetchLocalGeoJson()觸發，以"layerId-source"格式匯入map，並依據type類別決定要呼叫AddArcMapLayer()或AddMapLayer()
		addMapLayerSource(map_config, data) {
			// 匯入layer到map
			// 這裡 "patrol_rain_sewer-circle-source" 只是個名稱
			this.map.addSource(`${map_config.layerId}-source`, {
				type: "geojson",
				data: { ...data },
			});

			// 依據type類別決定要呼叫AddArcMapLayer()或AddMapLayer()
			if (map_config.type === "arc") {
				this.AddArcMapLayer(map_config, data);
			} else {
				this.addMapLayer(map_config);
			}
		},

		//我自己加的
		fetchLocalGeoJsonByClusters(map_config){
			//EX: /mapData/patrol_rain_sewer.geojson
			console.log(map_config.index)
			axios
				.get(`${BASE_URL}/mapData/${map_config.index}.geojson`)
				.then((rs) => {
					this.addMapLayerSourceByClusters(map_config, rs.data);
				})
				.catch((e) => console.error(e));
		},

		//我自己加的
		addMapLayerSourceByClusters(map_config,data){
			// 匯入layer到map
			// 這裡 "patrol_rain_sewer-circle-source" 只是個名稱
			this.map.addSource(`${map_config.layerId}-source`, {
				type: "geojson",
				data: { ...data },
				cluster: true,
				clusterMaxZoom: 12, // Max zoom to cluster points on
				clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
				clusterMinPoints: 4
			});

			
			this.addMapLayerByCluster(map_config);
			
		},

		//我自己加的
		addMapLayerByCluster(map_config){
			let extra_paint_configs = {};
			let extra_layout_configs = {};

			//將所有設定透過this.map.addLayer()導入map實例
			console.log(map_config.layerId)
			this.map.addLayer({
				id: map_config.layerId, //給予一個代表該Layer的ID
				type: map_config.type,  //載入的Feature類型 (circle、fill、symbol、line.....)
				filter: ['has', 'point_count'],
				paint: { //載入座標點的風格與規範設定
					// ...maplayerCommonPaint[`${map_config.type}`], //載入通用設定
					// ...extra_paint_configs, //載入上面特殊設定
					...map_config.paint, //載入map_config內自己的自訂設定
				},
				// layout: {
				// 	...maplayerCommonLayout[`${map_config.type}`],
				// 	...extra_layout_configs,
				// },
				source: `${map_config.layerId}-source`, //指定的source要記得與addMapLayerSource()匯入的名稱一樣
			});
			this.map.addLayer({
				id: 'cluster-count',
				type: 'symbol',
				source: `${map_config.layerId}-source`,
				filter: ['has', 'point_count'],
				layout: {
					'text-field': ["to-string",['-',['get', 'point_count_abbreviated'],1]], //嘗試解決cluster算錯的問題
					'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
					'text-size': 12,
					"text-allow-overlap" : true
				}
			});
				 
			this.map.addLayer({
				id: 'unclustered-point',
				type: 'circle',
				source: `${map_config.layerId}-source`,
				filter: ['!', ['has', 'point_count']],
				paint: {
					'circle-color': '#11b4da',
					'circle-radius': 4,
					'circle-stroke-width': 1,
					'circle-stroke-color': '#fff',
				}
			});

			// inspect a cluster on click
			this.map.on('click', map_config.layerId, (e) => {
				e.preventDefault();
				const features = this.map.queryRenderedFeatures(e.point, {
					layers: [map_config.layerId]
				});
				const clusterId = features[0].properties.cluster_id;
				console.log(features)
				this.map.getSource(`${map_config.layerId}-source`).getClusterExpansionZoom(
					clusterId,
					(err, zoom) => {
						if (err) return;
						
						this.map.easeTo({
							center: features[0].geometry.coordinates,
							zoom: zoom
						});
					}
				);
			});
				
			// When a click event occurs on a feature in
			// the unclustered-point layer, open a popup at
			// the location of the feature, with
			// description HTML from its properties.
			this.map.on('click', 'unclustered-point', (e) => {
				e.preventDefault();
				//do nothing....
				const coordinates = e.features[0].geometry.coordinates.slice();
				const properties = e.features[0].properties;
				console.log(coordinates)
				console.log(properties)
				while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
					coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
				}
					
				new mapboxGl.Popup()
					.setLngLat(coordinates)
					.setHTML(
						`<div>
							address: ${properties.address}<br>
							business: ${properties.business}<br>
							name: ${properties.name}<br>
							telephone: ${properties.telephone}<br>
							town: ${properties.town}<br> 
						</div>`
					)
					.addTo(this.map);
			});
			
			this.map.on('mouseenter', map_config.layerId, () => {
				this.map.getCanvas().style.cursor = 'pointer';
			});
			this.map.on('mouseleave', map_config.layerId, () => {
				this.map.getCanvas().style.cursor = '';
			});

			//該加的加，該移除的移除
			this.currentLayers.push(map_config.layerId);
			this.mapConfigs[map_config.layerId] = map_config;
			this.currentVisibleLayers.push(map_config.layerId);
			this.loadingLayers = this.loadingLayers.filter(
				(el) => el !== map_config.layerId
			);
		},

		//我自己加的
		addMarker(map_config,myID){
			console.log(`${myID}-source`)
			
			//EX: /mapData/patrol_rain_sewer.geojson
			axios
				.get(`${BASE_URL}/mapData/${map_config.index}.geojson`)
				.then((rs) => {
					console.log(rs.data)
					//我自己加的
					if (myID === "district_institution_geo-circle-source") {
						let num = 0;
						let max = 0;
						let max_cor = null ;
						rs.data.features.forEach(marker => {
							console.log(marker)
							// Create a DOM element for each marker.
							const el = document.createElement('div');
							// el.src = require("https://docs.mapbox.com/mapbox-gl-js/assets/pin.svg")
							el.className = 'marker';
							const size = marker.properties.nums;
							if (size>10) {
								el.style.backgroundImage = `url('${BASE_URL}/images/map/red_bar.svg')`;
							}else if (size >6) {
								el.style.backgroundImage = `url('${BASE_URL}/images/map/yellow_bar.svg')`;
							}else if (size >3) {
								el.style.backgroundImage = `url('${BASE_URL}/images/map/green.svg')`;
							}else{
								el.style.backgroundImage = `url('${BASE_URL}/images/map/green_block.svg')`;
							}
							// el.style.backgroundImage = `url('${BASE_URL}/images/map/red_bar.svg')`;
							el.style.backgroundSize = "cover";
							
							el.style.width = `10px`;
							el.style.height = `${size*5}px`;
							
							// Add a popup displayed on click for each marker
							const popup = new mapboxGl.Popup({ offset: 25 });
							popup.setHTML(
								`<h2>行政區: ${marker.properties.town}</h2>機構數量: ${marker.properties.nums}<br/>`
							);
							
							// Add markers to the map.
							let mk = new mapboxGl.Marker({
								element: el,
								// Point markers toward the nearest horizon
								rotationAlignment: 'horizon',
								offset: [0, -size / 2]
							})
							.setLngLat(marker.geometry.coordinates)
							.setPopup(popup)
							.addTo(this.map);
							
							this.markerList.push(mk)


							num = num + 1;
							if (marker.properties.nums > max) {
								max = marker.properties.nums;
								max_cor = marker.geometry.coordinates;
							}
						});
						
						//map畫面變動動畫，移去最大數量的那個點
						this.map.flyTo({
							// center: max_cor,
							pitch: 50,
							speed: 0.9, // speed of flying
						})
					}
				})
				.catch((e) => console.error(e));
		},


		// 4-1. Using the mapbox source and map config, create a new layer
		// The styles and configs can be edited in /assets/configs/mapbox/mapConfig.js
		// 由addMapLayerSource()觸發，主要是將Layer透過this.map.addLayer()匯入，
		// 並於this.currentLayers[]、this.currentVisibleLayers[]加入layerId
		// 並於this.loadingLayers[]移除layerId
		// 並於this.mapConfigs[layerId]中加入map_config
		addMapLayer(map_config) {
			let extra_paint_configs = {};
			let extra_layout_configs = {};
			//如果map_config有icon參數 (Symbol類型需要)，則另外添加extra_paint_configs/extra_layout_configs設定
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
			//如果map_config有size參數 (Circle等類型需要)，則另外添加extra_paint_configs/extra_layout_configs設定
			if (map_config.size) {
				extra_paint_configs = {
					...extra_paint_configs, //延伸原本的內容
					...maplayerCommonPaint[
						`${map_config.type}-${map_config.size}`
					],
				};
					/* 
						EX: maplayerCommonPaint['circle-big']
						"circle-radius": [
							"interpolate",
							["linear"],
							["zoom"],
							11.99,
							3.5,
							12,
							3.5,
							13.5,
							4,
							15,
							5,
							22,
							7,
						],	
					*/

				extra_layout_configs = {
					...extra_layout_configs, //延伸原本的內容
					...maplayerCommonLayout[
						`${map_config.type}-${map_config.size}`
					],
				};
				/* EX: maplayerCommonLayout['circle-big']
					//回傳空
				*/
			}

			//??????不曉得為啥要加這個，this.loadingLayers不是用來儲存layerId嗎?
			this.loadingLayers.push("rendering");

			//將所有設定透過this.map.addLayer()導入map實例
			this.map.addLayer({
				id: map_config.layerId, //給予一個代表該Layer的ID
				type: map_config.type,  //載入的Feature類型 (circle、fill、symbol、line.....)
				paint: { //載入座標點的風格與規範設定
					...maplayerCommonPaint[`${map_config.type}`], //載入通用設定
					...extra_paint_configs, //載入上面特殊設定
					...map_config.paint, //載入map_config內自己的自訂設定
				},
				layout: {
					...maplayerCommonLayout[`${map_config.type}`],
					...extra_layout_configs,
				},
				source: `${map_config.layerId}-source`, //指定的source要記得與addMapLayerSource()匯入的名稱一樣
			});
			/* 值得注意的是，如果有載入extra設定，很大概率會與 通用設定重複，此時會自動包留extra的設定 (後載入者)
				EX: maplayerCommonPaint[`${map_config.type}`]:
					"circle-radius": [
						"interpolate",
						["linear"],
						["zoom"],
						12.00,
						2,
						...
					]
				EX: extra_paint_configs:
					"circle-radius": [
						"interpolate",
						["linear"],
						["zoom"],
						11.99,
						3.5,
						...
					]
				//只表留下面的
			*/


			//該加的加，該移除的移除
			this.currentLayers.push(map_config.layerId);
			this.mapConfigs[map_config.layerId] = map_config;
			this.currentVisibleLayers.push(map_config.layerId);
			this.loadingLayers = this.loadingLayers.filter(
				(el) => el !== map_config.layerId
			);
		},
		// 4-2. Add Map Layer for Arc Maps (比較特殊的，有空在看)
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
			console.log(lines)

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

		// 5. Turn on the visibility for a exisiting map layer
		// 由addToMapLayerList()在this.currentLayers[]內有mapLayerId時呼叫
		// 這裡是將指定LayerID顯示
		turnOnMapLayerVisibility(mapLayerId) {
			//我自己加的
			if (mapLayerId === "business_count_by_town_geo-circle") {
				this.map.setLayoutProperty('cluster-count', "visibility", "visible");
				this.map.setLayoutProperty('unclustered-point', "visibility", "visible");
			}
			
			//setLayoutProperty用於針對特定layer做風格(Style)設定，這裡是將指定LayerID顯示
			this.map.setLayoutProperty(mapLayerId, "visibility", "visible");

			
		},
		
		// 6. Turn off the visibility of an exisiting map layer but don't remove it completely
		// 在ComponentMapChart.vue，應用按鈕關起時呼叫
		// this.loadingLayers[]、this.currentVisibleLayers[]移除mapLayerId，清除Layer的Filter並影藏該層，移除彈跳視窗
		turnOffMapLayerVisibility(map_config) {
			map_config.forEach((element) => {
				// EX: work_soil_liquefaction-fill
				let mapLayerId = `${element.index}-${element.type}`;

				// 將this.loadingLayers[]內mapLayerId移除
				this.loadingLayers = this.loadingLayers.filter(
					(el) => el !== mapLayerId
				);

				// 如果能從Map實例獲取指定Layer，則清除Layer的Filter並影藏該層
				if (this.map.getLayer(mapLayerId)) {
					// //setFilter用於針對Layer中的Feature特別做過濾規則，設為null則是清除規則
					// this.map.setFilter(mapLayerId, null);
					// //setLayoutProperty用於針對特定layer做風格(Style)設定，這裡是將指定LayerID隱藏
					// this.map.setLayoutProperty(
					// 	mapLayerId,
					// 	"visibility",
					// 	"none"
					// );
					
					//我自己加的
					if (mapLayerId === "business_count_by_town_geo-circle") {
						//setLayoutProperty用於針對特定layer做風格(Style)設定，這裡是將指定LayerID隱藏
						this.map.setLayoutProperty(
							mapLayerId,
							"visibility",
							"none"
						);
						// this.map.setFilter('cluster-count', null);
						this.map.setLayoutProperty(
							'cluster-count',
							"visibility",
							"none"
						);

						// this.map.setFilter('unclustered-point', null);
						this.map.setLayoutProperty(
							'unclustered-point',
							"visibility",
							"none"
						);

					}else{
						//setFilter用於針對Layer中的Feature特別做過濾規則，設為null則是清除規則
						this.map.setFilter(mapLayerId, null);
						//setLayoutProperty用於針對特定layer做風格(Style)設定，這裡是將指定LayerID隱藏
						this.map.setLayoutProperty(
							mapLayerId,
							"visibility",
							"none"
						);
					}
				
				}

				// 從this.currentVisibleLayers[]移除mapLayerId
				this.currentVisibleLayers = this.currentVisibleLayers.filter(
					(element) => element !== mapLayerId
				);
			});
			//移除彈跳視窗
			this.removePopup();
		},


		/* Popup Related Functions */
		// Adds a popup when the user clicks on a item. The event will be passed in.
		// 處理使用者點擊的東西，並建立彈跳視窗，內建於initializeMapBox()的this.map.on()監聽事件
		addPopup(event) {
			// Gets the info that is contained in the coordinates that the user clicked on (only visible layers)
			// map.queryRenderedFeatures()會依據你給予的座標範圍抓取Layer上的資訊!! 
			const clickFeatureDatas = this.map.queryRenderedFeatures(
				event.point, //用於設定系統要捕捉的範圍，這裡是一個點，但官網是直接抓一個範圍!! (https://docs.mapbox.com/mapbox-gl-js/example/queryrenderedfeatures-around-point/)
				{
					//用於設置你要抓取資料的圖層Layer是哪一層，因為一個TileSet可以有很多層。
					//this.currentVisibleLayers是array，因此是複數個layers
					layers: this.currentVisibleLayers, 
				}
			);
			// Return if there is no info in the click
			// 如果無法獲取使用者點擊資料，直接返回
			if (!clickFeatureDatas || clickFeatureDatas.length === 0) {
				return;
			}

			//我自己加的
			console.log(event)
			console.log(clickFeatureDatas)
			const clusterId = clickFeatureDatas[0].layer.id;
			if (clusterId === "business_count_by_town_geo-circle") {
				const coordinates = event.lngLat;
				const point_count = clickFeatureDatas[0].properties.point_count;
				while (Math.abs(event.lngLat.lng - coordinates[0]) > 180) {
					coordinates[0] += event.lngLat.lng > coordinates[0] ? 360 : -360;
				}
					
				new mapboxGl.Popup()
					.setLngLat(coordinates)
					.setHTML(
						`<div>
							當前位置<br>
							鄰近的節點數量: ${point_count-1>0?point_count-1:1}
							<br>
						</div>`
					)
					.addTo(this.map);
					return ;
			}


			// Parse clickFeatureDatas to get the first 3 unique layer datas, skip over already included layers
			// 由於Map上面有數個layers，使用者點擊的位置可能會同時包含不同Layer的資料(MapBox專有名詞叫"Feature")，因此這邊設計是至多擷取三個Layer的
			// 每一層Layer資料不重複擷取，例如如果獲取的資料順序是 [A1,A2,B1,C1,D1]，則只會擷取[A1,B1,C1]
			const mapConfigs = [];
			const parsedPopupContent = [];
			let previousParsedLayer = "";

			for (let i = 0; i < clickFeatureDatas.length; i++) {
				//超過3筆就跳出
				if (mapConfigs.length === 3) break;
				//如果這筆與前一筆Layer相同則略過
				if (previousParsedLayer === clickFeatureDatas[i].layer.id)
					continue;
				//記錄圖層
				previousParsedLayer = clickFeatureDatas[i].layer.id;
				//從this.mapConfigs儲存該資料所屬圖層資訊
				mapConfigs.push(this.mapConfigs[clickFeatureDatas[i].layer.id]);
				//儲存現在的資料物件
				parsedPopupContent.push(clickFeatureDatas[i]);
			}

			// Create a new mapbox popup
			// 建立popup物件(彈跳視窗)並用this.popup儲存以便找到
			// 設定彈跳視窗<div>畫面框，與設定顯示的座標位置，和要綁定的地圖物件
			this.popup = new mapboxGl.Popup()
				.setLngLat(event.lngLat)
				.setHTML('<div id="vue-popup-content"></div>')
				.addTo(this.map);

			// Mount a vue component (MapPopup) to the id "vue-popup-content" and pass in data
			// 建立一個自訂義Vue Component，並以MapPopup Component為模板
			// 目的是為了要將此Vue元件 "掛載" 到 mapboxGl.Popup()所建立的"<div>"視窗內
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
		// (移除彈出視窗)，由turnOffMapLayerVisibility()呼叫
		removePopup() {
			//我自己加的，清除Maker
			if (this.markerList) {
				console.log(this.markerList)
				this.markerList.forEach((element) => {
					element.remove(); //移除Mark
					console.log(this.markerList)
				});
				this.markerList = []//清空
			}

			//如果有儲存東西，清除
			if (this.popup) {
				this.popup.remove(); //先清除裡面內容後在設為null
			}
			this.popup = null;
		},


		/* Functions that change the viewing experience of the map */
		// Add new saved location that users can quickly zoom to
		// 由MapContainer.vue觸發，讓使用者新增一個位置到this.savedLocations
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
		// 由MapContainer.vue觸發，依據給予的index移除this.savedLocations中儲存的位置
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


		/* Map Filtering (在各Chart.vue中會呼叫，例如DonutChart.vue)*/ 
		// Add a filter based on a property on a map layer
		// 切換圖層，通常用在該應用支援不同圖層
		// 當使用者在<ApexChart>圖表上點擊時，如果該應用map_filter=true，則會觸發
		// 以DonutChart.vue為例，觸發時，第四個參數並不會帶入
		addLayerFilter(layer_id, property, key, map_config) {
			/* EX: 
				mapStore.addLayerFilter(
					"work_soil_liquefaction-fill",
					"class",
					"高");
				
			*/

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
			// this.map.setFilter(layer_id, ["==", ["get", property], key]);

			//我自己加的
			console.log(layer_id,"== get",property,key)
			if (layer_id === "business_count_by_town_geo-circle") {
				this.map.setFilter(layer_id, ["all", ["has","point_count"], ["==", ["get", property], key]]);
			}else{
				this.map.setFilter(layer_id, ["==", ["get", property], key]);
			}
			
			
		},
		// Remove any filters on a map layer
		// 移除切換圖層的規則 (簡單來說就是this.map.setFilter(layer_id, null))
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
			// this.map.setFilter(layer_id, null);
			//我自己加的
			console.log(layer_id," set null")
			if (layer_id === "business_count_by_town_geo-circle") {
				this.map.setFilter(layer_id, null);
				this.map.setFilter(layer_id, ["has","point_count"]);
			}else{
				this.map.setFilter(layer_id, null);
			}
		},


		/* Clearing the map */
		// Called when the user is switching between maps (與下面clearEntireMap()差異在沒有清除this.map)
		clearOnlyLayers() {
			this.currentLayers.forEach((element) => {
				//我自己加的
				if (element === "business_count_by_town_geo-circle") {
					this.map.setFilter('cluster-count', null);
					this.map.setLayoutProperty(
						'cluster-count',
						"visibility",
						"none"
					);

					this.map.setFilter('unclustered-point', null);
					this.map.setLayoutProperty(
						'unclustered-point',
						"visibility",
						"none"
					);

					this.map.off('click', element);
					this.map.off('click', 'unclustered-point');
					
					
					this.map.off('mouseenter', element);
					this.map.off('mouseleave',element);
					this.map.removeLayer('cluster-count');
					this.map.removeLayer('unclustered-point');
				}


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
