<!-- Developed by Taipei Urban Intelligence Center 2023 -->

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useMapStore } from '../../store/mapStore';

const props = defineProps(['chart_config', 'activeChart', 'series', 'map_config']);
const mapStore = useMapStore();

const limitNum = ref(19); //限制12個字

const getMaxValue = computed(()=>{
    const Org = [...props.series[0].data]; //先複製一份資料 (避免Call By Reference的缺陷)
    //獲取最大值
    let objMax = Org.reduce((max, curren) => max.y > curren.y ? max : curren);
    return objMax.y
})

const getWords = computed(()=>{
    const Org = [...props.series[0].data]; //先複製一份資料 (避免Call By Reference的缺陷)

    // //排序
    // let sortable = [];
    // for (var key in Org) {
    //     sortable.push([key, Org[key]]);
    // }

    // sortable.sort(function(a, b) {
    //     return b[1].y - a[1].y ;
    // });
    // let toParse = {}
    // // console.log(sortable)
    // sortable.forEach(function(item,index){
    //     toParse[index]=item[1]
    // })
   
    
    // //檢查長度
	// if (toParse.length <= limitNum.value) {
	// 	return toParse
	// }
	// let output = [];
	// for (let i = 0; i < limitNum.value; i++) {
	// 	output.push(toParse[i]);
	// }
    //檢查長度
	if (Org.length <= limitNum.value) {
		return Org
	}
	let output = [];
	for (let i = 0; i < limitNum.value; i++) {
		output.push(Org[i]);
	}
	return output;
});


const stylelist = [
	// { x: 350.8022, y: 207.5303, class: "st17 st2", color : "#ffffff" },
	// { x: 497.4292, y: 293.7129, class: "st17 st0", color : "#f0f0f5" },
	// { x: 433.0854, y: 82.7407, class: "st17 st8", color : "#e0e0eb" },
	// { x: 188.187, y: 144.3555, class: "st5 st17 st22", color : "#d1d1e0" },
	// { x: 380.8301, y: 145.1353, class: "st17 st29", color : "#c2c2d6" },
	// { x: 444.0044, y: 34.7744, class: "st5 st17 st4", color : "#b3b3cc" },
	{ x: 251.3608, y: 240.4502, class: "st5 st17 st31", color : "#a3a3c2" },
	{ x: 444.0044, y: 34.7744, class: "st5 st17 st4", color : "#9494b8" },
	{ x: 627.8999, y: 191.9316, class: "st17 st20", color : "#8585ad" },
	{ x: 633.5552, y: 139.2856, class: "st5 st17 st3", color : "#7575a3" },
	{ x: 191.3057, y: 102.2393, class: "st5 st17 st24", color : "#666699" },
	{ x: 318.4351, y: 289.0342, class: "st5 st17 st1", color : "#5c5c8a" },
	{ x: 702.7485, y: 97.0288, class: "st5 st28 st16", color : "#47476b" },
	{ x: 735.7007, y: 163.4639, class: "st5 st28 st1", color : "#47476b" },
	{ x: 378.8799, y: 54.6626, class: "st5 st28 st6", color : "#47476b" },
	{ x: 698.2075, y: 66.7529, class: "st5 st28 st12", color : "#47476b" },
	{ x: 545.0063, y: 316.7061, class: "st5 st28 st23", color : "#47476b" },
	{ x: 250.9712, y: 76.1118, class: "st5 st28 st14", color : "#47476b" },
	{ x: 247.0718, y: 191.1514, class: "st5 st28 st18", color : "#47476b" },
	{ x: 229.9131, y: 169.5225, class: "st5 st28 st25", color : "#47476b" },
	{ x: 272.4722, y: 135.3691, class: "st5 st28 st27", color : "#47476b" },
	{ x: 261.3608, y: 264.4697, class: "st5 st28 st26", color : "#47476b" },
	{ x: 740.77, y: 211.4307, class: "st5 st28 st21", color : "#47476b" },
	{ x: 683.0542, y: 230.5381, class: "st5 st28 st19", color : "#47476b" },
	{ x: 217.0439, y: 54.2744, class: "st5 st28 st11", color : "#47476b" },
];

function tranParams(item,index){
	//反轉
	index = limitNum.value - index -1
    // const maxValue = getMaxValue.value
    const windowH = 550 
    const windowW = 413 
    // const midx = windowW /2 
    // const midy = windowH /2
    // const x = midx+((Math.random() - 0.5) * 2)*(120 - 120 * (item.y/maxValue))
    // const y = midy+((Math.random() - 0.5) * 2)*(120 - 120 * (item.y/maxValue))
    // return `matrix(1 0 0 1 ${x} ${y})`
	let temp_x = stylelist[index].x
	// if (temp_x > 500){
	// 	temp_x = temp_x -150
	// }
	const new_x = temp_x / 1100 * windowW - 60
	const new_y = stylelist[index].y / 600 * windowH + 20
	console.log(item,index,stylelist[index].x,stylelist[index].y,stylelist[index].class)
	return `matrix(1 0 0 1 ${new_x} ${new_y})`
}

function getStyle(item,index){
	//反轉
	index = limitNum.value - index -1
    // const s = Math.floor(Math.random() * item.y) + 12
    const s = 15
    const c = {
        // 'font-size': s+'px',
        // 'fill': '#808080',
        // 'fill': randomColor(),
        'fill': stylelist[index].color,
        'font-family': 'Open Sans',
        // 'color': randomColor()
    }
    return c
}

function randomColor() {
    // return '#' + ('80800' + (Math.random() * 16777216 << 0).toString(16)).substr(-6);
	console.log('#' + ('80800' + (Math.random() * 16777216 << 0).toString(16)).substr(-4)+'00')
    return '#' + ('80800' + (Math.random() * 16777216 << 0).toString(16)).substr(-4)+'00';
}

function getAnime(index){
	//反轉
	index = limitNum.value - index -1
    const name =  "initial-animation-"+index
    let obj = {};
    obj[name] = true
	obj[stylelist[index].class] = true
    return obj
}

</script>

<template>
	<div v-if="activeChart === 'WordsCloudChart'" class="wordscloudchart">
        <div class="wordscloudchart-chart">
            <svg id="wordchart" viewBox="0 0 413 550" xmlns="http://www.w3.org/2000/svg">
                <g>
                    <text v-for="item, index in getWords.slice().reverse()" 
                    :transform="tranParams(item, index)" 
                    :style="getStyle(item,index)" 
                    :key="`${item.x}-${item.y}`" 
                    :class="getAnime(index)">
                        {{item.x}}
                    </text> 
                </g>
            </svg>
        </div>
	</div>
</template>


<style scoped lang="scss">
.wordscloudchart {
	max-height: 100%;
 
	position: relative;
	overflow-y: scroll;

    &-title {
		display: flex;
		flex-direction: column;
		justify-content: center;
		position: absolute;
		left: 0;
		top: 0;
		margin: 0.5rem 0 -0.5rem;

		h5 {
			color: var(--color-complement-text);
		}

		h6 {
			color: var(--color-complement-text);
			font-size: var(--font-m);
			font-weight: 400;
		}

		&-legend {
			display: flex;
			justify-content: space-between;

			div {
				position: relative;
				width: 3rem;
				margin: 0 4px;
				border-radius: 5px;
			}

			div:before {
				content: "";
				width: 3rem;
				height: var(--font-l);
				position: absolute;
				top: 0;
				left: 0;
				background: linear-gradient(270deg, rgba(40, 42, 44, 1), rgba(40, 42, 44, 0.2));
			}

			p {
				color: var(--color-complement-text)
			}
		}
	}

    &-chart {
		display: flex;
		justify-content: center;


		svg {
            width: 80%;
            text.blink {
                animation: blink 2s ease-out;
            }
        }
	}
}
.active-district {
	transform: translateY(-5px);
}

@keyframes ease-in {
	0% {
		opacity: 0
	}

	;

	100% {
		opacity: 1
	}
}

@for $i from 1 through 20 {
	.initial-animation-#{$i} {
		animation-name: ease-in;
		animation-duration: 1s;
		animation-delay: 0.05s * ($i - 1);
		animation-timing-function: linear;
		animation-fill-mode: forwards;
	}
}

.st0 {
  font-size: 58px;
  z-index: 8;
}

.st1 {
  font-size: 17px;
  z-index: 2;
}

.st2 {
  font-size: 72px;
  z-index: 9;
}

.st3 {
  font-size: 31px;
  z-index: 4;
}

.st4 {
  font-size: 31px;
  z-index: 4;
}

.st5 {
  fill: #808080;
}

.st6 {
  font-size: 16px;
  z-index: 2;
}

.st7 {
  font-size: 16px;
  z-index: 2;
}

.st8 {
  font-size: 52px;
  z-index: 7;
}

.st9 {
  font-size: 76px;
  z-index: 10;
}

.st10 {
  font-size: 10px;
  z-index: 1;
}

.st11 {
  font-size: 10px;
  z-index: 1;
}

.st12 {
  font-size: 17px;
  z-index: 2;
}

.st13 {
  font-size: 17px;
  z-index: 2;
}

.st14 {
  font-size: 17px;
  z-index: 2;
}

.st15 {
  font-size: 22px;
  z-index: 3;
}

.st16 {
  font-size: 22px;
  z-index: 3;
}

.st17 {
  font-family: 'Open Sans';
  font-weight: 600;
  fill: #a0a0a0;
}

.st18 {
  font-size: 14px;
  z-index: 1;
}

.st19 {
  font-size: 14px;
  z-index: 1;
}

.st20 {
  font-size: 26px;
  z-index: 3;
}

.st21 {
  font-size: 11px;
  z-index: 1;
}

.st22 {
  font-size: 41px;
  z-index: 5;
}

.st23 {
  font-size: 18px;
  z-index: 2;
}

.st24 {
  font-size: 23px;
  z-index: 3;
}

.st25 {
  font-size: 12px;
  z-index: 1;
}

.st26 {
  font-size: 15px;
  z-index: 1;
}

.st27 {
  font-size: 15px;
  z-index: 1;
}

.st28 {
  font-family: 'Open Sans';
}

.st29 {
  font-size: 44px;
  z-index: 6;
}

.st30 {
  font-size: 12px;
  z-index: 1;
}

.st31 {
  font-size: 27px;
  z-index: 3;
}
</style>